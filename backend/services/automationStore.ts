import fs from 'fs';
import os from 'os';
import path from 'path';
import { getBookmakerInfo, normalizeBookmakerId } from '../config/bookmakers.ts';
import type {
  AutomationJobLog,
  BookmakerFeedState,
  BookmakerId,
  DailyFactoryConfig,
  GeneratedTicket,
  GenerationCycle,
  MatchResultRecord,
  ResultVerificationFailure,
} from '../../src/types/sportybet.ts';
import {
  DEFAULT_ALLOWED_DAILY_FEED_MARKETS,
  isTicketAllowedInDailyFeed,
  sanitizeDailyFactoryMarkets,
} from '../../src/utils/dailyFeedFilter.ts';
import { DEFAULT_ODDS_CATEGORIES, normalizeTeamKey } from './dailyFactoryEngine.ts';
import {
  computeTicketMatchProgress,
  evaluateBookmakerCycleLock,
  isSelectionTerminalStatus,
  isTicketTerminalStatus,
} from './settlementService.ts';

interface PersistedState {
  schemaVersion: number;
  tickets: GeneratedTicket[];
  feedCycles: GenerationCycle[];
  feedStates: Record<BookmakerId, BookmakerFeedState>;
  matchResults: MatchResultRecord[];
  verificationFailures: ResultVerificationFailure[];
  usedIdempotencyKeys: string[];
  factoryConfig: DailyFactoryConfig;
  logs: AutomationJobLog[];
  lastFactoryRunAt: string | null;
  lastResultsRunAt: string | null;
  lastScanningAt: string | null;
  dailyShortfallReason: string | null;
}

export const DEFAULT_DAILY_FACTORY_CONFIG: DailyFactoryConfig = {
  enabled: true,
  paused: false,
  activeBookmaker: 'SPORTYBET_TZ',
  minIndividualOdds: 1.01,
  maxIndividualOdds: 1.25,
  dailyTicketTarget: 55,
  liveFootballTarget: 12,
  otherSportsTarget: 12,
  autoReplenishOnSettle: false,
  maxTickets: 120,
  minSelections: 2,
  maxSelections: 15,
  sportIds: ['sr:sport:1'],
  markets: [...DEFAULT_ALLOWED_DAILY_FEED_MARKETS],
  anyMarket: false,
  leagues: [],
  datePreset: 'TODAY',
  customStartDate: '',
  customEndDate: '',
  windowStartTime: '00:00',
  windowEndTime: '23:59',
  timezone: 'Africa/Dar_es_Salaam',
  oddsCategories: DEFAULT_ODDS_CATEGORIES,
  duplicatePrevention: true,
  autoCreateBookingCodes: true,
  scheduleIntervalMinutes: 60,
};

function createDefaultBookmakerFeedState(bookmakerId: BookmakerId): BookmakerFeedState {
  const info = getBookmakerInfo(bookmakerId);
  return {
    bookmakerId,
    bookmakerName: info.name,
    activeCycleId: null,
    generationLocked: false,
    lockStatus: 'UNLOCKED',
    lockReason: `No active ${info.shortName} cycle yet — unlocked for permanent daily feed generation.`,
    totalTicketsInCycle: 0,
    settledTicketsInCycle: 0,
    unsettledTicketsCount: 0,
    totalMatchesInCycle: 0,
    finishedMatchesCount: 0,
    unfinishedMatchesCount: 0,
    unverifiedMatchesCount: 0,
    verificationFailuresCount: 0,
    lastGenerationAt: null,
    lastResultCheckAt: null,
    lastUnlockedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'sportybet-odds-hunter')
  : path.resolve(process.cwd(), '.data');
const STATE_FILE = path.join(DATA_DIR, 'automation-state.json');

function normalizeStoredTicket(t: GeneratedTicket): GeneratedTicket {
  const bkId = normalizeBookmakerId(t.bookmakerId);
  const progress = computeTicketMatchProgress({
    selections: Array.isArray(t.selections) ? t.selections : [],
    selectionSettlements: Array.isArray(t.selectionSettlements) ? t.selectionSettlements : [],
  });
  return {
    ...t,
    bookmakerId: bkId,
    bookmakerName: t.bookmakerName || getBookmakerInfo(bkId).name,
    feedSection: t.feedSection || 'UPCOMING',
    sportId: t.sportId || t.selections?.[0]?.sportId || 'sr:sport:1',
    sportName: t.sportName || t.selections?.[0]?.sportName || 'Football',
    replacedTicketId: t.replacedTicketId ?? null,
    settledMatchCount: t.settledMatchCount ?? progress.settledMatchCount,
    totalMatchCount: t.totalMatchCount ?? progress.totalMatchCount,
    unfinishedMatchCount: t.unfinishedMatchCount ?? progress.unfinishedMatchCount,
  };
}

function buildLegacyCyclesFromTickets(tickets: GeneratedTicket[]): GenerationCycle[] {
  const byCycleKey = new Map<string, GeneratedTicket[]>();
  for (const t of tickets) {
    const bkId = normalizeBookmakerId(t.bookmakerId);
    const prefix = bkId === 'BETPAWA_TZ' ? 'BP' : 'SB';
    const cId =
      t.cycleId || `CYC_${prefix}_${(t.generatedDateKey || 'LEGACY').replace(/-/g, '')}`;
    t.cycleId = cId;
    t.idempotencyKey = t.idempotencyKey || `${bkId}::${cId}`;
    const arr = byCycleKey.get(cId) || [];
    arr.push(t);
    byCycleKey.set(cId, arr);
  }

  const cycles: GenerationCycle[] = [];
  for (const [cycleId, group] of byCycleKey.entries()) {
    const bkId = normalizeBookmakerId(group[0]?.bookmakerId);
    const lockEval = evaluateBookmakerCycleLock({
      bookmakerId: bkId,
      activeCycle: null,
      cycleTickets: group,
      verificationFailures: [],
    });
    const allSettled = !lockEval.generationLocked && group.length > 0;
    cycles.push({
      cycleId,
      idempotencyKey: group[0]?.idempotencyKey || `${bkId}::${cycleId}`,
      bookmakerId: bkId,
      dateKey: group[0]?.generatedDateKey || new Date().toISOString().slice(0, 10),
      status: allSettled ? 'SETTLED' : 'ACTIVE',
      generationLocked: !allSettled,
      ticketIds: group.map((t) => t.internalTicketId),
      ticketCount: group.length,
      totalMatches: lockEval.totalMatchesInCycle,
      finishedMatches: lockEval.finishedMatchesCount,
      unfinishedMatches: lockEval.unfinishedMatchesCount,
      wonTickets: group.filter((t) => t.status === 'WON').length,
      lostTickets: group.filter((t) => t.status === 'LOST').length,
      voidTickets: group.filter((t) => t.status === 'VOID').length,
      createdAt: group[group.length - 1]?.generatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settledAt: allSettled ? new Date().toISOString() : null,
    });
  }

  return cycles.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

class AutomationStore {
  private state: PersistedState;

  constructor() {
    this.state = this.loadFromDisk();
    this.recomputeAllBookmakerStates();
  }

  private createInitialState(): PersistedState {
    return {
      schemaVersion: 3,
      tickets: [],
      feedCycles: [],
      feedStates: {
        SPORTYBET_TZ: createDefaultBookmakerFeedState('SPORTYBET_TZ'),
        BETPAWA_TZ: createDefaultBookmakerFeedState('BETPAWA_TZ'),
      },
      matchResults: [],
      verificationFailures: [],
      usedIdempotencyKeys: [],
      factoryConfig: { ...DEFAULT_DAILY_FACTORY_CONFIG },
      logs: [],
      lastFactoryRunAt: null,
      lastResultsRunAt: null,
      lastScanningAt: null,
      dailyShortfallReason: null,
    };
  }

  private loadFromDisk(): PersistedState {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (parsed.schemaVersion === 2 || parsed.schemaVersion === 3) {
          const mergedCfg: DailyFactoryConfig = {
            ...DEFAULT_DAILY_FACTORY_CONFIG,
            ...(parsed.factoryConfig || {}),
            liveFootballTarget: Math.max(10, parsed.factoryConfig?.liveFootballTarget ?? 12),
            otherSportsTarget: Math.max(10, parsed.factoryConfig?.otherSportsTarget ?? 12),
            autoReplenishOnSettle: parsed.factoryConfig?.autoReplenishOnSettle ?? false,
          };
          if (!Array.isArray(mergedCfg.oddsCategories) || mergedCfg.oddsCategories.length === 0) {
            mergedCfg.oddsCategories = DEFAULT_ODDS_CATEGORIES;
          }
          const sanitizedMarkets = sanitizeDailyFactoryMarkets(mergedCfg.markets || []);
          mergedCfg.markets =
            sanitizedMarkets.length > 0 ? sanitizedMarkets : [...DEFAULT_ALLOWED_DAILY_FEED_MARKETS];

          const rawTickets: GeneratedTicket[] = Array.isArray(parsed.tickets)
            ? parsed.tickets.map(normalizeStoredTicket)
            : [];
          const tickets = rawTickets.filter((t) => isTicketAllowedInDailyFeed(t));

          const migratedCycles =
            Array.isArray(parsed.feedCycles) && parsed.feedCycles.length > 0
              ? parsed.feedCycles
              : buildLegacyCyclesFromTickets(tickets);

          const base = this.createInitialState();
          const sanitizedState: PersistedState = {
            ...base,
            schemaVersion: 3,
            tickets,
            feedCycles: migratedCycles,
            feedStates: {
              SPORTYBET_TZ: {
                ...createDefaultBookmakerFeedState('SPORTYBET_TZ'),
                ...(parsed.feedStates?.SPORTYBET_TZ || {}),
              },
              BETPAWA_TZ: {
                ...createDefaultBookmakerFeedState('BETPAWA_TZ'),
                ...(parsed.feedStates?.BETPAWA_TZ || {}),
              },
            },
            matchResults: Array.isArray(parsed.matchResults) ? parsed.matchResults : [],
            verificationFailures: Array.isArray(parsed.verificationFailures)
              ? parsed.verificationFailures
              : [],
            usedIdempotencyKeys: Array.isArray(parsed.usedIdempotencyKeys)
              ? parsed.usedIdempotencyKeys
              : migratedCycles.map((c) => c.idempotencyKey),
            factoryConfig: mergedCfg,
            logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 200) : [],
            lastFactoryRunAt: parsed.lastFactoryRunAt ?? null,
            lastResultsRunAt: parsed.lastResultsRunAt ?? null,
            lastScanningAt: parsed.lastScanningAt ?? parsed.lastFactoryRunAt ?? null,
            dailyShortfallReason: parsed.dailyShortfallReason ?? null,
          };
          return sanitizedState;
        }
      }
    } catch {
      // Fallback cleanly to default initial state if disk read fails
    }

    return this.createInitialState();
  }

  private flushToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist automation state:', err);
    }
  }

  resetForTesting(): void {
    this.state = this.createInitialState();
    this.flushToDisk();
  }

  getTickets(bookmakerId?: BookmakerId): GeneratedTicket[] {
    const allowed = this.state.tickets.filter((t) => isTicketAllowedInDailyFeed(t));
    if (!bookmakerId) return allowed;
    return allowed.filter((t) => normalizeBookmakerId(t.bookmakerId) === bookmakerId);
  }

  getTicketById(internalTicketId: string): GeneratedTicket | undefined {
    const ticket = this.state.tickets.find((t) => t.internalTicketId === internalTicketId);
    if (!ticket || !isTicketAllowedInDailyFeed(ticket)) return undefined;
    return ticket;
  }

  getExistingSignatures(bookmakerId?: BookmakerId): Set<string> {
    return new Set(this.getTickets(bookmakerId).map((t) => t.signature));
  }

  getExistingShareCodes(excludeTicketId?: string, bookmakerId?: BookmakerId): Set<string> {
    const codes = new Set<string>();
    for (const t of this.getTickets(bookmakerId)) {
      if (excludeTicketId && t.internalTicketId === excludeTicketId) continue;
      const code = String(t.shareCode || '').trim().toUpperCase();
      if (code) codes.add(code);
    }
    return codes;
  }

  getExistingEventAndTeamUsage(
    dateKey?: string,
    feedSection?: GeneratedTicket['feedSection'],
    bookmakerId?: BookmakerId,
    cycleId?: string
  ): {
    eventIds: Set<string>;
    teamKeys: Set<string>;
  } {
    const eventIds = new Set<string>();
    const teamKeys = new Set<string>();
    for (const t of this.getTickets(bookmakerId)) {
      if (cycleId && t.cycleId !== cycleId) continue;
      if (dateKey && t.generatedDateKey !== dateKey) continue;
      if (feedSection && (t.feedSection || 'UPCOMING') !== feedSection) continue;
      for (const s of t.selections || []) {
        if (s.eventId) eventIds.add(s.eventId);
        if (s.homeTeam) teamKeys.add(normalizeTeamKey(s.homeTeam));
        if (s.awayTeam) teamKeys.add(normalizeTeamKey(s.awayTeam));
      }
    }
    return { eventIds, teamKeys };
  }

  hasIdempotencyKey(key: string): boolean {
    return this.state.usedIdempotencyKeys.includes(key);
  }

  getFeedCycles(bookmakerId?: BookmakerId): GenerationCycle[] {
    if (!bookmakerId) return [...this.state.feedCycles];
    return this.state.feedCycles.filter((c) => c.bookmakerId === bookmakerId);
  }

  getActiveCycle(bookmakerId: BookmakerId): GenerationCycle | null {
    const active = this.state.feedCycles.find(
      (c) => c.bookmakerId === bookmakerId && c.status === 'ACTIVE'
    );
    if (active) return active;
    // Fallback to most recent cycle if its tickets are still unsettled
    const latest = this.state.feedCycles.find((c) => c.bookmakerId === bookmakerId);
    return latest && latest.generationLocked ? latest : null;
  }

  getCycleTickets(bookmakerId: BookmakerId, cycleId?: string | null): GeneratedTicket[] {
    const bkTickets = this.getTickets(bookmakerId);
    if (cycleId) {
      return bkTickets.filter((t) => t.cycleId === cycleId);
    }
    const active = this.getActiveCycle(bookmakerId);
    if (active) {
      return bkTickets.filter((t) => t.cycleId === active.cycleId);
    }
    // Legacy tickets without cycleId that are still non-terminal
    return bkTickets.filter((t) => !isTicketTerminalStatus(t.status));
  }

  getFeedStates(): Record<BookmakerId, BookmakerFeedState> {
    return {
      SPORTYBET_TZ: { ...this.state.feedStates.SPORTYBET_TZ },
      BETPAWA_TZ: { ...this.state.feedStates.BETPAWA_TZ },
    };
  }

  getFeedState(bookmakerId: BookmakerId): BookmakerFeedState {
    return { ...this.state.feedStates[bookmakerId] };
  }

  getVerificationFailures(bookmakerId?: BookmakerId): ResultVerificationFailure[] {
    if (!bookmakerId) return [...this.state.verificationFailures];
    return this.state.verificationFailures.filter((f) => f.bookmakerId === bookmakerId);
  }

  recordVerificationFailure(params: {
    bookmakerId: BookmakerId;
    eventId: string;
    ticketIds: string[];
    homeTeam: string;
    awayTeam: string;
    error: string;
  }): void {
    const failureId = `${params.bookmakerId}::${params.eventId}`;
    const existingIdx = this.state.verificationFailures.findIndex(
      (f) => f.failureId === failureId
    );
    const nowIso = new Date().toISOString();
    if (existingIdx >= 0) {
      const prev = this.state.verificationFailures[existingIdx];
      this.state.verificationFailures[existingIdx] = {
        ...prev,
        ticketIds: Array.from(new Set([...prev.ticketIds, ...params.ticketIds])),
        error: params.error,
        attempts: prev.attempts + 1,
        lastAttemptAt: nowIso,
      };
    } else {
      this.state.verificationFailures.unshift({
        failureId,
        bookmakerId: params.bookmakerId,
        eventId: params.eventId,
        ticketIds: Array.from(new Set(params.ticketIds)),
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam,
        error: params.error,
        attempts: 1,
        lastAttemptAt: nowIso,
      });
      this.state.verificationFailures = this.state.verificationFailures.slice(0, 200);
    }
    this.flushToDisk();
  }

  clearVerificationFailure(bookmakerId: BookmakerId, eventId: string): void {
    const failureId = `${bookmakerId}::${eventId}`;
    const before = this.state.verificationFailures.length;
    this.state.verificationFailures = this.state.verificationFailures.filter(
      (f) => f.failureId !== failureId
    );
    if (this.state.verificationFailures.length !== before) {
      this.flushToDisk();
    }
  }

  getMatchResults(bookmakerId?: BookmakerId): MatchResultRecord[] {
    if (!bookmakerId) return [...this.state.matchResults];
    return this.state.matchResults.filter((m) => m.bookmakerId === bookmakerId);
  }

  upsertMatchResults(records: MatchResultRecord[]): void {
    if (records.length === 0) return;
    const byId = new Map(this.state.matchResults.map((r) => [r.resultId, r]));
    for (const r of records) {
      const existing = byId.get(r.resultId);
      // Never overwrite a verified terminal result unless previously unverified
      if (existing && existing.verified && isSelectionTerminalStatus(existing.status)) {
        continue;
      }
      byId.set(r.resultId, r);
    }
    this.state.matchResults = Array.from(byId.values())
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 1000);
    this.flushToDisk();
  }

  recomputeBookmakerState(bookmakerId: BookmakerId): BookmakerFeedState {
    const nowIso = new Date().toISOString();
    const activeCycle = this.getActiveCycle(bookmakerId);
    const cycleTickets = activeCycle
      ? this.getTickets(bookmakerId).filter((t) => t.cycleId === activeCycle.cycleId)
      : [];

    const lockEval = evaluateBookmakerCycleLock({
      bookmakerId,
      activeCycle,
      cycleTickets,
      verificationFailures: this.getVerificationFailures(bookmakerId),
    });

    if (activeCycle) {
      const idx = this.state.feedCycles.findIndex((c) => c.cycleId === activeCycle.cycleId);
      if (idx >= 0) {
        const prevCycle = this.state.feedCycles[idx];
        const nextStatus = lockEval.generationLocked ? 'ACTIVE' : 'SETTLED';
        this.state.feedCycles[idx] = {
          ...prevCycle,
          status: nextStatus,
          generationLocked: lockEval.generationLocked,
          totalMatches: lockEval.totalMatchesInCycle,
          finishedMatches: lockEval.finishedMatchesCount,
          unfinishedMatches: lockEval.unfinishedMatchesCount,
          wonTickets: cycleTickets.filter((t) => t.status === 'WON').length,
          lostTickets: cycleTickets.filter((t) => t.status === 'LOST').length,
          voidTickets: cycleTickets.filter((t) => t.status === 'VOID').length,
          settledAt:
            nextStatus === 'SETTLED' ? prevCycle.settledAt || nowIso : prevCycle.settledAt,
          updatedAt: nowIso,
        };
      }
    }

    const prevFeedState =
      this.state.feedStates[bookmakerId] || createDefaultBookmakerFeedState(bookmakerId);
    const justUnlocked = prevFeedState.generationLocked && !lockEval.generationLocked;

    const nextFeedState: BookmakerFeedState = {
      bookmakerId,
      bookmakerName: getBookmakerInfo(bookmakerId).name,
      activeCycleId: activeCycle ? activeCycle.cycleId : prevFeedState.activeCycleId,
      generationLocked: lockEval.generationLocked,
      lockStatus: lockEval.lockStatus,
      lockReason: lockEval.lockReason,
      totalTicketsInCycle: lockEval.totalTicketsInCycle,
      settledTicketsInCycle: lockEval.settledTicketsInCycle,
      unsettledTicketsCount: lockEval.unsettledTicketsCount,
      totalMatchesInCycle: lockEval.totalMatchesInCycle,
      finishedMatchesCount: lockEval.finishedMatchesCount,
      unfinishedMatchesCount: lockEval.unfinishedMatchesCount,
      unverifiedMatchesCount: lockEval.unverifiedMatchesCount,
      verificationFailuresCount: lockEval.verificationFailuresCount,
      lastGenerationAt: prevFeedState.lastGenerationAt,
      lastResultCheckAt: prevFeedState.lastResultCheckAt,
      lastUnlockedAt: justUnlocked ? nowIso : prevFeedState.lastUnlockedAt,
      updatedAt: nowIso,
    };

    this.state.feedStates[bookmakerId] = nextFeedState;
    return nextFeedState;
  }

  recomputeAllBookmakerStates(): Record<BookmakerId, BookmakerFeedState> {
    this.recomputeBookmakerState('SPORTYBET_TZ');
    this.recomputeBookmakerState('BETPAWA_TZ');
    this.flushToDisk();
    return this.getFeedStates();
  }

  registerCycleAndTickets(params: {
    cycle: GenerationCycle;
    newTickets: GeneratedTicket[];
    generationTimestamp: string;
  }): { inserted: GeneratedTicket[]; cycle: GenerationCycle; skippedReason?: string } {
    const { cycle, newTickets, generationTimestamp } = params;
    if (this.hasIdempotencyKey(cycle.idempotencyKey)) {
      return {
        inserted: [],
        cycle,
        skippedReason: `Duplicate generation blocked by idempotencyKey ${cycle.idempotencyKey}.`,
      };
    }

    const currentLock = this.getFeedState(cycle.bookmakerId);
    if (currentLock.generationLocked) {
      return {
        inserted: [],
        cycle,
        skippedReason: currentLock.lockReason,
      };
    }

    const existingIds = new Set(this.state.tickets.map((t) => t.internalTicketId));
    const existingSigs = new Set(
      this.getTickets(cycle.bookmakerId).map((t) => t.signature)
    );
    const existingCodes = this.getExistingShareCodes(undefined, cycle.bookmakerId);
    const inserted: GeneratedTicket[] = [];

    for (const rawTicket of newTickets) {
      const t = normalizeStoredTicket({
        ...rawTicket,
        bookmakerId: cycle.bookmakerId,
        cycleId: cycle.cycleId,
        idempotencyKey: cycle.idempotencyKey,
      });
      if (!isTicketAllowedInDailyFeed(t)) continue;
      if (existingIds.has(t.internalTicketId) || existingSigs.has(t.signature)) continue;
      existingIds.add(t.internalTicketId);
      existingSigs.add(t.signature);

      const cleanCode = String(t.shareCode || '').trim().toUpperCase();
      if (cleanCode && existingCodes.has(cleanCode)) {
        inserted.push({
          ...t,
          shareCode: null,
          shareUrl: null,
          shareCodeDeadline: null,
          shareCodeVerified: false,
          bookingCodeStatus: 'FAILED',
          bookingCodeError: `Duplicate booking code ${cleanCode} rejected to preserve unique card codes.`,
        });
      } else {
        if (cleanCode) existingCodes.add(cleanCode);
        inserted.push(t);
      }
    }

    if (inserted.length === 0) {
      return {
        inserted: [],
        cycle,
        skippedReason: 'No valid unique tickets produced for this cycle.',
      };
    }

    const savedCycle: GenerationCycle = {
      ...cycle,
      ticketIds: inserted.map((t) => t.internalTicketId),
      ticketCount: inserted.length,
      status: 'ACTIVE',
      generationLocked: true,
    };

    this.state.usedIdempotencyKeys = [
      cycle.idempotencyKey,
      ...this.state.usedIdempotencyKeys,
    ].slice(0, 500);
    this.state.feedCycles = [savedCycle, ...this.state.feedCycles].slice(0, 200);
    this.state.tickets = [...inserted, ...this.state.tickets].slice(0, 2000);
    this.state.feedStates[cycle.bookmakerId] = {
      ...this.state.feedStates[cycle.bookmakerId],
      activeCycleId: savedCycle.cycleId,
      lastGenerationAt: generationTimestamp,
    };

    this.recomputeBookmakerState(cycle.bookmakerId);
    this.flushToDisk();
    return { inserted, cycle: savedCycle };
  }

  addTickets(newTickets: GeneratedTicket[]): GeneratedTicket[] {
    const existingIds = new Set(this.state.tickets.map((t) => t.internalTicketId));
    const existingSigs = new Set(this.state.tickets.map((t) => t.signature));
    const existingCodes = this.getExistingShareCodes();
    const inserted: GeneratedTicket[] = [];
    for (const rawTicket of newTickets) {
      const t = normalizeStoredTicket(rawTicket);
      if (!isTicketAllowedInDailyFeed(t)) continue;
      if (existingIds.has(t.internalTicketId) || existingSigs.has(t.signature)) continue;
      existingIds.add(t.internalTicketId);
      existingSigs.add(t.signature);
      const cleanCode = String(t.shareCode || '').trim().toUpperCase();
      if (cleanCode && existingCodes.has(cleanCode)) {
        inserted.push({
          ...t,
          shareCode: null,
          shareUrl: null,
          shareCodeDeadline: null,
          shareCodeVerified: false,
          bookingCodeStatus: 'FAILED',
          bookingCodeError: `Duplicate booking code ${cleanCode} rejected to preserve unique card codes.`,
        });
      } else {
        if (cleanCode) existingCodes.add(cleanCode);
        inserted.push(t);
      }
    }
    if (inserted.length > 0) {
      this.state.tickets = [...inserted, ...this.state.tickets].slice(0, 2000);
      this.recomputeAllBookmakerStates();
      this.flushToDisk();
    }
    return inserted;
  }

  hydrateFromExternal(params: {
    tickets: GeneratedTicket[];
    cycles?: GenerationCycle[];
    feedStates?: Partial<Record<BookmakerId, BookmakerFeedState>>;
    matchResults?: MatchResultRecord[];
  }): number {
    const added = this.hydrateTickets(params.tickets);

    if (Array.isArray(params.cycles) && params.cycles.length > 0) {
      const byId = new Map(this.state.feedCycles.map((c) => [c.cycleId, c]));
      for (const c of params.cycles) {
        if (!byId.has(c.cycleId)) {
          byId.set(c.cycleId, c);
        }
        if (c.idempotencyKey && !this.hasIdempotencyKey(c.idempotencyKey)) {
          this.state.usedIdempotencyKeys.push(c.idempotencyKey);
        }
      }
      this.state.feedCycles = Array.from(byId.values())
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 200);
    }

    if (params.feedStates) {
      for (const bk of ['SPORTYBET_TZ', 'BETPAWA_TZ'] as BookmakerId[]) {
        if (params.feedStates[bk]) {
          this.state.feedStates[bk] = {
            ...this.state.feedStates[bk],
            ...params.feedStates[bk],
          };
        }
      }
    }

    if (Array.isArray(params.matchResults) && params.matchResults.length > 0) {
      this.upsertMatchResults(params.matchResults);
    }

    this.recomputeAllBookmakerStates();
    this.flushToDisk();
    return added;
  }

  /**
   * Hydrate backend memory from Firebase publicTickets (used after Vercel cold starts)
   * without ever mutating immutable ticket fields or overwriting terminal settled results.
   */
  hydrateTickets(incoming: GeneratedTicket[]): number {
    if (!Array.isArray(incoming) || incoming.length === 0) return 0;
    const byId = new Map<string, number>();
    const existingSigs = new Set<string>();
    this.state.tickets.forEach((t, idx) => {
      byId.set(t.internalTicketId, idx);
      existingSigs.add(t.signature);
    });

    let addedOrUpdated = 0;
    const toPrepend: GeneratedTicket[] = [];

    for (const raw of incoming) {
      const ticket = normalizeStoredTicket(raw);
      if (!isTicketAllowedInDailyFeed(ticket)) continue;
      const existingIdx = byId.get(ticket.internalTicketId);

      if (existingIdx === undefined) {
        if (existingSigs.has(ticket.signature)) continue;
        existingSigs.add(ticket.signature);
        toPrepend.push(ticket);
        addedOrUpdated++;
      } else {
        const current = this.state.tickets[existingIdx];
        if (!isTicketTerminalStatus(current.status) && isTicketTerminalStatus(ticket.status)) {
          this.state.tickets[existingIdx] = {
            ...current,
            status: ticket.status,
            effectiveCombinedOdds: ticket.effectiveCombinedOdds,
            selectionSettlements: ticket.selectionSettlements,
            settledMatchCount: ticket.settledMatchCount,
            totalMatchCount: ticket.totalMatchCount,
            unfinishedMatchCount: ticket.unfinishedMatchCount,
            settledAt: ticket.settledAt,
            lastCheckedAt: ticket.lastCheckedAt,
            shareCode: current.shareCode || ticket.shareCode,
            shareUrl: current.shareUrl || ticket.shareUrl,
            shareCodeVerified: current.shareCodeVerified || ticket.shareCodeVerified,
            bookingCodeStatus:
              current.shareCode ? current.bookingCodeStatus : ticket.bookingCodeStatus,
          };
          addedOrUpdated++;
        }
      }
    }

    if (toPrepend.length > 0 || addedOrUpdated > 0) {
      this.state.tickets = [...toPrepend, ...this.state.tickets]
        .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt))
        .slice(0, 2000);
      this.recomputeAllBookmakerStates();
      this.flushToDisk();
    }
    return addedOrUpdated;
  }

  updateTicketMutableFields(updated: GeneratedTicket): GeneratedTicket | null {
    const idx = this.state.tickets.findIndex(
      (t) => t.internalTicketId === updated.internalTicketId
    );
    if (idx === -1) return null;

    const original = this.state.tickets[idx];

    // WON / VOID tickets are permanently frozen and immutable
    if (original.status === 'WON' || original.status === 'VOID') {
      return original;
    }

    // LOST tickets never change ticket status, effectiveCombinedOdds, settledAt, or booking code,
    // ONLY allowing remaining non-terminal legs to settle so cycle lock completes cleanly.
    if (original.status === 'LOST') {
      const mergedLostProgress: GeneratedTicket = {
        ...original,
        selectionSettlements: updated.selectionSettlements,
        settledMatchCount: updated.settledMatchCount,
        totalMatchCount: updated.totalMatchCount,
        unfinishedMatchCount: updated.unfinishedMatchCount,
        lastCheckedAt: updated.lastCheckedAt,
      };
      this.state.tickets[idx] = mergedLostProgress;
      this.flushToDisk();
      return mergedLostProgress;
    }

    const merged: GeneratedTicket = {
      ...original,
      status: updated.status,
      effectiveCombinedOdds: updated.effectiveCombinedOdds,
      settledMatchCount: updated.settledMatchCount,
      totalMatchCount: updated.totalMatchCount,
      unfinishedMatchCount: updated.unfinishedMatchCount,
      selectionSettlements: updated.selectionSettlements,
      shareCode: updated.shareCode,
      shareUrl: updated.shareUrl,
      shareCodeDeadline: updated.shareCodeDeadline,
      shareCodeVerified: updated.shareCodeVerified,
      bookingCodeStatus: updated.bookingCodeStatus,
      bookingCodeError: updated.bookingCodeError,
      settledAt: updated.settledAt,
      lastCheckedAt: updated.lastCheckedAt,
    };

    this.state.tickets[idx] = merged;
    this.flushToDisk();
    return merged;
  }

  deleteTicket(internalTicketId: string): boolean {
    const before = this.state.tickets.length;
    this.state.tickets = this.state.tickets.filter(
      (t) => t.internalTicketId !== internalTicketId
    );
    if (this.state.tickets.length !== before) {
      this.recomputeAllBookmakerStates();
      this.flushToDisk();
      return true;
    }
    return false;
  }

  getFactoryConfig(): DailyFactoryConfig {
    return this.state.factoryConfig;
  }

  setFactoryConfig(config: DailyFactoryConfig): DailyFactoryConfig {
    const sanitizedMarkets = sanitizeDailyFactoryMarkets(config.markets || []);
    this.state.factoryConfig = {
      ...DEFAULT_DAILY_FACTORY_CONFIG,
      ...config,
      liveFootballTarget: Math.max(10, config.liveFootballTarget ?? 12),
      otherSportsTarget: Math.max(10, config.otherSportsTarget ?? 12),
      autoReplenishOnSettle: config.autoReplenishOnSettle ?? false,
      markets:
        sanitizedMarkets.length > 0 ? sanitizedMarkets : [...DEFAULT_ALLOWED_DAILY_FEED_MARKETS],
    };
    this.flushToDisk();
    return this.state.factoryConfig;
  }

  getLogs(): AutomationJobLog[] {
    return this.state.logs;
  }

  addLog(log: AutomationJobLog): void {
    this.state.logs = [log, ...this.state.logs].slice(0, 200);
    this.flushToDisk();
  }

  getTimestamps() {
    return {
      lastFactoryRunAt: this.state.lastFactoryRunAt,
      lastResultsRunAt: this.state.lastResultsRunAt,
      lastScanningAt: this.state.lastScanningAt,
      dailyShortfallReason: this.state.dailyShortfallReason,
    };
  }

  setScanningAt(scanAt: string): void {
    this.state.lastScanningAt = scanAt;
    this.flushToDisk();
  }

  setFactoryRunMeta(runAt: string, shortfallReason: string | null): void {
    this.state.lastFactoryRunAt = runAt;
    this.state.lastScanningAt = runAt;
    this.state.dailyShortfallReason = shortfallReason;
    this.flushToDisk();
  }

  setResultsRunAt(runAt: string, bookmakersChecked?: BookmakerId[]): void {
    this.state.lastResultsRunAt = runAt;
    if (bookmakersChecked) {
      for (const bk of bookmakersChecked) {
        this.state.feedStates[bk] = {
          ...this.state.feedStates[bk],
          lastResultCheckAt: runAt,
        };
      }
    }
    this.flushToDisk();
  }
}

export const automationStore = new AutomationStore();
