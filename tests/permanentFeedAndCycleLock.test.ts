import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { betPawaClient } from '../backend/integrations/betpawaClient.ts';
import { sportyBetClient } from '../backend/integrations/sportybetClient.ts';
import { automationStore, DEFAULT_DAILY_FACTORY_CONFIG } from '../backend/services/automationStore.ts';
import { schedulerService } from '../backend/services/schedulerService.ts';
import { evaluateBookmakerCycleLock, evaluateTicketSettlement } from '../backend/services/settlementService.ts';
import type {
  BetslipSelection,
  BookmakerId,
  BookingCodeResponse,
  NormalizedMatch,
} from '../src/types/sportybet.ts';

function makeMockMatch(params: {
  bookmakerId: BookmakerId;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  estimateStartTime: number;
  isLive?: boolean;
  statusCode?: number;
  matchStatus?: string;
  score?: string | null;
  doubleChance1XOdds?: number;
  doubleChanceX2Odds?: number;
  over15Odds?: number;
}): NormalizedMatch {
  const isLive = params.isLive ?? false;
  const statusCode = params.statusCode ?? (isLive ? 1 : 0);
  const matchStatus = params.matchStatus ?? (isLive ? '1H' : 'Not start');

  return {
    eventId: params.eventId,
    gameId: params.eventId,
    bookmakerId: params.bookmakerId,
    homeTeam: params.homeTeam,
    awayTeam: params.awayTeam,
    homeTeamId: `h_${params.eventId}`,
    awayTeamId: `a_${params.eventId}`,
    leagueId: 'sr:tournament:17',
    leagueName: params.bookmakerId === 'BETPAWA_TZ' ? 'Tanzania Premier League' : 'Premier League',
    country: params.bookmakerId === 'BETPAWA_TZ' ? 'Tanzania' : 'England',
    countryId: 'sr:category:1',
    sportId: 'sr:sport:1',
    sportName: 'Football',
    estimateStartTime: params.estimateStartTime,
    kickoffIso: new Date(params.estimateStartTime).toISOString(),
    statusCode,
    matchStatus,
    isLive,
    score: params.score ?? null,
    playedSeconds: isLive ? '15:00' : null,
    totalMarketSize: 3,
    dataSource:
      params.bookmakerId === 'BETPAWA_TZ' ? 'betPawa TZ' : 'SportyBet TZ (BET_RADAR)',
    retrievedAt: new Date().toISOString(),
    markets: [
      {
        marketId: params.bookmakerId === 'BETPAWA_TZ' ? '4693' : '10',
        name: 'Double Chance',
        desc: 'Double Chance',
        specifier: '',
        status: 0,
        banned: false,
        sourceType: 'BET_RADAR',
        lastOddsChangeTime: null,
        outcomes: [
          {
            outcomeId: '9',
            desc: '1X',
            odds: params.doubleChance1XOdds ?? 1.18,
            probability: 0.84,
            isActive: true,
          },
          {
            outcomeId: '10',
            desc: '12',
            odds: 1.24,
            probability: 0.78,
            isActive: true,
          },
          {
            outcomeId: '11',
            desc: 'X2',
            odds: params.doubleChanceX2Odds ?? 1.22,
            probability: 0.8,
            isActive: true,
          },
        ],
      },
      {
        marketId: params.bookmakerId === 'BETPAWA_TZ' ? '5000' : '18',
        name: 'Over/Under',
        desc: 'Over/Under',
        specifier: 'total=1.5',
        status: 0,
        banned: false,
        sourceType: 'BET_RADAR',
        lastOddsChangeTime: null,
        outcomes: [
          {
            outcomeId: '12',
            desc: 'Over 1.5',
            odds: params.over15Odds ?? 1.2,
            probability: 0.82,
            isActive: true,
          },
          {
            outcomeId: '13',
            desc: 'Under 1.5',
            odds: 4.1,
            probability: 0.18,
            isActive: true,
          },
        ],
      },
    ],
  };
}

describe('Permanent Daily Feeds, Independent Bookmakers & Strict Cycle Generation Locks (12 Acceptance Scenarios)', () => {
  const sbMatches = new Map<string, NormalizedMatch>();
  const bpMatches = new Map<string, NormalizedMatch>();
  const failingEvents = new Set<string>();
  let sbCodeSeq = 1;
  let bpCodeSeq = 1;

  function seedFreshPools() {
    sbMatches.clear();
    bpMatches.clear();
    failingEvents.clear();
    sbCodeSeq = 1;
    bpCodeSeq = 1;

    const now = Date.now();
    // Seed 6 distinct upcoming fixtures per bookmaker with completely distinct team names & event IDs
    for (let i = 1; i <= 6; i++) {
      const sbEv = `sb:match:${i}`;
      sbMatches.set(
        sbEv,
        makeMockMatch({
          bookmakerId: 'SPORTYBET_TZ',
          eventId: sbEv,
          homeTeam: `SB_Home_${i}`,
          awayTeam: `SB_Away_${i}`,
          estimateStartTime: now + (i + 1) * 3600 * 1000,
          doubleChance1XOdds: 1.18,
          over15Odds: 1.2,
        })
      );

      const bpEv = `bp:match:${i}`;
      bpMatches.set(
        bpEv,
        makeMockMatch({
          bookmakerId: 'BETPAWA_TZ',
          eventId: bpEv,
          homeTeam: `BP_Home_${i}`,
          awayTeam: `BP_Away_${i}`,
          estimateStartTime: now + (i + 1) * 3600 * 1000,
          doubleChance1XOdds: 1.19,
          over15Odds: 1.21,
        })
      );
    }
  }

  beforeEach(() => {
    automationStore.resetForTesting();
    seedFreshPools();

    const now = Date.now();
    const startDate = new Date(now - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const endDate = new Date(now + 48 * 3600 * 1000).toISOString().slice(0, 10);

    automationStore.setFactoryConfig({
      ...DEFAULT_DAILY_FACTORY_CONFIG,
      enabled: true,
      paused: false,
      dailyTicketTarget: 2,
      liveFootballTarget: 10, // Will naturally yield 0 live if no live matches seeded (keeps test focused & deterministic)
      otherSportsTarget: 10,
      minSelections: 2,
      maxSelections: 3,
      minIndividualOdds: 1.05,
      maxIndividualOdds: 1.25,
      datePreset: 'CUSTOM',
      customStartDate: startDate,
      customEndDate: endDate,
      windowStartTime: '00:00',
      windowEndTime: '23:59',
      oddsCategories: [
        {
          id: 'cat_test',
          label: '1.20–2.50',
          minCombinedOdds: 1.2,
          maxCombinedOdds: 2.5,
          targetCombinedOdds: 1.5,
          weight: 100,
        },
      ],
      autoCreateBookingCodes: true,
    });

    vi.spyOn(sportyBetClient, 'getUpcomingMatches').mockImplementation(async (opts) => {
      const sportId = opts?.sportId || 'sr:sport:1';
      if (sportId !== 'sr:sport:1') return { matches: [], totalAvailable: 0 };
      const list = Array.from(sbMatches.values()).filter((m) => !m.isLive && m.statusCode < 3);
      return { matches: list, totalAvailable: list.length };
    });

    vi.spyOn(sportyBetClient, 'getLiveMatches').mockImplementation(async (sportId = 'sr:sport:1') => {
      if (sportId !== 'sr:sport:1') return [];
      return Array.from(sbMatches.values()).filter((m) => m.isLive);
    });

    vi.spyOn(sportyBetClient, 'getMatchDetails').mockImplementation(async (eventId: string) => {
      if (failingEvents.has(eventId)) {
        throw new Error(`Simulated SportyBet API timeout for ${eventId}`);
      }
      const m = sbMatches.get(eventId);
      if (!m) throw new Error(`Match ${eventId} not found`);
      return m;
    });

    vi.spyOn(sportyBetClient, 'createBookingCode').mockImplementation(
      async (selections: BetslipSelection[]): Promise<BookingCodeResponse> => ({
        shareCode: `SB${String(sbCodeSeq++).padStart(4, '0')}TZ`,
        shareUrl: `https://www.sportybet.com/tz/booking/SB${sbCodeSeq}`,
        deadline: Date.now() + 7200 * 1000,
        verified: true,
        selectionCount: selections.length,
        createdAt: new Date().toISOString(),
        combinedOdds: Number(selections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)),
        selections,
        bookmakerId: 'SPORTYBET_TZ',
        bookmakerName: 'SportyBet Tanzania',
      })
    );

    vi.spyOn(betPawaClient, 'getUpcomingMatches').mockImplementation(async (opts) => {
      const sportId = (opts as { sportId?: string } | undefined)?.sportId || '2';
      if (sportId !== '2' && sportId !== 'sr:sport:1') {
        return { matches: [], totalAvailable: 0 };
      }
      const list = Array.from(bpMatches.values()).filter((m) => !m.isLive && m.statusCode < 3);
      return { matches: list, totalAvailable: list.length };
    });

    vi.spyOn(betPawaClient, 'getLiveMatches').mockImplementation(async (sportId = '2') => {
      if (sportId !== '2' && sportId !== 'sr:sport:1') return [];
      return Array.from(bpMatches.values()).filter((m) => m.isLive);
    });

    vi.spyOn(betPawaClient, 'getMatchDetails').mockImplementation(async (eventId: string) => {
      if (failingEvents.has(eventId)) {
        throw new Error(`Simulated betPawa API timeout for ${eventId}`);
      }
      const m = bpMatches.get(eventId);
      if (!m) throw new Error(`Match ${eventId} not found`);
      return m;
    });

    vi.spyOn(betPawaClient, 'createBookingCode').mockImplementation(
      async (selections: BetslipSelection[]): Promise<BookingCodeResponse> => ({
        shareCode: `BP${String(bpCodeSeq++).padStart(4, '0')}TZ`,
        shareUrl: `https://www.betpawa.co.tz/share/BP${bpCodeSeq}`,
        deadline: Date.now() + 7200 * 1000,
        verified: true,
        selectionCount: selections.length,
        createdAt: new Date().toISOString(),
        combinedOdds: Number(selections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)),
        selections,
        bookmakerId: 'BETPAWA_TZ',
        bookmakerName: 'betPawa Tanzania',
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    automationStore.resetForTesting();
  });

  afterAll(() => {
    automationStore.resetForTesting();
  });

  it('Tests 1 & 2: generates independent permanent SportyBet and betPawa feeds with zero cross-contamination', async () => {
    const sbRun = await schedulerService.runDailyFactoryForBookmaker('SPORTYBET_TZ', {
      manualTrigger: true,
      actorEmail: 'xbotmanager@gmail.com',
    });
    const bpRun = await schedulerService.runDailyFactoryForBookmaker('BETPAWA_TZ', {
      manualTrigger: true,
      actorEmail: 'xbotmanager@gmail.com',
    });

    expect(sbRun.tickets.length).toBeGreaterThanOrEqual(1);
    expect(bpRun.tickets.length).toBeGreaterThanOrEqual(1);
    expect(sbRun.cycleId).toMatch(/^CYC_SB_/);
    expect(bpRun.cycleId).toMatch(/^CYC_BP_/);

    const storedSb = automationStore.getTickets('SPORTYBET_TZ');
    const storedBp = automationStore.getTickets('BETPAWA_TZ');

    expect(storedSb.length).toBe(sbRun.tickets.length);
    expect(storedBp.length).toBe(bpRun.tickets.length);
    expect(storedSb.every((t) => t.bookmakerId === 'SPORTYBET_TZ')).toBe(true);
    expect(storedBp.every((t) => t.bookmakerId === 'BETPAWA_TZ')).toBe(true);
    expect(storedSb.every((t) => (t.shareCode || '').startsWith('SB'))).toBe(true);
    expect(storedBp.every((t) => (t.shareCode || '').startsWith('BP'))).toBe(true);

    // Zero mixed event IDs or booking codes
    const sbEventIds = new Set(storedSb.flatMap((t) => t.selections.map((s) => s.eventId)));
    const bpEventIds = new Set(storedBp.flatMap((t) => t.selections.map((s) => s.eventId)));
    for (const id of sbEventIds) {
      expect(bpEventIds.has(id)).toBe(false);
    }

    // Both cycles locked upon publication
    expect(automationStore.getFeedState('SPORTYBET_TZ').generationLocked).toBe(true);
    expect(automationStore.getFeedState('BETPAWA_TZ').generationLocked).toBe(true);
  });

  it('Tests 3 & 4: preserves both feeds identically across repeated refreshes and cold-start reopen hydration', async () => {
    await schedulerService.runDailyFactoryForBookmaker('SPORTYBET_TZ', { manualTrigger: true });
    await schedulerService.runDailyFactoryForBookmaker('BETPAWA_TZ', { manualTrigger: true });

    const sbBefore = automationStore.getTickets('SPORTYBET_TZ');
    const bpBefore = automationStore.getTickets('BETPAWA_TZ');
    const cyclesBefore = automationStore.getFeedCycles();
    const statesBefore = automationStore.getFeedStates();

    // Simulate cold-start reset followed by external Firestore hydration (reopen app / serverless cold start)
    automationStore.resetForTesting();
    expect(automationStore.getTickets().length).toBe(0);

    automationStore.hydrateFromExternal({
      tickets: [...sbBefore, ...bpBefore],
      cycles: cyclesBefore,
      feedStates: statesBefore,
    });

    // Simulate repeated "refresh" / stale non-terminal hydration attempt trying to alter odds or selections
    automationStore.hydrateFromExternal({
      tickets: [
        {
          ...sbBefore[0],
          actualCombinedOdds: 99.99,
        },
      ],
    });

    const sbAfter = automationStore.getTickets('SPORTYBET_TZ');
    const bpAfter = automationStore.getTickets('BETPAWA_TZ');
    expect(sbAfter.map((t) => t.internalTicketId)).toEqual(sbBefore.map((t) => t.internalTicketId));
    expect(sbAfter[0].actualCombinedOdds).toBe(sbBefore[0].actualCombinedOdds);
    expect(sbAfter[0].selections).toEqual(sbBefore[0].selections);
    expect(bpAfter.map((t) => t.internalTicketId)).toEqual(bpBefore.map((t) => t.internalTicketId));
  });

  it('Tests 5 & 6: stays strictly LOCKED while any match is unfinished, even after a multi-leg ticket settles LOST early', async () => {
    const sbRun = await schedulerService.runDailyFactoryForBookmaker('SPORTYBET_TZ', {
      manualTrigger: true,
    });
    expect(sbRun.tickets.length).toBeGreaterThanOrEqual(1);
    const firstTicket = sbRun.tickets[0];
    const [leg1, ...otherLegs] = firstTicket.selections;

    // Simulate leg 1 finishing in a guaranteed loss while all other matches stay upcoming
    const losingScore =
      leg1.marketId === '18'
        ? '0:0'
        : /x2/i.test(leg1.outcomeDesc)
          ? '2:0'
          : '0:1';
    const m1 = sbMatches.get(leg1.eventId)!;
    sbMatches.set(leg1.eventId, {
      ...m1,
      statusCode: 3,
      matchStatus: 'Ended',
      isLive: false,
      score: losingScore,
    });

    await schedulerService.runResultsTrackingJob(true, undefined, 'cron', {
      targetBookmaker: 'SPORTYBET_TZ',
    });

    const updatedTicket = automationStore.getTicketById(firstTicket.internalTicketId)!;
    expect(updatedTicket.status).toBe('LOST');
    expect(updatedTicket.settledAt).not.toBeNull();
    // Leg 1 is LOST, remaining leg(s) are still UPCOMING
    expect(updatedTicket.unfinishedMatchCount).toBe(otherLegs.length);

    // Feed MUST STILL BE LOCKED because leg 2+ (and any other tickets in cycle) are still unfinished!
    const sbState = automationStore.getFeedState('SPORTYBET_TZ');
    expect(sbState.generationLocked).toBe(true);
    expect(sbState.lockStatus).toBe('LOCKED');
    expect(sbState.unfinishedMatchesCount).toBeGreaterThan(0);

    // Attempting to run factory again MUST be skipped without overwriting or adding a cycle
    const blockedRetry = await schedulerService.runDailyFactoryForBookmaker('SPORTYBET_TZ', {
      manualTrigger: true,
    });
    expect(blockedRetry.tickets.length).toBe(0);
    expect(blockedRetry.locked).toBe(true);
    expect(automationStore.getFeedCycles('SPORTYBET_TZ').length).toBe(1);
  });

  it('Tests 7, 8, 9 & 11: settles WON/LOST/VOID accumulators, voids reduce odds to 1.00, and completing one bookmaker unlocks ONLY that bookmaker', async () => {
    const sbRun = await schedulerService.runDailyFactoryForBookmaker('SPORTYBET_TZ', {
      manualTrigger: true,
    });
    const bpRun = await schedulerService.runDailyFactoryForBookmaker('BETPAWA_TZ', {
      manualTrigger: true,
    });
    expect(sbRun.tickets.length).toBeGreaterThanOrEqual(2);
    expect(bpRun.tickets.length).toBeGreaterThanOrEqual(1);

    const sbTicket0 = sbRun.tickets[0];
    const sbTicket1 = sbRun.tickets[1];

    // Settle ALL SportyBet matches:
    // - Ticket 0 leg 0 is Cancelled (VOID -> multiplier drops to 1.00), Ticket 0 leg 1+ win (2:0) -> WON with adjusted odds
    // - Ticket 1 leg 0 loses (0:4) -> LOST, remaining legs win (2:1)
    // - Any extra matches in SB pool win (2:0)
    for (const [evId, match] of sbMatches.entries()) {
      const isTicket0VoidLeg = sbTicket0.selections[0]?.eventId === evId;
      const isTicket1LostLeg = sbTicket1.selections[0]?.eventId === evId;
      if (isTicket0VoidLeg) {
        sbMatches.set(evId, {
          ...match,
          statusCode: 5,
          matchStatus: 'Cancelled',
          isLive: false,
          score: null,
        });
      } else if (isTicket1LostLeg) {
        const legSel = sbTicket1.selections[0];
        const loseScore =
          legSel.marketId === '18'
            ? '0:0'
            : /x2/i.test(legSel.outcomeDesc)
              ? '2:0'
              : '0:1';
        sbMatches.set(evId, {
          ...match,
          statusCode: 3,
          matchStatus: 'Ended',
          isLive: false,
          score: loseScore,
        });
      } else {
        sbMatches.set(evId, {
          ...match,
          statusCode: 3,
          matchStatus: 'Ended',
          isLive: false,
          score: '2:2',
        });
      }
    }

    const trackingRes = await schedulerService.runResultsTrackingJob(true, undefined, 'cron');
    expect(trackingRes.unlockedBookmakers).toEqual(['SPORTYBET_TZ']);

    // Check SportyBet Ticket 0 (1 VOID + winning leg(s) => WON with void-adjusted odds)
    const settledT0 = automationStore.getTicketById(sbTicket0.internalTicketId)!;
    expect(settledT0.status).toBe('WON');
    const expectedVoidAdjustedOdds = Number(
      settledT0.selections
        .slice(1)
        .reduce((acc, s) => acc * s.odds, 1)
        .toFixed(2)
    );
    expect(settledT0.effectiveCombinedOdds).toBe(expectedVoidAdjustedOdds);

    // Check SportyBet Ticket 1 (LOST)
    const settledT1 = automationStore.getTicketById(sbTicket1.internalTicketId)!;
    expect(settledT1.status).toBe('LOST');
    expect(settledT1.unfinishedMatchCount).toBe(0);

    // Test 11: SportyBet is UNLOCKED while betPawa remains strictly LOCKED
    expect(automationStore.getFeedState('SPORTYBET_TZ').generationLocked).toBe(false);
    expect(automationStore.getFeedState('BETPAWA_TZ').generationLocked).toBe(true);

    // Re-seed fresh SportyBet matches and verify Cycle 2 is created while Cycle 1 tickets stay permanently preserved!
    const now = Date.now();
    for (let i = 10; i <= 15; i++) {
      const sbEv = `sb:match:${i}`;
      sbMatches.set(
        sbEv,
        makeMockMatch({
          bookmakerId: 'SPORTYBET_TZ',
          eventId: sbEv,
          homeTeam: `SB_Cycle2_Home_${i}`,
          awayTeam: `SB_Cycle2_Away_${i}`,
          estimateStartTime: now + (i - 8) * 3600 * 1000,
        })
      );
    }

    const cronAfterUnlock = await schedulerService.runDailyFactoryJob(false, 'vercel-cron');
    // SportyBet starts Cycle 2; betPawa is still locked and generates 0 new tickets
    expect(cronAfterUnlock.byBookmaker.SPORTYBET_TZ.ticketsGenerated).toBeGreaterThanOrEqual(1);
    expect(cronAfterUnlock.byBookmaker.BETPAWA_TZ.ticketsGenerated).toBe(0);
    expect(cronAfterUnlock.byBookmaker.BETPAWA_TZ.locked).toBe(true);

    const allSbCycles = automationStore.getFeedCycles('SPORTYBET_TZ');
    expect(allSbCycles.length).toBe(2);
    // Cycle 1 historical tickets were never deleted or overwritten
    expect(automationStore.getTicketById(sbTicket0.internalTicketId)?.status).toBe('WON');
    expect(automationStore.getTicketById(sbTicket1.internalTicketId)?.status).toBe('LOST');
  });

  it('Test 10: prevents postponed, suspended, and unverified matches from falsely settling or unlocking generation', async () => {
    const sbRun = await schedulerService.runDailyFactoryForBookmaker('SPORTYBET_TZ', {
      manualTrigger: true,
    });
    const t0 = sbRun.tickets[0];
    const [leg0, leg1] = t0.selections;

    // Postpone leg0, suspend leg1, and mark another match event as API error (verification failure)
    const m0 = sbMatches.get(leg0.eventId)!;
    sbMatches.set(leg0.eventId, {
      ...m0,
      statusCode: 6,
      matchStatus: 'Postponed',
      isLive: false,
      score: null,
    });

    if (leg1) {
      const m1 = sbMatches.get(leg1.eventId)!;
      sbMatches.set(leg1.eventId, {
        ...m1,
        statusCode: 0,
        matchStatus: 'Suspended',
        isLive: false,
        score: null,
      });
    }

    if (sbRun.tickets[1]?.selections[0]) {
      failingEvents.add(sbRun.tickets[1].selections[0].eventId);
    }

    // Settle all OTHER matches in SportyBet to Ended 2:0
    for (const [evId, match] of sbMatches.entries()) {
      if (
        evId !== leg0.eventId &&
        evId !== leg1?.eventId &&
        !failingEvents.has(evId)
      ) {
        sbMatches.set(evId, {
          ...match,
          statusCode: 3,
          matchStatus: 'Ended',
          score: '2:0',
        });
      }
    }

    await schedulerService.runResultsTrackingJob(true, undefined, 'cron', {
      targetBookmaker: 'SPORTYBET_TZ',
    });

    const refreshedT0 = automationStore.getTicketById(t0.internalTicketId)!;
    // Must never falsely mark WON or LOST
    expect(refreshedT0.status).not.toBe('WON');
    expect(refreshedT0.status).not.toBe('LOST');
    expect(refreshedT0.selectionSettlements[0].status).toBe('POSTPONED');
    if (leg1) {
      expect(refreshedT0.selectionSettlements[1].status).toBe('SUSPENDED');
    }

    const lockEval = evaluateBookmakerCycleLock({
      bookmakerId: 'SPORTYBET_TZ',
      activeCycle: automationStore.getActiveCycle('SPORTYBET_TZ'),
      cycleTickets: automationStore.getCycleTickets('SPORTYBET_TZ'),
      verificationFailures: automationStore.getVerificationFailures('SPORTYBET_TZ'),
    });
    expect(lockEval.generationLocked).toBe(true);
    expect(lockEval.unfinishedMatchesCount).toBeGreaterThan(0);
    if (failingEvents.size > 0) {
      expect(lockEval.verificationFailuresCount).toBeGreaterThan(0);
    }

    // VerifyEnded match WITHOUT score stays UNVERIFIED
    const noScoreEvaluation = evaluateTicketSettlement(
      {
        ...t0,
        status: 'PENDING',
        selectionSettlements: [],
      },
      new Map([
        [
          leg0.eventId,
          { ...m0, statusCode: 3, matchStatus: 'Ended', score: null },
        ],
      ])
    );
    expect(noScoreEvaluation.status).toBe('UNVERIFIED');
    expect(noScoreEvaluation.selectionSettlements[0].status).toBe('UNVERIFIED');
  });

  it('Test 12: blocks duplicate tickets across repeated Vercel Cron runs and idempotency keys', async () => {
    const firstCron = await schedulerService.runDailyFactoryJob(false, 'vercel-cron');
    const countAfterFirst = automationStore.getTickets().length;
    expect(countAfterFirst).toBeGreaterThanOrEqual(2);
    expect(firstCron.byBookmaker.SPORTYBET_TZ.ticketsGenerated).toBeGreaterThanOrEqual(1);
    expect(firstCron.byBookmaker.BETPAWA_TZ.ticketsGenerated).toBeGreaterThanOrEqual(1);

    // Simulate repeated Vercel Cron triggers hitting back-to-back while active cycles are locked
    const secondCron = await schedulerService.runDailyFactoryJob(false, 'vercel-cron');
    const thirdCron = await schedulerService.runDailyFactoryJob(false, 'vercel-cron');

    expect(secondCron.tickets.length).toBe(0);
    expect(thirdCron.tickets.length).toBe(0);
    expect(automationStore.getTickets().length).toBe(countAfterFirst);

    // Even direct idempotency key collision in automationStore.registerCycleAndTickets is rejected
    const sbCycle = automationStore.getActiveCycle('SPORTYBET_TZ')!;
    const sbTicket = automationStore.getTickets('SPORTYBET_TZ')[0];
    const dupAttempt = automationStore.registerCycleAndTickets({
      cycle: { ...sbCycle },
      newTickets: [sbTicket],
      generationTimestamp: new Date().toISOString(),
    });
    expect(dupAttempt.inserted.length).toBe(0);
    expect(dupAttempt.skippedReason).toContain('idempotencyKey');
  });
});
