import crypto from 'crypto';
import { getBookmakerInfo, normalizeBookmakerId } from '../config/bookmakers.ts';
import { firebaseAdminBridge } from '../firebase/firestoreBridge.ts';
import { getBookmakerClient } from '../integrations/bookmakerRegistry.ts';
import type {
  AutomationJobLog,
  BookmakerId,
  DailyFactoryConfig,
  GeneratedTicket,
  GenerationCycle,
  MatchResultRecord,
  NormalizedMatch,
  SchedulerStatus,
} from '../../src/types/sportybet.ts';
import { automationStore } from './automationStore.ts';
import {
  fetchLiveFootballMatchesForFactory,
  fetchOtherSportsMatchesForFactory,
  fetchUpcomingMatchesForFactory,
  generateDailyPortfolioFromMatches,
  getDateKeyInTimezone,
  getTimeMinutesInTimezone,
  parseHhMmToMinutes,
  revalidateTicketSelectionsAgainstMatches,
} from './dailyFactoryEngine.ts';
import {
  computeTicketMatchProgress,
  evaluateBookmakerCycleLock,
  evaluateTicketSettlement,
  isSelectionTerminalStatus,
  isTicketTerminalStatus,
} from './settlementService.ts';

function sleep(ms: number) {
  if (process.env.NODE_ENV === 'test') return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ALL_BOOKMAKERS: BookmakerId[] = ['SPORTYBET_TZ', 'BETPAWA_TZ'];

class SchedulerService {
  private factoryTimer: NodeJS.Timeout | null = null;
  private resultsTimer: NodeJS.Timeout | null = null;
  private bootTimer: NodeJS.Timeout | null = null;
  private bookmakerLocks: Record<BookmakerId, boolean> = {
    SPORTYBET_TZ: false,
    BETPAWA_TZ: false,
  };
  private resultsLock = false;
  private firestoreHydrated = false;
  private readonly resultsIntervalMinutes = 10;

  async ensureFirestoreHydrated(): Promise<void> {
    if (this.firestoreHydrated || !firebaseAdminBridge.isConfigured()) return;
    this.firestoreHydrated = true;
    const remote = await firebaseAdminBridge.loadPersistedStateFromFirestore();
    if (remote && (remote.tickets.length > 0 || remote.cycles.length > 0)) {
      automationStore.hydrateFromExternal(remote);
    }
  }

  start(): void {
    this.rescheduleFactoryTimer();
    if (!this.resultsTimer) {
      this.resultsTimer = setInterval(() => {
        void this.runResultsTrackingJob(false);
      }, this.resultsIntervalMinutes * 60 * 1000);
      this.resultsTimer.unref?.();
    }

    // Automatic initial catch-up run on server boot if not running inside test runner
    if (process.env.NODE_ENV !== 'test' && !this.bootTimer) {
      this.bootTimer = setTimeout(() => {
        void this.bootCatchUp();
      }, 3000);
      this.bootTimer.unref?.();
    }
  }

  private async bootCatchUp(): Promise<void> {
    await this.ensureFirestoreHydrated();
    const cfg = automationStore.getFactoryConfig();
    if (!cfg.enabled || cfg.paused) return;
    // Always track results first, then generate ONLY for any unlocked bookmaker with 0 active cycles
    await this.runResultsTrackingJob(false, undefined, null);
    for (const bk of ALL_BOOKMAKERS) {
      const st = automationStore.getFeedState(bk);
      if (!st.generationLocked && automationStore.getTickets(bk).length === 0) {
        await this.runDailyFactoryForBookmaker(bk, {
          manualTrigger: false,
          actorEmail: 'boot-scheduler',
        });
      }
    }
  }

  stop(): void {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    if (this.factoryTimer) {
      clearInterval(this.factoryTimer);
      this.factoryTimer = null;
    }
    if (this.resultsTimer) {
      clearInterval(this.resultsTimer);
      this.resultsTimer = null;
    }
  }

  rescheduleFactoryTimer(): void {
    if (this.factoryTimer) {
      clearInterval(this.factoryTimer);
      this.factoryTimer = null;
    }
    const cfg = automationStore.getFactoryConfig();
    if (!cfg.enabled || cfg.paused) return;

    const intervalMs = Math.max(5, cfg.scheduleIntervalMinutes) * 60 * 1000;
    this.factoryTimer = setInterval(() => {
      void this.runDailyFactoryJob(false, null);
    }, intervalMs);
    this.factoryTimer.unref?.();
  }

  isWithinOperatingWindow(cfg: DailyFactoryConfig, nowMs = Date.now()): boolean {
    const tz = cfg.timezone || 'Africa/Dar_es_Salaam';
    const currentMin = getTimeMinutesInTimezone(nowMs, tz);
    const startMin = parseHhMmToMinutes(cfg.windowStartTime, 0);
    const endMin = parseHhMmToMinutes(cfg.windowEndTime, 23 * 60 + 59);

    if (startMin <= endMin) {
      return currentMin >= startMin && currentMin <= endMin;
    }
    return currentMin >= startMin || currentMin <= endMin;
  }

  getDailyTicketsCountToday(tz = 'Africa/Dar_es_Salaam', bookmakerId?: BookmakerId): number {
    const todayKey = getDateKeyInTimezone(Date.now(), tz);
    return automationStore
      .getTickets(bookmakerId)
      .filter((t) => t.generatedDateKey === todayKey).length;
  }

  getSectionCountsToday(
    tz = 'Africa/Dar_es_Salaam',
    bookmakerId?: BookmakerId
  ): {
    totalToday: number;
    upcomingTotal: number;
    upcomingActive: number;
    liveFootballTotal: number;
    liveFootballActive: number;
    otherSportsTotal: number;
    otherSportsActive: number;
  } {
    const todayKey = getDateKeyInTimezone(Date.now(), tz);
    const todayTickets = automationStore
      .getTickets(bookmakerId)
      .filter((t) => t.generatedDateKey === todayKey);

    const upcoming = todayTickets.filter((t) => (t.feedSection || 'UPCOMING') === 'UPCOMING');
    const liveFootball = todayTickets.filter((t) => t.feedSection === 'LIVE_FOOTBALL');
    const otherSports = todayTickets.filter((t) => t.feedSection === 'OTHER_SPORTS');

    return {
      totalToday: todayTickets.length,
      upcomingTotal: upcoming.length,
      upcomingActive: upcoming.filter((t) => !isTicketTerminalStatus(t.status)).length,
      liveFootballTotal: liveFootball.length,
      liveFootballActive: liveFootball.filter((t) => !isTicketTerminalStatus(t.status)).length,
      otherSportsTotal: otherSports.length,
      otherSportsActive: otherSports.filter((t) => !isTicketTerminalStatus(t.status)).length,
    };
  }

  getStatus(bookmakerFilter?: BookmakerId): SchedulerStatus {
    const cfg = automationStore.getFactoryConfig();
    const meta = automationStore.getTimestamps();
    const scopedTickets = automationStore.getTickets(bookmakerFilter);
    const todayKey = getDateKeyInTimezone(Date.now(), cfg.timezone);
    const todayTickets = scopedTickets.filter((t) => t.generatedDateKey === todayKey);
    const counts = this.getSectionCountsToday(cfg.timezone, bookmakerFilter);
    const feedStates = automationStore.getFeedStates();

    const unfinishedMatches = ALL_BOOKMAKERS.flatMap((bk) => {
      if (bookmakerFilter && bk !== bookmakerFilter) return [];
      const activeCycle = automationStore.getActiveCycle(bk);
      const cycleTickets = automationStore.getCycleTickets(bk, activeCycle?.cycleId);
      return evaluateBookmakerCycleLock({
        bookmakerId: bk,
        activeCycle,
        cycleTickets,
        verificationFailures: automationStore.getVerificationFailures(bk),
      }).unfinishedMatches;
    });

    const nextRun =
      cfg.enabled && !cfg.paused && meta.lastFactoryRunAt
        ? new Date(
            Date.parse(meta.lastFactoryRunAt) +
              Math.max(5, cfg.scheduleIntervalMinutes) * 60 * 1000
          ).toISOString()
        : null;

    return {
      enabled: cfg.enabled,
      paused: cfg.paused,
      factoryRunning: this.bookmakerLocks.SPORTYBET_TZ || this.bookmakerLocks.BETPAWA_TZ,
      resultsTrackerRunning: this.resultsLock,
      resultsIntervalMinutes: this.resultsIntervalMinutes,
      lastFactoryRunAt: meta.lastFactoryRunAt,
      lastResultsRunAt: meta.lastResultsRunAt,
      lastScanningAt: meta.lastScanningAt,
      lastSettlementAt: meta.lastResultsRunAt,
      nextFactoryRunAt: nextRun,
      totalDailyTicketsToday: todayTickets.length,
      dailyTicketTarget: cfg.dailyTicketTarget,
      liveFootballCount: counts.liveFootballTotal,
      otherSportsCount: counts.otherSportsTotal,
      upcomingActiveCount: counts.upcomingActive,
      settledWonCount: scopedTickets.filter((t) => t.status === 'WON').length,
      settledLostCount: scopedTickets.filter((t) => t.status === 'LOST').length,
      settledVoidCount: scopedTickets.filter((t) => t.status === 'VOID').length,
      bookingCodesGeneratedToday: todayTickets.filter(
        (t) => t.bookingCodeStatus === 'GENERATED' && Boolean(t.shareCode)
      ).length,
      bookingCodeFailuresToday: todayTickets.filter(
        (t) => t.bookingCodeStatus === 'FAILED'
      ).length,
      dailyShortfallReason: meta.dailyShortfallReason,
      byBookmaker: feedStates,
      unfinishedMatches,
      verificationFailures: automationStore.getVerificationFailures(bookmakerFilter),
    };
  }

  private async revalidateAndPublishTickets(
    candidates: GeneratedTicket[],
    cfg: DailyFactoryConfig,
    bookmakerId: BookmakerId,
    validationOptions?: { allowLive?: boolean; allowBothLiveAndUpcoming?: boolean }
  ): Promise<{
    publishedTickets: GeneratedTicket[];
    rejectedCount: number;
    codesCreated: number;
    codeFailures: number;
  }> {
    if (candidates.length === 0) {
      return { publishedTickets: [], rejectedCount: 0, codesCreated: 0, codeFailures: 0 };
    }

    const client = getBookmakerClient(bookmakerId);
    const bookmakerInfo = getBookmakerInfo(bookmakerId);

    const uniqueEventIds = Array.from(
      new Set(candidates.flatMap((t) => t.selections.map((s) => s.eventId)))
    );
    const matchLookup = new Map<string, NormalizedMatch | null>();

    for (let i = 0; i < uniqueEventIds.length; i += 12) {
      const chunk = uniqueEventIds.slice(i, i + 12);
      await Promise.all(
        chunk.map(async (eventId) => {
          try {
            const match = await client.getMatchDetails(eventId);
            matchLookup.set(eventId, match);
          } catch {
            matchLookup.set(eventId, null);
          }
        })
      );
    }

    const nowMs = Date.now();
    const revalidatedAt = new Date(nowMs).toISOString();
    const publishedTickets: GeneratedTicket[] = [];
    let rejectedCount = 0;
    let codesCreated = 0;
    let codeFailures = 0;

    const usedShareCodes = automationStore.getExistingShareCodes(undefined, bookmakerId);

    for (const candidate of candidates) {
      const check = revalidateTicketSelectionsAgainstMatches(
        candidate.selections,
        matchLookup,
        { ...cfg, activeBookmaker: bookmakerId },
        nowMs,
        validationOptions
      );
      if (!check.valid) {
        rejectedCount++;
        continue;
      }

      const refreshedCombined = Number(
        check.refreshedSelections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)
      );

      let validatedTicket: GeneratedTicket = {
        ...candidate,
        bookmakerId,
        bookmakerName: candidate.bookmakerName || bookmakerInfo.name,
        bookmakerUrl: candidate.bookmakerUrl || bookmakerInfo.websiteUrl,
        selections: check.refreshedSelections,
        actualCombinedOdds: refreshedCombined,
        effectiveCombinedOdds: refreshedCombined,
        oddsDifference: Number((refreshedCombined - candidate.targetOdds).toFixed(2)),
        revalidatedAt,
        published: true,
      };

      if (cfg.autoCreateBookingCodes && bookmakerInfo.bookingCodeSupported) {
        try {
          const booking = await client.createBookingCode(validatedTicket.selections);
          const cleanCode = String(booking.shareCode || '').trim().toUpperCase();
          if (!cleanCode || usedShareCodes.has(cleanCode)) {
            throw new Error(
              cleanCode
                ? `Duplicate booking code ${cleanCode} rejected to preserve unique card codes.`
                : `${bookmakerInfo.shortName} returned an empty booking code.`
            );
          }
          usedShareCodes.add(cleanCode);
          validatedTicket = {
            ...validatedTicket,
            shareCode: booking.shareCode,
            shareUrl: booking.shareUrl,
            shareCodeDeadline: booking.deadline,
            shareCodeVerified: Boolean(booking.verified),
            bookingCodeStatus: 'GENERATED',
            bookingCodeError: null,
          };
          codesCreated++;
          await sleep(60);
        } catch (err) {
          codeFailures++;
          validatedTicket = {
            ...validatedTicket,
            shareCode: null,
            shareUrl: null,
            shareCodeDeadline: null,
            shareCodeVerified: false,
            bookingCodeStatus: 'FAILED',
            bookingCodeError:
              err instanceof Error
                ? err.message
                : `${bookmakerInfo.shortName} sharing-code API rejected or throttled this betslip.`,
          };
        }
      }

      publishedTickets.push(validatedTicket);
    }

    return { publishedTickets, rejectedCount, codesCreated, codeFailures };
  }

  /**
   * Independent per-bookmaker permanent cycle generator.
   * Strictly enforces Generation Lock & Idempotency:
   * NEVER generates or overwrites a bookmaker feed while ANY match in its active cycle is unfinished.
   */
  async runDailyFactoryForBookmaker(
    bookmakerId: BookmakerId,
    options?: {
      manualTrigger?: boolean;
      actorEmail?: string | null;
      idempotencySuffix?: string;
    }
  ): Promise<{
    bookmakerId: BookmakerId;
    cycleId: string | null;
    tickets: GeneratedTicket[];
    log: AutomationJobLog;
    shortfallReason: string | null;
    locked: boolean;
  }> {
    await this.ensureFirestoreHydrated();
    const bk = normalizeBookmakerId(bookmakerId);
    const bkInfo = getBookmakerInfo(bk);
    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();
    const manualTrigger = options?.manualTrigger ?? true;
    const actorEmail = options?.actorEmail ?? null;
    const actionType = manualTrigger ? 'MANUAL_TRIGGER' : 'AUTO_SCHEDULE';
    const cfg = automationStore.getFactoryConfig();

    if (this.bookmakerLocks[bk]) {
      const skippedLog: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        bookmakerId: bk,
        cycleId: null,
        actionType,
        jobType: 'DAILY_FACTORY',
        status: 'SKIPPED',
        actorEmail,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: `Skipped overlapping ${bkInfo.shortName} generation (run already in progress).`,
      };
      automationStore.addLog(skippedLog);
      return {
        bookmakerId: bk,
        cycleId: null,
        tickets: [],
        log: skippedLog,
        shortfallReason: skippedLog.message,
        locked: true,
      };
    }

    if (!manualTrigger && (!cfg.enabled || cfg.paused)) {
      const skippedLog: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        bookmakerId: bk,
        cycleId: null,
        actionType,
        jobType: 'DAILY_FACTORY',
        status: 'SKIPPED',
        actorEmail,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: cfg.paused
          ? `${bkInfo.shortName} Daily Factory scheduler is paused by administrator.`
          : `${bkInfo.shortName} Daily Factory automation is disabled.`,
      };
      return {
        bookmakerId: bk,
        cycleId: null,
        tickets: [],
        log: skippedLog,
        shortfallReason: null,
        locked: false,
      };
    }

    if (!manualTrigger && !this.isWithinOperatingWindow(cfg, startedMs)) {
      const skippedLog: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        bookmakerId: bk,
        cycleId: null,
        actionType,
        jobType: 'DAILY_FACTORY',
        status: 'SKIPPED',
        actorEmail,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: `${bkInfo.shortName}: Outside configured ${cfg.windowStartTime}–${cfg.windowEndTime} ${cfg.timezone} window.`,
      };
      automationStore.addLog(skippedLog);
      return {
        bookmakerId: bk,
        cycleId: null,
        tickets: [],
        log: skippedLog,
        shortfallReason: null,
        locked: false,
      };
    }

    // Recompute cycle lock strictly for this bookmaker BEFORE generating anything
    const currentState = automationStore.recomputeBookmakerState(bk);
    if (currentState.generationLocked) {
      const lockedLog: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        bookmakerId: bk,
        cycleId: currentState.activeCycleId,
        actionType,
        jobType: 'DAILY_FACTORY',
        status: 'SKIPPED',
        actorEmail,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: currentState.totalTicketsInCycle,
        ticketsSettled: currentState.settledTicketsInCycle,
        message: `${bkInfo.shortName} ${currentState.lockReason}`,
      };
      automationStore.addLog(lockedLog);
      return {
        bookmakerId: bk,
        cycleId: currentState.activeCycleId,
        tickets: [],
        log: lockedLog,
        shortfallReason: currentState.lockReason,
        locked: true,
      };
    }

    this.bookmakerLocks[bk] = true;
    try {
      const dateKey = getDateKeyInTimezone(Date.now(), cfg.timezone);
      const bkCycles = automationStore.getFeedCycles(bk);
      const cycleSeq = bkCycles.length + 1;
      const prefix = bk === 'BETPAWA_TZ' ? 'BP' : 'SB';
      const cycleId = `CYC_${prefix}_${dateKey.replace(/-/g, '')}_${String(cycleSeq).padStart(
        3,
        '0'
      )}`;
      const idempotencyKey = options?.idempotencySuffix
        ? `${bk}::${dateKey}::seq_${cycleSeq}::${options.idempotencySuffix}`
        : `${bk}::${dateKey}::seq_${cycleSeq}`;

      if (automationStore.hasIdempotencyKey(idempotencyKey)) {
        const dupLog: AutomationJobLog = {
          logId: `log_${crypto.randomBytes(4).toString('hex')}`,
          bookmakerId: bk,
          cycleId,
          actionType,
          jobType: 'DAILY_FACTORY',
          status: 'SKIPPED',
          actorEmail,
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedMs,
          ticketsGenerated: 0,
          codesCreated: 0,
          codeFailures: 0,
          ticketsChecked: 0,
          ticketsSettled: 0,
          message: `Skipped duplicate generation for ${bkInfo.shortName} (idempotencyKey=${idempotencyKey}).`,
        };
        automationStore.addLog(dupLog);
        return {
          bookmakerId: bk,
          cycleId,
          tickets: [],
          log: dupLog,
          shortfallReason: dupLog.message,
          locked: false,
        };
      }

      const sourceType = manualTrigger ? 'ADMIN_MANUAL' : 'DAILY_FACTORY';
      const existingSignatures = cfg.duplicatePrevention
        ? automationStore.getExistingSignatures(bk)
        : new Set<string>();

      const upcomingTarget = Math.min(cfg.maxTickets, cfg.dailyTicketTarget);
      const liveTarget = Math.max(10, cfg.liveFootballTarget ?? 12);
      const otherTarget = bk === 'BETPAWA_TZ' ? 0 : Math.max(10, cfg.otherSportsTarget ?? 12);

      const candidatePool: GeneratedTicket[] = [];
      let totalCodesCreated = 0;
      let totalCodeFailures = 0;
      const shortfallNotes: string[] = [];

      // 1. Upcoming Football Portfolio for this bookmaker
      if (upcomingTarget > 0) {
        const upcomingMatches = await fetchUpcomingMatchesForFactory(cfg, bk);
        automationStore.setScanningAt(new Date().toISOString());
        const generated = generateDailyPortfolioFromMatches({
          matches: upcomingMatches,
          config: cfg,
          targetCount: upcomingTarget,
          bookmakerId: bk,
          cycleId,
          idempotencyKey,
          sourceType,
          feedSection: 'UPCOMING',
          existingSignatures,
          nowMs: Date.now(),
        });
        const { publishedTickets, codesCreated, codeFailures } =
          await this.revalidateAndPublishTickets(generated.tickets, cfg, bk);
        publishedTickets.forEach((t) => existingSignatures.add(t.signature));
        candidatePool.push(...publishedTickets);
        totalCodesCreated += codesCreated;
        totalCodeFailures += codeFailures;
        if (generated.shortfallReason) shortfallNotes.push(`Upcoming: ${generated.shortfallReason}`);
      }

      // 2. Live Football Portfolio for this bookmaker
      if (liveTarget > 0) {
        const liveMatches = await fetchLiveFootballMatchesForFactory(cfg, bk);
        automationStore.setScanningAt(new Date().toISOString());
        const generatedLive = generateDailyPortfolioFromMatches({
          matches: liveMatches,
          config: cfg,
          targetCount: liveTarget,
          bookmakerId: bk,
          cycleId,
          idempotencyKey,
          sourceType,
          feedSection: 'LIVE_FOOTBALL',
          allowLive: true,
          ignoreScheduleWindow: true,
          existingSignatures,
          nowMs: Date.now(),
        });
        const { publishedTickets, codesCreated, codeFailures } =
          await this.revalidateAndPublishTickets(generatedLive.tickets, cfg, bk, {
            allowLive: true,
          });
        publishedTickets.forEach((t) => existingSignatures.add(t.signature));
        candidatePool.push(...publishedTickets);
        totalCodesCreated += codesCreated;
        totalCodeFailures += codeFailures;
        if (generatedLive.shortfallReason) {
          shortfallNotes.push(`Live Football: ${generatedLive.shortfallReason}`);
        }
      }

      // 3. Other Sports Portfolio (SportyBet multi-sport catalog)
      if (otherTarget > 0) {
        const otherMatches = await fetchOtherSportsMatchesForFactory(cfg, bk);
        automationStore.setScanningAt(new Date().toISOString());
        const generatedOther = generateDailyPortfolioFromMatches({
          matches: otherMatches,
          config: cfg,
          targetCount: otherTarget,
          bookmakerId: bk,
          cycleId,
          idempotencyKey,
          sourceType,
          feedSection: 'OTHER_SPORTS',
          allowBothLiveAndUpcoming: true,
          ignoreScheduleWindow: true,
          skipMarketFilter: true,
          existingSignatures,
          nowMs: Date.now(),
        });
        const { publishedTickets, codesCreated, codeFailures } =
          await this.revalidateAndPublishTickets(generatedOther.tickets, cfg, bk, {
            allowBothLiveAndUpcoming: true,
          });
        publishedTickets.forEach((t) => existingSignatures.add(t.signature));
        candidatePool.push(...publishedTickets);
        totalCodesCreated += codesCreated;
        totalCodeFailures += codeFailures;
        if (generatedOther.shortfallReason) {
          shortfallNotes.push(`Other Games: ${generatedOther.shortfallReason}`);
        }
      }

      const finishedAt = new Date().toISOString();
      const combinedShortfall = shortfallNotes.length > 0 ? shortfallNotes.join(' ') : null;

      if (candidatePool.length === 0) {
        automationStore.setFactoryRunMeta(finishedAt, combinedShortfall);
        const emptyLog: AutomationJobLog = {
          logId: `log_${crypto.randomBytes(4).toString('hex')}`,
          bookmakerId: bk,
          cycleId: null,
          actionType,
          jobType: 'DAILY_FACTORY',
          status: 'PARTIAL',
          actorEmail,
          startedAt,
          finishedAt,
          durationMs: Date.now() - startedMs,
          ticketsGenerated: 0,
          codesCreated: 0,
          codeFailures: 0,
          ticketsChecked: 0,
          ticketsSettled: 0,
          message: `${bkInfo.shortName}: No qualifying tickets published for cycle ${cycleId}. ${
            combinedShortfall || ''
          }`.trim(),
        };
        automationStore.addLog(emptyLog);
        return {
          bookmakerId: bk,
          cycleId: null,
          tickets: [],
          log: emptyLog,
          shortfallReason: combinedShortfall,
          locked: false,
        };
      }

      const lockEval = evaluateBookmakerCycleLock({
        bookmakerId: bk,
        activeCycle: null,
        cycleTickets: candidatePool,
        verificationFailures: [],
      });

      const newCycle: GenerationCycle = {
        cycleId,
        idempotencyKey,
        bookmakerId: bk,
        dateKey,
        status: 'ACTIVE',
        generationLocked: true,
        ticketIds: candidatePool.map((t) => t.internalTicketId),
        ticketCount: candidatePool.length,
        totalMatches: lockEval.totalMatchesInCycle,
        finishedMatches: lockEval.finishedMatchesCount,
        unfinishedMatches: lockEval.unfinishedMatchesCount,
        wonTickets: 0,
        lostTickets: 0,
        voidTickets: 0,
        createdAt: finishedAt,
        updatedAt: finishedAt,
        settledAt: null,
      };

      const registered = automationStore.registerCycleAndTickets({
        cycle: newCycle,
        newTickets: candidatePool,
        generationTimestamp: finishedAt,
      });

      if (registered.skippedReason || registered.inserted.length === 0) {
        const skipLog: AutomationJobLog = {
          logId: `log_${crypto.randomBytes(4).toString('hex')}`,
          bookmakerId: bk,
          cycleId,
          actionType,
          jobType: 'DAILY_FACTORY',
          status: 'SKIPPED',
          actorEmail,
          startedAt,
          finishedAt,
          durationMs: Date.now() - startedMs,
          ticketsGenerated: 0,
          codesCreated: 0,
          codeFailures: 0,
          ticketsChecked: 0,
          ticketsSettled: 0,
          message: registered.skippedReason || `Skipped duplicate ${bkInfo.shortName} cycle.`,
        };
        automationStore.addLog(skipLog);
        return {
          bookmakerId: bk,
          cycleId,
          tickets: [],
          log: skipLog,
          shortfallReason: skipLog.message,
          locked: automationStore.getFeedState(bk).generationLocked,
        };
      }

      const nextFeedState = automationStore.getFeedState(bk);
      await firebaseAdminBridge.commitGenerationCycleTransaction({
        cycle: registered.cycle,
        tickets: registered.inserted,
        feedState: nextFeedState,
        dailyTicketTarget: cfg.dailyTicketTarget,
      });

      automationStore.setFactoryRunMeta(finishedAt, combinedShortfall);

      const upCount = registered.inserted.filter(
        (t) => (t.feedSection || 'UPCOMING') === 'UPCOMING'
      ).length;
      const lfCount = registered.inserted.filter((t) => t.feedSection === 'LIVE_FOOTBALL').length;
      const osCount = registered.inserted.filter((t) => t.feedSection === 'OTHER_SPORTS').length;

      const log: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        bookmakerId: bk,
        cycleId: registered.cycle.cycleId,
        actionType,
        jobType: 'DAILY_FACTORY',
        status: combinedShortfall ? 'PARTIAL' : 'SUCCESS',
        actorEmail,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        ticketsGenerated: registered.inserted.length,
        codesCreated: totalCodesCreated,
        codeFailures: totalCodeFailures,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: `[${bkInfo.shortName} • ${registered.cycle.cycleId}] Published ${registered.inserted.length} permanent card(s) (${upCount} upcoming, ${lfCount} live football, ${osCount} other games; ${totalCodesCreated} booking codes, ${totalCodeFailures} failures). Generation LOCKED until all ${registered.cycle.totalMatches} match selections settle.${
          combinedShortfall ? ` ${combinedShortfall}` : ''
        }`,
      };
      automationStore.addLog(log);

      return {
        bookmakerId: bk,
        cycleId: registered.cycle.cycleId,
        tickets: registered.inserted,
        log,
        shortfallReason: combinedShortfall,
        locked: nextFeedState.generationLocked,
      };
    } catch (err) {
      const finishedAt = new Date().toISOString();
      const errMsg = err instanceof Error ? err.message : `${bkInfo.shortName} Daily Factory failed`;
      const log: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        bookmakerId: bk,
        cycleId: null,
        actionType,
        jobType: 'DAILY_FACTORY',
        status: 'FAILED',
        actorEmail,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: `[${bkInfo.shortName}] ${errMsg}`,
      };
      automationStore.addLog(log);
      return {
        bookmakerId: bk,
        cycleId: null,
        tickets: [],
        log,
        shortfallReason: errMsg,
        locked: automationStore.getFeedState(bk).generationLocked,
      };
    } finally {
      this.bookmakerLocks[bk] = false;
    }
  }

  /**
   * Orchestrates permanent feed generation either for one requested bookmaker or BOTH bookmakers independently.
   * When running automatically (cron / timer), checks results FIRST so settled cycles unlock before generating.
   */
  async runDailyFactoryJob(
    manualTrigger = true,
    actorEmail: string | null = null,
    targetBookmaker?: BookmakerId
  ): Promise<{
    tickets: GeneratedTicket[];
    log: AutomationJobLog;
    shortfallReason: string | null;
    byBookmaker: Record<
      BookmakerId,
      { cycleId: string | null; ticketsGenerated: number; locked: boolean; message: string }
    >;
  }> {
    await this.ensureFirestoreHydrated();

    // Always run result checks first on scheduled runs (or multi-bookmaker runs) so finished cycles unlock cleanly
    if (!manualTrigger) {
      await this.runResultsTrackingJob(false, undefined, actorEmail, {
        targetBookmaker,
      });
    }

    const targets: BookmakerId[] = targetBookmaker
      ? [normalizeBookmakerId(targetBookmaker)]
      : ALL_BOOKMAKERS;

    const results = [];
    for (const bk of targets) {
      const res = await this.runDailyFactoryForBookmaker(bk, {
        manualTrigger,
        actorEmail,
      });
      results.push(res);
    }

    const combinedTickets = results.flatMap((r) => r.tickets);
    const shortfalls = results
      .map((r) => r.shortfallReason)
      .filter((s): s is string => Boolean(s));

    const byBookmakerSummary: Record<
      BookmakerId,
      { cycleId: string | null; ticketsGenerated: number; locked: boolean; message: string }
    > = {
      SPORTYBET_TZ: {
        cycleId: automationStore.getFeedState('SPORTYBET_TZ').activeCycleId,
        ticketsGenerated: 0,
        locked: automationStore.getFeedState('SPORTYBET_TZ').generationLocked,
        message: automationStore.getFeedState('SPORTYBET_TZ').lockReason,
      },
      BETPAWA_TZ: {
        cycleId: automationStore.getFeedState('BETPAWA_TZ').activeCycleId,
        ticketsGenerated: 0,
        locked: automationStore.getFeedState('BETPAWA_TZ').generationLocked,
        message: automationStore.getFeedState('BETPAWA_TZ').lockReason,
      },
    };

    for (const r of results) {
      byBookmakerSummary[r.bookmakerId] = {
        cycleId: r.cycleId,
        ticketsGenerated: r.tickets.length,
        locked: r.locked,
        message: r.log.message,
      };
    }

    const primaryLog =
      results.length === 1
        ? results[0].log
        : {
            logId: `log_${crypto.randomBytes(4).toString('hex')}`,
            bookmakerId: 'ALL' as const,
            cycleId: null,
            actionType: manualTrigger ? ('MANUAL_TRIGGER' as const) : ('AUTO_SCHEDULE' as const),
            jobType: 'DAILY_FACTORY' as const,
            status: combinedTickets.length > 0 ? ('SUCCESS' as const) : ('SKIPPED' as const),
            actorEmail,
            startedAt: results[0]?.log.startedAt || new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: results.reduce((sum, r) => sum + r.log.durationMs, 0),
            ticketsGenerated: combinedTickets.length,
            codesCreated: results.reduce((sum, r) => sum + r.log.codesCreated, 0),
            codeFailures: results.reduce((sum, r) => sum + r.log.codeFailures, 0),
            ticketsChecked: results.reduce((sum, r) => sum + r.log.ticketsChecked, 0),
            ticketsSettled: results.reduce((sum, r) => sum + r.log.ticketsSettled, 0),
            message: results.map((r) => r.log.message).join(' | '),
          };

    return {
      tickets: combinedTickets,
      log: primaryLog,
      shortfallReason: shortfalls.length > 0 ? shortfalls.join(' | ') : null,
      byBookmaker: byBookmakerSummary,
    };
  }

  async retryFailedBookingCodes(
    ticketIds?: string[],
    actorEmail: string | null = null
  ): Promise<{
    retriedCount: number;
    codesCreated: number;
    codeFailures: number;
    tickets: GeneratedTicket[];
    log: AutomationJobLog;
  }> {
    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();
    const all = automationStore.getTickets();
    const targets = all.filter((t) => {
      if (ticketIds && ticketIds.length > 0 && !ticketIds.includes(t.internalTicketId)) {
        return false;
      }
      return (
        !isTicketTerminalStatus(t.status) &&
        (!t.shareCode || t.bookingCodeStatus === 'FAILED' || t.bookingCodeStatus === 'NOT_REQUESTED')
      );
    });

    let codesCreated = 0;
    let codeFailures = 0;
    const updatedTickets: GeneratedTicket[] = [];

    for (const ticket of targets) {
      const ticketBookmaker = normalizeBookmakerId(ticket.bookmakerId);
      const client = getBookmakerClient(ticketBookmaker);
      const bookmakerInfo = getBookmakerInfo(ticketBookmaker);
      const usedShareCodes = automationStore.getExistingShareCodes(
        ticket.internalTicketId,
        ticketBookmaker
      );

      try {
        const booking = await client.createBookingCode(ticket.selections);
        const cleanCode = String(booking.shareCode || '').trim().toUpperCase();
        if (!cleanCode || usedShareCodes.has(cleanCode)) {
          throw new Error(
            cleanCode
              ? `Duplicate booking code ${cleanCode} rejected to preserve unique card codes.`
              : `${bookmakerInfo.shortName} returned an empty booking code.`
          );
        }
        const saved = automationStore.updateTicketMutableFields({
          ...ticket,
          shareCode: booking.shareCode,
          shareUrl: booking.shareUrl,
          shareCodeDeadline: booking.deadline,
          shareCodeVerified: Boolean(booking.verified),
          bookingCodeStatus: 'GENERATED',
          bookingCodeError: null,
          lastCheckedAt: new Date().toISOString(),
        });
        if (saved) updatedTickets.push(saved);
        codesCreated++;
        await sleep(80);
      } catch (err) {
        codeFailures++;
        const saved = automationStore.updateTicketMutableFields({
          ...ticket,
          bookingCodeStatus: 'FAILED',
          bookingCodeError:
            err instanceof Error
              ? err.message
              : `${bookmakerInfo.shortName} booking code API failed`,
          lastCheckedAt: new Date().toISOString(),
        });
        if (saved) updatedTickets.push(saved);
      }
    }

    if (updatedTickets.length > 0) {
      await firebaseAdminBridge.syncSettlementState({
        updatedTickets,
        matchResults: [],
        cycles: [],
        feedStates: automationStore.getFeedStates(),
      });
    }

    const log: AutomationJobLog = {
      logId: `log_${crypto.randomBytes(4).toString('hex')}`,
      actionType: 'RETRY_CODES',
      jobType: 'ADMIN_ACTION',
      status: codeFailures > 0 && codesCreated === 0 ? 'FAILED' : codeFailures > 0 ? 'PARTIAL' : 'SUCCESS',
      actorEmail,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedMs,
      ticketsGenerated: 0,
      codesCreated,
      codeFailures,
      ticketsChecked: targets.length,
      ticketsSettled: 0,
      message: `Retried ${targets.length} ticket(s): ${codesCreated} genuine booking code(s) created, ${codeFailures} failed.`,
    };
    automationStore.addLog(log);

    return {
      retriedCount: targets.length,
      codesCreated,
      codeFailures,
      tickets: automationStore.getTickets(),
      log,
    };
  }

  /**
   * Automatic ticket & match result tracker.
   * Tracks all non-terminal tickets AND any LOST tickets that still have unfinished match selections
   * so generation locks accurately reflect true completion of every match in each bookmaker's cycle.
   */
  async runResultsTrackingJob(
    manualTrigger = true,
    ticketIds?: string[],
    actorEmail: string | null = null,
    options?: {
      targetBookmaker?: BookmakerId;
      retryFailedOnly?: boolean;
    }
  ): Promise<{
    updatedTickets: GeneratedTicket[];
    replenishedTickets: GeneratedTicket[];
    unlockedBookmakers: BookmakerId[];
    log: AutomationJobLog;
  }> {
    await this.ensureFirestoreHydrated();
    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();
    const actionType = options?.retryFailedOnly ? 'RETRY_RESULTS' : 'RESULTS_CHECK';

    if (this.resultsLock) {
      const skippedLog: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        bookmakerId: options?.targetBookmaker || 'ALL',
        actionType,
        jobType: 'RESULTS_TRACKER',
        status: 'SKIPPED',
        actorEmail,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: 'Results tracker already running.',
      };
      return {
        updatedTickets: [],
        replenishedTickets: [],
        unlockedBookmakers: [],
        log: skippedLog,
      };
    }

    this.resultsLock = true;
    try {
      const targetBk = options?.targetBookmaker
        ? normalizeBookmakerId(options.targetBookmaker)
        : undefined;
      const failedEventIds = options?.retryFailedOnly
        ? new Set(automationStore.getVerificationFailures(targetBk).map((f) => f.eventId))
        : null;

      const prevLockSnapshot: Record<BookmakerId, boolean> = {
        SPORTYBET_TZ: automationStore.getFeedState('SPORTYBET_TZ').generationLocked,
        BETPAWA_TZ: automationStore.getFeedState('BETPAWA_TZ').generationLocked,
      };

      const allTickets = automationStore.getTickets(targetBk);
      const targetTickets = allTickets.filter((t) => {
        if (ticketIds && ticketIds.length > 0 && !ticketIds.includes(t.internalTicketId)) {
          return false;
        }
        if (failedEventIds && failedEventIds.size > 0) {
          const touchesFailedEvent = t.selections.some((s) => failedEventIds.has(s.eventId));
          if (!touchesFailedEvent) return false;
        }
        if (!isTicketTerminalStatus(t.status)) return true;
        // Also continue tracking LOST tickets until every match selection reaches WON / LOST / VOID
        if (t.status === 'LOST') {
          const progress = computeTicketMatchProgress(t);
          return progress.unfinishedMatchCount > 0;
        }
        return false;
      });

      if (targetTickets.length === 0) {
        const finishedAt = new Date().toISOString();
        const states = automationStore.recomputeAllBookmakerStates();
        automationStore.setResultsRunAt(finishedAt, targetBk ? [targetBk] : ALL_BOOKMAKERS);

        const unlockedBookmakers = ALL_BOOKMAKERS.filter(
          (bk) => prevLockSnapshot[bk] && !states[bk].generationLocked
        );

        const log: AutomationJobLog = {
          logId: `log_${crypto.randomBytes(4).toString('hex')}`,
          bookmakerId: targetBk || 'ALL',
          actionType,
          jobType: 'RESULTS_TRACKER',
          status: manualTrigger ? 'SUCCESS' : 'SKIPPED',
          actorEmail,
          startedAt,
          finishedAt,
          durationMs: Date.now() - startedMs,
          ticketsGenerated: 0,
          codesCreated: 0,
          codeFailures: 0,
          ticketsChecked: 0,
          ticketsSettled: 0,
          message: options?.retryFailedOnly
            ? 'No failed or unfinished result checks pending verification.'
            : 'No unfinished match selections require verification.',
        };
        if (manualTrigger) automationStore.addLog(log);
        return {
          updatedTickets: [],
          replenishedTickets: [],
          unlockedBookmakers,
          log,
        };
      }

      const ticketsByBookmaker = new Map<BookmakerId, GeneratedTicket[]>();
      for (const ticket of targetTickets) {
        const bk = normalizeBookmakerId(ticket.bookmakerId);
        const arr = ticketsByBookmaker.get(bk) || [];
        arr.push(ticket);
        ticketsByBookmaker.set(bk, arr);
      }

      const updatedTickets: GeneratedTicket[] = [];
      const newMatchResults: MatchResultRecord[] = [];
      let newlySettledTicketCount = 0;
      let totalUniqueEvents = 0;
      let verificationErrorCount = 0;

      for (const [bkId, bkTickets] of ticketsByBookmaker.entries()) {
        const client = getBookmakerClient(bkId);
        const eventTicketMap = new Map<string, { ticketIds: string[]; homeTeam: string; awayTeam: string }>();
        for (const t of bkTickets) {
          for (const sel of t.selections) {
            const entry = eventTicketMap.get(sel.eventId) || {
              ticketIds: [],
              homeTeam: sel.homeTeam,
              awayTeam: sel.awayTeam,
            };
            entry.ticketIds.push(t.internalTicketId);
            eventTicketMap.set(sel.eventId, entry);
          }
        }

        const bkEventIds = Array.from(eventTicketMap.keys());
        totalUniqueEvents += bkEventIds.length;
        const matchLookup = new Map<string, NormalizedMatch | null>();

        try {
          const live = await client.getLiveMatches('sr:sport:1');
          for (const m of live) {
            matchLookup.set(m.eventId, m);
          }
        } catch {
          // Proceed with individual event probes
        }

        const remainingIds = bkEventIds.filter((id) => !matchLookup.has(id));
        for (let i = 0; i < remainingIds.length; i += 12) {
          const chunk = remainingIds.slice(i, i + 12);
          await Promise.all(
            chunk.map(async (eventId) => {
              try {
                const details = await client.getMatchDetails(eventId);
                matchLookup.set(eventId, details);
                automationStore.clearVerificationFailure(bkId, eventId);
              } catch (err) {
                matchLookup.set(eventId, null);
                const meta = eventTicketMap.get(eventId);
                verificationErrorCount++;
                automationStore.recordVerificationFailure({
                  bookmakerId: bkId,
                  eventId,
                  ticketIds: meta?.ticketIds || [],
                  homeTeam: meta?.homeTeam || 'Match',
                  awayTeam: meta?.awayTeam || eventId,
                  error: err instanceof Error ? err.message : 'Match verification API failed',
                });
              }
            })
          );
        }

        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();

        for (const ticket of bkTickets) {
          const wasTerminal = isTicketTerminalStatus(ticket.status);
          const evaluated = evaluateTicketSettlement(ticket, matchLookup, nowMs);
          if (!wasTerminal && isTicketTerminalStatus(evaluated.status)) {
            newlySettledTicketCount++;
          }
          const saved = automationStore.updateTicketMutableFields(evaluated);
          if (saved) {
            updatedTickets.push(saved);

            // Persist individual match result verification records cleanly
            for (const sel of saved.selections) {
              const ss = saved.selectionSettlements.find(
                (s) => s.selectionKey === sel.selectionKey
              );
              if (!ss) continue;
              newMatchResults.push({
                resultId: `${bkId}__${sel.eventId}`.replace(/[^a-zA-Z0-9_\-]/g, '_'),
                bookmakerId: bkId,
                eventId: sel.eventId,
                homeTeam: sel.homeTeam,
                awayTeam: sel.awayTeam,
                officialMatchStatus: ss.officialMatchStatus || '',
                status: ss.status,
                score: ss.score || '',
                verified: isSelectionTerminalStatus(ss.status),
                reason: ss.reason || '',
                updatedAt: nowIso,
              });
            }
          }
        }
      }

      automationStore.upsertMatchResults(newMatchResults);
      const nextStates = automationStore.recomputeAllBookmakerStates();
      const finishedAt = new Date().toISOString();
      automationStore.setResultsRunAt(
        finishedAt,
        Array.from(ticketsByBookmaker.keys())
      );

      const unlockedBookmakers = ALL_BOOKMAKERS.filter(
        (bk) => prevLockSnapshot[bk] && !nextStates[bk].generationLocked
      );

      const log: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        bookmakerId: targetBk || 'ALL',
        actionType,
        jobType: 'RESULTS_TRACKER',
        status: verificationErrorCount > 0 ? 'PARTIAL' : 'SUCCESS',
        actorEmail,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: updatedTickets.length,
        ticketsSettled: newlySettledTicketCount,
        message: `Checked ${updatedTickets.length} ticket(s) across ${totalUniqueEvents} event(s); settled ${newlySettledTicketCount}.${
          unlockedBookmakers.length > 0
            ? ` Cycle UNLOCKED for: ${unlockedBookmakers.map((b) => getBookmakerInfo(b).shortName).join(', ')}.`
            : ''
        }${
          verificationErrorCount > 0
            ? ` ${verificationErrorCount} event verification error(s) queued for safe retry.`
            : ''
        }`,
      };
      automationStore.addLog(log);

      await firebaseAdminBridge.syncSettlementState({
        updatedTickets,
        matchResults: newMatchResults,
        cycles: automationStore.getFeedCycles(),
        feedStates: nextStates,
        log,
      });

      return {
        updatedTickets,
        replenishedTickets: [],
        unlockedBookmakers,
        log,
      };
    } catch (err) {
      const finishedAt = new Date().toISOString();
      const errMsg = err instanceof Error ? err.message : 'Results tracking failed';
      const log: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        bookmakerId: options?.targetBookmaker || 'ALL',
        actionType,
        jobType: 'RESULTS_TRACKER',
        status: 'FAILED',
        actorEmail,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: errMsg,
      };
      automationStore.addLog(log);
      return {
        updatedTickets: [],
        replenishedTickets: [],
        unlockedBookmakers: [],
        log,
      };
    } finally {
      this.resultsLock = false;
    }
  }

  async retryFailedResultChecks(
    targetBookmaker?: BookmakerId,
    actorEmail: string | null = null
  ) {
    return this.runResultsTrackingJob(true, undefined, actorEmail, {
      targetBookmaker,
      retryFailedOnly: true,
    });
  }
}

export const schedulerService = new SchedulerService();
