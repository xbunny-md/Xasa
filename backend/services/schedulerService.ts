import crypto from 'crypto';
import { getBookmakerInfo, normalizeBookmakerId } from '../config/bookmakers.ts';
import { getBookmakerClient } from '../integrations/bookmakerRegistry.ts';
import type {
  AutomationJobLog,
  BookmakerId,
  DailyFactoryConfig,
  GeneratedTicket,
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
import { evaluateTicketSettlement } from './settlementService.ts';

function sleep(ms: number) {
  if (process.env.NODE_ENV === 'test') return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTerminal(status: GeneratedTicket['status']): boolean {
  return status === 'WON' || status === 'LOST' || status === 'VOID';
}

class SchedulerService {
  private factoryTimer: NodeJS.Timeout | null = null;
  private resultsTimer: NodeJS.Timeout | null = null;
  private bootTimer: NodeJS.Timeout | null = null;
  private factoryLock = false;
  private resultsLock = false;
  private readonly resultsIntervalMinutes = 10;

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
        const cfg = automationStore.getFactoryConfig();
        if (cfg.enabled && !cfg.paused) {
          const counts = this.getSectionCountsToday(cfg.timezone);
          const liveTarget = Math.max(10, cfg.liveFootballTarget ?? 12);
          const otherTarget = Math.max(10, cfg.otherSportsTarget ?? 12);
          if (
            counts.upcomingActive < Math.min(cfg.maxTickets, cfg.dailyTicketTarget) ||
            counts.liveFootballActive < liveTarget ||
            counts.otherSportsActive < otherTarget
          ) {
            void this.runDailyFactoryJob(false, null);
          }
        }
      }, 3000);
      this.bootTimer.unref?.();
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

  getDailyTicketsCountToday(tz = 'Africa/Dar_es_Salaam'): number {
    const todayKey = getDateKeyInTimezone(Date.now(), tz);
    return automationStore
      .getTickets()
      .filter((t) => t.generatedDateKey === todayKey).length;
  }

  getSectionCountsToday(tz = 'Africa/Dar_es_Salaam'): {
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
      .getTickets()
      .filter((t) => t.generatedDateKey === todayKey);

    const upcoming = todayTickets.filter((t) => (t.feedSection || 'UPCOMING') === 'UPCOMING');
    const liveFootball = todayTickets.filter((t) => t.feedSection === 'LIVE_FOOTBALL');
    const otherSports = todayTickets.filter((t) => t.feedSection === 'OTHER_SPORTS');

    return {
      totalToday: todayTickets.length,
      upcomingTotal: upcoming.length,
      upcomingActive: upcoming.filter((t) => !isTerminal(t.status)).length,
      liveFootballTotal: liveFootball.length,
      liveFootballActive: liveFootball.filter((t) => !isTerminal(t.status)).length,
      otherSportsTotal: otherSports.length,
      otherSportsActive: otherSports.filter((t) => !isTerminal(t.status)).length,
    };
  }

  getStatus(): SchedulerStatus {
    const cfg = automationStore.getFactoryConfig();
    const meta = automationStore.getTimestamps();
    const allTickets = automationStore.getTickets();
    const todayKey = getDateKeyInTimezone(Date.now(), cfg.timezone);
    const todayTickets = allTickets.filter((t) => t.generatedDateKey === todayKey);
    const counts = this.getSectionCountsToday(cfg.timezone);

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
      factoryRunning: this.factoryLock,
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
      settledWonCount: allTickets.filter((t) => t.status === 'WON').length,
      settledLostCount: allTickets.filter((t) => t.status === 'LOST').length,
      settledVoidCount: allTickets.filter((t) => t.status === 'VOID').length,
      bookingCodesGeneratedToday: todayTickets.filter(
        (t) => t.bookingCodeStatus === 'GENERATED' && Boolean(t.shareCode)
      ).length,
      bookingCodeFailuresToday: todayTickets.filter(
        (t) => t.bookingCodeStatus === 'FAILED'
      ).length,
      dailyShortfallReason: meta.dailyShortfallReason,
    };
  }

  private async revalidateAndPublishTickets(
    candidates: GeneratedTicket[],
    cfg: DailyFactoryConfig,
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

    const activeBookmaker = normalizeBookmakerId(
      candidates[0]?.bookmakerId || cfg.activeBookmaker
    );
    const client = getBookmakerClient(activeBookmaker);
    const bookmakerInfo = getBookmakerInfo(activeBookmaker);

    // Batch-fetch live match details once per distinct eventId for strict pre-publish validation
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

    const usedShareCodes = automationStore.getExistingShareCodes();

    for (const candidate of candidates) {
      const check = revalidateTicketSelectionsAgainstMatches(
        candidate.selections,
        matchLookup,
        cfg,
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
        bookmakerId: activeBookmaker,
        bookmakerName: candidate.bookmakerName || bookmakerInfo.name,
        bookmakerUrl: candidate.bookmakerUrl || bookmakerInfo.websiteUrl,
        selections: check.refreshedSelections,
        actualCombinedOdds: refreshedCombined,
        effectiveCombinedOdds: refreshedCombined,
        oddsDifference: Number((refreshedCombined - candidate.targetOdds).toFixed(2)),
        revalidatedAt,
        published: true,
      };

      if (cfg.autoCreateBookingCodes) {
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
            shareCodeVerified: booking.verified,
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

  async runDailyFactoryJob(
    manualTrigger = true,
    actorEmail: string | null = null
  ): Promise<{
    tickets: GeneratedTicket[];
    log: AutomationJobLog;
    shortfallReason: string | null;
  }> {
    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();
    const cfg = automationStore.getFactoryConfig();
    const actionType = manualTrigger ? 'MANUAL_TRIGGER' : 'AUTO_SCHEDULE';

    if (this.factoryLock) {
      const skippedLog: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
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
        message: 'Skipped overlapping Daily Factory execution (active run in progress).',
      };
      automationStore.addLog(skippedLog);
      return { tickets: [], log: skippedLog, shortfallReason: skippedLog.message };
    }

    if (!manualTrigger && (!cfg.enabled || cfg.paused)) {
      const skippedLog: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
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
          ? 'Daily Factory scheduler is paused by administrator.'
          : 'Daily Factory automation is disabled.',
      };
      return { tickets: [], log: skippedLog, shortfallReason: null };
    }

    if (!manualTrigger && !this.isWithinOperatingWindow(cfg, startedMs)) {
      const skippedLog: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
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
        message: `Outside configured ${cfg.windowStartTime}–${cfg.windowEndTime} ${cfg.timezone} window.`,
      };
      automationStore.addLog(skippedLog);
      return { tickets: [], log: skippedLog, shortfallReason: null };
    }

    const counts = this.getSectionCountsToday(cfg.timezone);
    const upcomingCap = Math.min(cfg.maxTickets, cfg.dailyTicketTarget);
    const remainingUpcoming = Math.max(0, upcomingCap - counts.upcomingActive);
    const liveTarget = Math.max(10, cfg.liveFootballTarget ?? 12);
    const otherTarget = Math.max(10, cfg.otherSportsTarget ?? 12);
    const remainingLiveFootball = Math.max(0, liveTarget - counts.liveFootballActive);
    const remainingOtherSports = Math.max(0, otherTarget - counts.otherSportsActive);

    if (remainingUpcoming <= 0 && remainingLiveFootball <= 0 && remainingOtherSports <= 0) {
      const msg = `Daily feed targets reached (${counts.upcomingActive}/${upcomingCap} upcoming active, ${counts.liveFootballActive}/${liveTarget} live football, ${counts.otherSportsActive}/${otherTarget} other sports).`;
      const log: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
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
        message: msg,
      };
      automationStore.addLog(log);
      automationStore.setFactoryRunMeta(startedAt, null);
      return { tickets: [], log, shortfallReason: null };
    }

    this.factoryLock = true;
    try {
      const todayKey = getDateKeyInTimezone(Date.now(), cfg.timezone);
      const sourceType = manualTrigger ? 'ADMIN_MANUAL' : 'DAILY_FACTORY';
      const existingSignatures = cfg.duplicatePrevention
        ? automationStore.getExistingSignatures()
        : new Set<string>();

      const allSaved: GeneratedTicket[] = [];
      let totalCodesCreated = 0;
      let totalCodeFailures = 0;
      const shortfallNotes: string[] = [];

      // 1. Upcoming Football Portfolio
      if (remainingUpcoming > 0) {
        const upcomingMatches = await fetchUpcomingMatchesForFactory(cfg);
        automationStore.setScanningAt(new Date().toISOString());
        const { eventIds: existingEventIds, teamKeys: existingTeamKeys } =
          automationStore.getExistingEventAndTeamUsage(todayKey, 'UPCOMING');

        const generated = generateDailyPortfolioFromMatches({
          matches: upcomingMatches,
          config: cfg,
          targetCount: remainingUpcoming,
          sourceType,
          feedSection: 'UPCOMING',
          existingSignatures,
          existingEventIds,
          existingTeamKeys,
          nowMs: Date.now(),
        });

        const { publishedTickets, codesCreated, codeFailures } =
          await this.revalidateAndPublishTickets(generated.tickets, cfg);
        const saved = automationStore.addTickets(publishedTickets);
        saved.forEach((t) => existingSignatures.add(t.signature));
        allSaved.push(...saved);
        totalCodesCreated += codesCreated;
        totalCodeFailures += codeFailures;
        if (generated.shortfallReason) shortfallNotes.push(`Upcoming: ${generated.shortfallReason}`);
      }

      // 2. Live Football Portfolio (10+ cards)
      if (remainingLiveFootball > 0) {
        const liveMatches = await fetchLiveFootballMatchesForFactory(cfg);
        automationStore.setScanningAt(new Date().toISOString());
        const { eventIds: liveEvIds, teamKeys: liveTeamKeys } =
          automationStore.getExistingEventAndTeamUsage(todayKey, 'LIVE_FOOTBALL');

        const generatedLive = generateDailyPortfolioFromMatches({
          matches: liveMatches,
          config: cfg,
          targetCount: remainingLiveFootball,
          sourceType,
          feedSection: 'LIVE_FOOTBALL',
          allowLive: true,
          ignoreScheduleWindow: true,
          existingSignatures,
          existingEventIds: liveEvIds,
          existingTeamKeys: liveTeamKeys,
          nowMs: Date.now(),
        });

        const { publishedTickets, codesCreated, codeFailures } =
          await this.revalidateAndPublishTickets(generatedLive.tickets, cfg, { allowLive: true });
        const saved = automationStore.addTickets(publishedTickets);
        saved.forEach((t) => existingSignatures.add(t.signature));
        allSaved.push(...saved);
        totalCodesCreated += codesCreated;
        totalCodeFailures += codeFailures;
        if (generatedLive.shortfallReason) {
          shortfallNotes.push(`Live Football: ${generatedLive.shortfallReason}`);
        }
      }

      // 3. Other Games Portfolio (Basketball, Hockey, Volleyball, Handball, Tennis, etc. - 10+ cards)
      if (remainingOtherSports > 0) {
        const otherMatches = await fetchOtherSportsMatchesForFactory(cfg);
        automationStore.setScanningAt(new Date().toISOString());
        const { eventIds: otherEvIds, teamKeys: otherTeamKeys } =
          automationStore.getExistingEventAndTeamUsage(todayKey, 'OTHER_SPORTS');

        const generatedOther = generateDailyPortfolioFromMatches({
          matches: otherMatches,
          config: cfg,
          targetCount: remainingOtherSports,
          sourceType,
          feedSection: 'OTHER_SPORTS',
          allowBothLiveAndUpcoming: true,
          ignoreScheduleWindow: true,
          skipMarketFilter: true,
          existingSignatures,
          existingEventIds: otherEvIds,
          existingTeamKeys: otherTeamKeys,
          nowMs: Date.now(),
        });

        const { publishedTickets, codesCreated, codeFailures } =
          await this.revalidateAndPublishTickets(generatedOther.tickets, cfg, {
            allowBothLiveAndUpcoming: true,
          });
        const saved = automationStore.addTickets(publishedTickets);
        allSaved.push(...saved);
        totalCodesCreated += codesCreated;
        totalCodeFailures += codeFailures;
        if (generatedOther.shortfallReason) {
          shortfallNotes.push(`Other Games: ${generatedOther.shortfallReason}`);
        }
      }

      const finishedAt = new Date().toISOString();
      const combinedShortfall = shortfallNotes.length > 0 ? shortfallNotes.join(' ') : null;
      automationStore.setFactoryRunMeta(finishedAt, combinedShortfall);

      const upCount = allSaved.filter((t) => (t.feedSection || 'UPCOMING') === 'UPCOMING').length;
      const lfCount = allSaved.filter((t) => t.feedSection === 'LIVE_FOOTBALL').length;
      const osCount = allSaved.filter((t) => t.feedSection === 'OTHER_SPORTS').length;

      const log: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        actionType,
        jobType: 'DAILY_FACTORY',
        status: combinedShortfall && allSaved.length === 0 ? 'PARTIAL' : combinedShortfall ? 'PARTIAL' : 'SUCCESS',
        actorEmail,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        ticketsGenerated: allSaved.length,
        codesCreated: totalCodesCreated,
        codeFailures: totalCodeFailures,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: `Published ${allSaved.length} card(s) (${upCount} upcoming, ${lfCount} live football, ${osCount} other games; ${totalCodesCreated} genuine booking codes, ${totalCodeFailures} failures).${
          combinedShortfall ? ` ${combinedShortfall}` : ''
        }`,
      };
      automationStore.addLog(log);
      return { tickets: allSaved, log, shortfallReason: combinedShortfall };
    } catch (err) {
      const finishedAt = new Date().toISOString();
      const errMsg = err instanceof Error ? err.message : 'Daily Factory job failed';
      const log: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
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
        message: errMsg,
      };
      automationStore.addLog(log);
      return { tickets: [], log, shortfallReason: errMsg };
    } finally {
      this.factoryLock = false;
    }
  }

  /**
   * Automatically creates fresh replacement codes whenever existing codes finish (WON / LOST / VOID),
   * preserving settled tickets in the feed untouched.
   */
  async replenishAfterSettlement(params: {
    settledUpcomingTickets: GeneratedTicket[];
    settledLiveFootball: number;
    settledOtherSports: number;
    cfg: DailyFactoryConfig;
    actorEmail: string | null;
  }): Promise<GeneratedTicket[]> {
    const { settledUpcomingTickets, settledLiveFootball, settledOtherSports, cfg, actorEmail } =
      params;
    if (cfg.autoReplenishOnSettle === false) return [];
    if (this.factoryLock) return [];

    const liveTarget = Math.max(10, cfg.liveFootballTarget ?? 12);
    const otherTarget = Math.max(10, cfg.otherSportsTarget ?? 12);
    const counts = this.getSectionCountsToday(cfg.timezone);

    const upcomingNeed = settledUpcomingTickets.length;
    const liveNeed =
      settledLiveFootball > 0 ? Math.max(0, liveTarget - counts.liveFootballActive) : 0;
    const otherNeed =
      settledOtherSports > 0 ? Math.max(0, otherTarget - counts.otherSportsActive) : 0;

    if (upcomingNeed <= 0 && liveNeed <= 0 && otherNeed <= 0) {
      return [];
    }

    this.factoryLock = true;
    const replenished: GeneratedTicket[] = [];
    try {
      const todayKey = getDateKeyInTimezone(Date.now(), cfg.timezone);
      const existingSignatures = cfg.duplicatePrevention
        ? automationStore.getExistingSignatures()
        : new Set<string>();

      if (upcomingNeed > 0) {
        const upcomingMatches = await fetchUpcomingMatchesForFactory(cfg);
        const { eventIds, teamKeys } = automationStore.getExistingEventAndTeamUsage(
          todayKey,
          'UPCOMING'
        );
        const generated = generateDailyPortfolioFromMatches({
          matches: upcomingMatches,
          config: cfg,
          targetCount: upcomingNeed,
          sourceType: 'DAILY_FACTORY',
          feedSection: 'UPCOMING',
          replacedTicketId: settledUpcomingTickets[0]?.internalTicketId || null,
          existingSignatures,
          existingEventIds: eventIds,
          existingTeamKeys: teamKeys,
          nowMs: Date.now(),
        });

        // Tag each 1-to-1 replacement with its ended ancestor ID when matching count
        const tagged = generated.tickets.map((t, idx) => ({
          ...t,
          replacedTicketId:
            settledUpcomingTickets[idx]?.internalTicketId ||
            settledUpcomingTickets[0]?.internalTicketId ||
            null,
        }));

        const { publishedTickets } = await this.revalidateAndPublishTickets(tagged, cfg);
        const saved = automationStore.addTickets(publishedTickets);
        saved.forEach((t) => existingSignatures.add(t.signature));
        replenished.push(...saved);
      }

      if (liveNeed > 0) {
        const liveMatches = await fetchLiveFootballMatchesForFactory(cfg);
        const { eventIds, teamKeys } = automationStore.getExistingEventAndTeamUsage(
          todayKey,
          'LIVE_FOOTBALL'
        );
        const generatedLive = generateDailyPortfolioFromMatches({
          matches: liveMatches,
          config: cfg,
          targetCount: liveNeed,
          sourceType: 'DAILY_FACTORY',
          feedSection: 'LIVE_FOOTBALL',
          allowLive: true,
          ignoreScheduleWindow: true,
          existingSignatures,
          existingEventIds: eventIds,
          existingTeamKeys: teamKeys,
          nowMs: Date.now(),
        });
        const { publishedTickets } = await this.revalidateAndPublishTickets(
          generatedLive.tickets,
          cfg,
          { allowLive: true }
        );
        const saved = automationStore.addTickets(publishedTickets);
        saved.forEach((t) => existingSignatures.add(t.signature));
        replenished.push(...saved);
      }

      if (otherNeed > 0) {
        const otherMatches = await fetchOtherSportsMatchesForFactory(cfg);
        const { eventIds, teamKeys } = automationStore.getExistingEventAndTeamUsage(
          todayKey,
          'OTHER_SPORTS'
        );
        const generatedOther = generateDailyPortfolioFromMatches({
          matches: otherMatches,
          config: cfg,
          targetCount: otherNeed,
          sourceType: 'DAILY_FACTORY',
          feedSection: 'OTHER_SPORTS',
          allowBothLiveAndUpcoming: true,
          ignoreScheduleWindow: true,
          skipMarketFilter: true,
          existingSignatures,
          existingEventIds: eventIds,
          existingTeamKeys: teamKeys,
          nowMs: Date.now(),
        });
        const { publishedTickets } = await this.revalidateAndPublishTickets(
          generatedOther.tickets,
          cfg,
          { allowBothLiveAndUpcoming: true }
        );
        const saved = automationStore.addTickets(publishedTickets);
        replenished.push(...saved);
      }

      if (replenished.length > 0) {
        const nowIso = new Date().toISOString();
        automationStore.addLog({
          logId: `log_${crypto.randomBytes(4).toString('hex')}`,
          actionType: 'AUTO_SCHEDULE',
          jobType: 'DAILY_FACTORY',
          status: 'SUCCESS',
          actorEmail,
          startedAt: nowIso,
          finishedAt: nowIso,
          durationMs: 0,
          ticketsGenerated: replenished.length,
          codesCreated: replenished.filter((t) => t.bookingCodeStatus === 'GENERATED').length,
          codeFailures: replenished.filter((t) => t.bookingCodeStatus === 'FAILED').length,
          ticketsChecked: 0,
          ticketsSettled: 0,
          message: `Auto-generated ${replenished.length} replacement code(s) after active daily codes settled.`,
        });
      }
      return replenished;
    } catch {
      return replenished;
    } finally {
      this.factoryLock = false;
    }
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
        !isTerminal(t.status) &&
        (!t.shareCode || t.bookingCodeStatus === 'FAILED' || t.bookingCodeStatus === 'NOT_REQUESTED')
      );
    });

    let codesCreated = 0;
    let codeFailures = 0;
    const usedShareCodes = automationStore.getExistingShareCodes();

    for (const ticket of targets) {
      const ticketBookmaker = normalizeBookmakerId(ticket.bookmakerId);
      const client = getBookmakerClient(ticketBookmaker);
      const bookmakerInfo = getBookmakerInfo(ticketBookmaker);

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
        usedShareCodes.add(cleanCode);
        automationStore.updateTicketMutableFields({
          ...ticket,
          shareCode: booking.shareCode,
          shareUrl: booking.shareUrl,
          shareCodeDeadline: booking.deadline,
          shareCodeVerified: booking.verified,
          bookingCodeStatus: 'GENERATED',
          bookingCodeError: null,
          lastCheckedAt: new Date().toISOString(),
        });
        codesCreated++;
        await sleep(80);
      } catch (err) {
        codeFailures++;
        automationStore.updateTicketMutableFields({
          ...ticket,
          bookingCodeStatus: 'FAILED',
          bookingCodeError:
            err instanceof Error
              ? err.message
              : `${bookmakerInfo.shortName} booking code API failed`,
          lastCheckedAt: new Date().toISOString(),
        });
      }
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

  async runResultsTrackingJob(
    manualTrigger = true,
    ticketIds?: string[],
    actorEmail: string | null = null
  ): Promise<{
    updatedTickets: GeneratedTicket[];
    replenishedTickets: GeneratedTicket[];
    log: AutomationJobLog;
  }> {
    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();

    if (this.resultsLock) {
      const skippedLog: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        actionType: 'RESULTS_CHECK',
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
      return { updatedTickets: [], replenishedTickets: [], log: skippedLog };
    }

    this.resultsLock = true;
    try {
      const cfg = automationStore.getFactoryConfig();
      const allTickets = automationStore.getTickets();
      const targetTickets = allTickets.filter((t) => {
        if (ticketIds && ticketIds.length > 0 && !ticketIds.includes(t.internalTicketId)) {
          return false;
        }
        return !isTerminal(t.status);
      });

      if (targetTickets.length === 0) {
        const finishedAt = new Date().toISOString();
        automationStore.setResultsRunAt(finishedAt);
        const log: AutomationJobLog = {
          logId: `log_${crypto.randomBytes(4).toString('hex')}`,
          actionType: 'RESULTS_CHECK',
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
          message: 'No active pending or live tickets require settlement verification.',
        };
        if (manualTrigger) automationStore.addLog(log);
        return { updatedTickets: [], replenishedTickets: [], log };
      }

      // Group active tickets by originating bookmaker so matches are queried strictly against each ticket's own platform
      const ticketsByBookmaker = new Map<BookmakerId, GeneratedTicket[]>();
      for (const ticket of targetTickets) {
        const bk = normalizeBookmakerId(ticket.bookmakerId);
        const arr = ticketsByBookmaker.get(bk) || [];
        arr.push(ticket);
        ticketsByBookmaker.set(bk, arr);
      }

      const updatedTickets: GeneratedTicket[] = [];
      const newlySettledUpcoming: GeneratedTicket[] = [];
      let settledLiveFootball = 0;
      let settledOtherSports = 0;
      let settledCount = 0;
      let totalUniqueEvents = 0;

      for (const [bkId, bkTickets] of ticketsByBookmaker.entries()) {
        const client = getBookmakerClient(bkId);
        const bkEventIds = Array.from(
          new Set(bkTickets.flatMap((t) => t.selections.map((s) => s.eventId)))
        );
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
              } catch {
                matchLookup.set(eventId, null);
              }
            })
          );
        }

        for (const ticket of bkTickets) {
          const evaluated = evaluateTicketSettlement(ticket, matchLookup, Date.now());
          const reachedTerminal = isTerminal(evaluated.status);
          if (reachedTerminal) {
            settledCount++;
          }
          const saved = automationStore.updateTicketMutableFields(evaluated);
          if (saved) {
            updatedTickets.push(saved);
            if (reachedTerminal) {
              const sec = saved.feedSection || 'UPCOMING';
              if (sec === 'LIVE_FOOTBALL') {
                settledLiveFootball++;
              } else if (sec === 'OTHER_SPORTS') {
                settledOtherSports++;
              } else {
                newlySettledUpcoming.push(saved);
              }
            }
          }
        }
      }

      // Auto-replenish new codes when active codes finish (WON / LOST / VOID)
      let replenishedTickets: GeneratedTicket[] = [];
      if (settledCount > 0 && cfg.autoReplenishOnSettle !== false) {
        replenishedTickets = await this.replenishAfterSettlement({
          settledUpcomingTickets: newlySettledUpcoming,
          settledLiveFootball,
          settledOtherSports,
          cfg,
          actorEmail,
        });
      }

      const finishedAt = new Date().toISOString();
      automationStore.setResultsRunAt(finishedAt);

      const log: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        actionType: 'RESULTS_CHECK',
        jobType: 'RESULTS_TRACKER',
        status: 'SUCCESS',
        actorEmail,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        ticketsGenerated: replenishedTickets.length,
        codesCreated: replenishedTickets.filter((t) => t.bookingCodeStatus === 'GENERATED').length,
        codeFailures: replenishedTickets.filter((t) => t.bookingCodeStatus === 'FAILED').length,
        ticketsChecked: updatedTickets.length,
        ticketsSettled: settledCount,
        message: `Checked ${updatedTickets.length} active ticket(s) across ${totalUniqueEvents} event(s); settled ${settledCount}.${
          replenishedTickets.length > 0
            ? ` Auto-generated ${replenishedTickets.length} fresh replacement code(s).`
            : ''
        }`,
      };
      automationStore.addLog(log);
      return { updatedTickets, replenishedTickets, log };
    } catch (err) {
      const finishedAt = new Date().toISOString();
      const errMsg = err instanceof Error ? err.message : 'Results tracking failed';
      const log: AutomationJobLog = {
        logId: `log_${crypto.randomBytes(4).toString('hex')}`,
        actionType: 'RESULTS_CHECK',
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
      return { updatedTickets: [], replenishedTickets: [], log };
    } finally {
      this.resultsLock = false;
    }
  }
}

export const schedulerService = new SchedulerService();
