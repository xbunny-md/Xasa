import { FieldValue } from 'firebase-admin/firestore';
import type {
  AutomationJobLog,
  BookmakerFeedState,
  BookmakerId,
  GeneratedTicket,
  GenerationCycle,
  MatchResultRecord,
} from '../../src/types/sportybet.ts';
import { computeTicketMatchProgress } from '../services/settlementService.ts';
import { getAdminFirestoreIfConfigured } from './admin.ts';

function sanitizeId(id: string): string {
  return String(id || '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 120);
}

/**
 * Credential-gated Firebase Admin Firestore Bridge.
 * - On Starter Tier AI Studio preview (no IAM credentials): safely returns null/false with zero errors.
 * - On Vercel Serverless with service account credentials: executes atomic Firestore transactions
 *   so background cron jobs persist permanent cycles, tickets, match results, and settlements
 *   even when no browser client is open.
 */
class FirebaseAdminBridge {
  isConfigured(): boolean {
    return getAdminFirestoreIfConfigured() !== null;
  }

  /**
   * Atomically creates a new generation cycle document + immutable ticket records in Firestore
   * if and only if no matching idempotencyKey or overlapping ACTIVE cycle exists.
   */
  async commitGenerationCycleTransaction(params: {
    cycle: GenerationCycle;
    tickets: GeneratedTicket[];
    feedState: BookmakerFeedState;
    actorUid?: string;
    dailyTicketTarget: number;
  }): Promise<{ committed: boolean; skippedReason?: string }> {
    const db = getAdminFirestoreIfConfigured();
    if (!db) return { committed: false };

    const { cycle, tickets, feedState, actorUid = 'system_cron', dailyTicketTarget } = params;
    const bookmakerStateRef = db.collection('bookmakerFeedStates').doc(cycle.bookmakerId);
    const cycleRef = db.collection('feedCycles').doc(sanitizeId(cycle.cycleId));

    try {
      const outcome = await db.runTransaction(async (tx) => {
        const stateSnap = await tx.get(bookmakerStateRef);
        if (stateSnap.exists) {
          const currentState = stateSnap.data() as Partial<BookmakerFeedState>;
          if (currentState.generationLocked === true || currentState.lockStatus === 'LOCKED') {
            return {
              committed: false,
              skippedReason:
                currentState.lockReason ||
                `Bookmaker ${cycle.bookmakerId} feed is locked in Firestore.`,
            };
          }
        }

        const existingCycleSnap = await tx.get(cycleRef);
        if (existingCycleSnap.exists) {
          return {
            committed: false,
            skippedReason: `Cycle ${cycle.cycleId} already exists (idempotency enforced).`,
          };
        }

        tx.set(cycleRef, {
          isPublic: true,
          cycleId: cycle.cycleId,
          idempotencyKey: cycle.idempotencyKey,
          bookmakerId: cycle.bookmakerId,
          dateKey: cycle.dateKey,
          status: cycle.status,
          generationLocked: cycle.generationLocked,
          ticketIds: cycle.ticketIds.slice(0, 200),
          ticketCount: cycle.ticketCount,
          totalMatches: cycle.totalMatches,
          finishedMatches: cycle.finishedMatches,
          unfinishedMatches: cycle.unfinishedMatches,
          wonTickets: cycle.wonTickets,
          lostTickets: cycle.lostTickets,
          voidTickets: cycle.voidTickets,
          settledAt: cycle.settledAt || '',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        for (const t of tickets) {
          const docId = sanitizeId(t.internalTicketId);
          const pubRef = db.collection('publicTickets').doc(docId);
          const updRef = db.collection('publicTicketUpdates').doc(docId);
          const progress = computeTicketMatchProgress(t);

          tx.create(pubRef, {
            isPublic: true,
            publishedByUid: actorUid,
            internalTicketId: t.internalTicketId,
            signature: t.signature,
            bookmakerId: t.bookmakerId || cycle.bookmakerId,
            cycleId: cycle.cycleId,
            idempotencyKey: t.idempotencyKey || cycle.idempotencyKey,
            feedSection: t.feedSection || 'UPCOMING',
            sportId: t.sportId || 'sr:sport:1',
            sportName: t.sportName || 'Football',
            replacedTicketId: t.replacedTicketId || '',
            sourceType: t.sourceType,
            categoryId: t.categoryId,
            categoryLabel: t.categoryLabel,
            targetOdds: t.targetOdds,
            actualCombinedOdds: t.actualCombinedOdds,
            selectionCount: t.selectionCount,
            kickoffStartMs: t.kickoffStartMs,
            kickoffEndMs: t.kickoffEndMs,
            dataSource: t.dataSource,
            generatedDateKey: t.generatedDateKey,
            originalSelections: t.selections,
            createdAt: FieldValue.serverTimestamp(),
          });

          tx.create(updRef, {
            isPublic: true,
            internalTicketId: t.internalTicketId,
            bookmakerId: t.bookmakerId || cycle.bookmakerId,
            cycleId: cycle.cycleId,
            status: t.status,
            effectiveCombinedOdds: t.effectiveCombinedOdds,
            settledMatchCount: progress.settledMatchCount,
            totalMatchCount: progress.totalMatchCount,
            unfinishedMatchCount: progress.unfinishedMatchCount,
            shareCode: t.shareCode || '',
            shareUrl: t.shareUrl || '',
            shareCodeVerified: Boolean(t.shareCodeVerified),
            bookingCodeStatus: t.bookingCodeStatus,
            bookingCodeError: t.bookingCodeError || '',
            selectionSettlements: t.selectionSettlements,
            settledAt: t.settledAt || '',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        tx.set(bookmakerStateRef, {
          isPublic: true,
          ...feedState,
          activeCycleId: feedState.activeCycleId || '',
          lastGenerationAt: feedState.lastGenerationAt || '',
          lastResultCheckAt: feedState.lastResultCheckAt || '',
          lastUnlockedAt: feedState.lastUnlockedAt || '',
          updatedAt: FieldValue.serverTimestamp(),
        });

        const statRef = db.collection('publicStats').doc(`daily_${cycle.bookmakerId}`);
        tx.set(statRef, {
          isPublic: true,
          bookmakerId: cycle.bookmakerId,
          activeCycleId: cycle.cycleId,
          generationLocked: feedState.generationLocked,
          lockStatus: feedState.lockStatus,
          lockReason: feedState.lockReason,
          dailyTicketTarget,
          totalGeneratedToday: tickets.length,
          bookingCodesGeneratedToday: tickets.filter(
            (t) => t.bookingCodeStatus === 'GENERATED' && Boolean(t.shareCode)
          ).length,
          unfinishedMatchesCount: feedState.unfinishedMatchesCount,
          unsettledTicketsCount: feedState.unsettledTicketsCount,
          settledWonCount: 0,
          settledLostCount: 0,
          settledVoidCount: 0,
          lastScanningAt: feedState.lastGenerationAt || '',
          lastSettlementAt: feedState.lastResultCheckAt || '',
          updatedAt: FieldValue.serverTimestamp(),
        });

        return { committed: true };
      });

      return outcome;
    } catch (err) {
      console.error('Firestore cycle transaction error:', err);
      return {
        committed: false,
        skippedReason: err instanceof Error ? err.message : 'Firestore transaction failed',
      };
    }
  }

  async syncSettlementState(params: {
    updatedTickets: GeneratedTicket[];
    matchResults: MatchResultRecord[];
    cycles: GenerationCycle[];
    feedStates: Record<BookmakerId, BookmakerFeedState>;
    log?: AutomationJobLog;
  }): Promise<void> {
    const db = getAdminFirestoreIfConfigured();
    if (!db) return;

    try {
      const batch = db.batch();

      for (const t of params.updatedTickets.slice(0, 150)) {
        const docId = sanitizeId(t.internalTicketId);
        const updRef = db.collection('publicTicketUpdates').doc(docId);
        const progress = computeTicketMatchProgress(t);
        batch.set(
          updRef,
          {
            isPublic: true,
            internalTicketId: t.internalTicketId,
            bookmakerId: t.bookmakerId || 'SPORTYBET_TZ',
            cycleId: t.cycleId || '',
            status: t.status,
            effectiveCombinedOdds: t.effectiveCombinedOdds,
            settledMatchCount: progress.settledMatchCount,
            totalMatchCount: progress.totalMatchCount,
            unfinishedMatchCount: progress.unfinishedMatchCount,
            shareCode: t.shareCode || '',
            shareUrl: t.shareUrl || '',
            shareCodeVerified: Boolean(t.shareCodeVerified),
            bookingCodeStatus: t.bookingCodeStatus,
            bookingCodeError: t.bookingCodeError || '',
            selectionSettlements: t.selectionSettlements,
            settledAt: t.settledAt || '',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      for (const mr of params.matchResults.slice(0, 120)) {
        const ref = db.collection('matchResults').doc(sanitizeId(mr.resultId));
        batch.set(ref, {
          isPublic: true,
          ...mr,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      for (const c of params.cycles.slice(0, 20)) {
        const ref = db.collection('feedCycles').doc(sanitizeId(c.cycleId));
        batch.set(
          ref,
          {
            isPublic: true,
            status: c.status,
            generationLocked: c.generationLocked,
            finishedMatches: c.finishedMatches,
            unfinishedMatches: c.unfinishedMatches,
            wonTickets: c.wonTickets,
            lostTickets: c.lostTickets,
            voidTickets: c.voidTickets,
            settledAt: c.settledAt || '',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      for (const bk of Object.values(params.feedStates)) {
        const ref = db.collection('bookmakerFeedStates').doc(bk.bookmakerId);
        batch.set(ref, {
          isPublic: true,
          ...bk,
          activeCycleId: bk.activeCycleId || '',
          lastGenerationAt: bk.lastGenerationAt || '',
          lastResultCheckAt: bk.lastResultCheckAt || '',
          lastUnlockedAt: bk.lastUnlockedAt || '',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      if (params.log) {
        const logRef = db.collection('adminAuditLogs').doc(sanitizeId(params.log.logId));
        batch.set(logRef, {
          scope: 'ADMIN_AUDIT',
          actorUid: 'system_cron',
          actorEmail: params.log.actorEmail || 'vercel-cron@system.local',
          actionType: params.log.actionType,
          status: params.log.status,
          ticketsGenerated: params.log.ticketsGenerated,
          codesCreated: params.log.codesCreated,
          message: params.log.message.slice(0, 400),
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (err) {
      console.error('Firestore settlement sync error:', err);
    }
  }

  /**
   * Loads existing cycles, tickets, and match results from Firestore on cold start if Admin credentials exist.
   */
  async loadPersistedStateFromFirestore(): Promise<{
    tickets: GeneratedTicket[];
    cycles: GenerationCycle[];
    feedStates: Partial<Record<BookmakerId, BookmakerFeedState>>;
    matchResults: MatchResultRecord[];
  } | null> {
    const db = getAdminFirestoreIfConfigured();
    if (!db) return null;

    try {
      const [pubSnap, updSnap, cyclesSnap, statesSnap, resultsSnap] = await Promise.all([
        db.collection('publicTickets').limit(400).get(),
        db.collection('publicTicketUpdates').limit(400).get(),
        db.collection('feedCycles').limit(60).get(),
        db.collection('bookmakerFeedStates').get(),
        db.collection('matchResults').limit(200).get(),
      ]);

      const updatesMap = new Map<string, Record<string, unknown>>();
      updSnap.forEach((doc) => {
        updatesMap.set(doc.id, doc.data() as Record<string, unknown>);
      });

      const tickets: GeneratedTicket[] = [];
      pubSnap.forEach((doc) => {
        const raw = doc.data() as Record<string, unknown>;
        const upd = updatesMap.get(doc.id) || {};
        const selections = Array.isArray(raw.originalSelections)
          ? (raw.originalSelections as GeneratedTicket['selections'])
          : [];
        const createdTs = raw.createdAt as { toMillis?: () => number } | undefined;
        const createdMs = typeof createdTs?.toMillis === 'function' ? createdTs.toMillis() : Date.now();
        const generatedAt = new Date(createdMs).toISOString();
        const actualCombinedOdds = Number(raw.actualCombinedOdds || 1);

        tickets.push({
          internalTicketId: String(raw.internalTicketId || doc.id),
          signature: String(raw.signature || doc.id),
          bookmakerId: (raw.bookmakerId as BookmakerId) || 'SPORTYBET_TZ',
          bookmakerName:
            raw.bookmakerId === 'BETPAWA_TZ' ? 'betPawa Tanzania' : 'SportyBet Tanzania',
          cycleId: raw.cycleId ? String(raw.cycleId) : undefined,
          idempotencyKey: raw.idempotencyKey ? String(raw.idempotencyKey) : undefined,
          feedSection: (raw.feedSection as GeneratedTicket['feedSection']) || 'UPCOMING',
          sportId: String(raw.sportId || 'sr:sport:1'),
          sportName: String(raw.sportName || 'Football'),
          replacedTicketId: raw.replacedTicketId ? String(raw.replacedTicketId) : null,
          sourceType: (raw.sourceType as GeneratedTicket['sourceType']) || 'DAILY_FACTORY',
          categoryId: String(raw.categoryId || 'custom'),
          categoryLabel: String(raw.categoryLabel || 'Custom'),
          targetOdds: Number(raw.targetOdds || actualCombinedOdds),
          actualCombinedOdds,
          oddsDifference: Number((actualCombinedOdds - Number(raw.targetOdds || actualCombinedOdds)).toFixed(2)),
          selectionCount: Number(raw.selectionCount || selections.length),
          selections,
          kickoffStartMs: Number(raw.kickoffStartMs || 0),
          kickoffEndMs: Number(raw.kickoffEndMs || 0),
          dataSource: String(raw.dataSource || ''),
          generatedAt,
          generatedDateKey: String(raw.generatedDateKey || generatedAt.slice(0, 10)),
          published: true,
          revalidatedAt: generatedAt,
          status: (upd.status as GeneratedTicket['status']) || 'PENDING',
          effectiveCombinedOdds: Number(upd.effectiveCombinedOdds || actualCombinedOdds),
          settledMatchCount:
            typeof upd.settledMatchCount === 'number' ? upd.settledMatchCount : undefined,
          totalMatchCount:
            typeof upd.totalMatchCount === 'number' ? upd.totalMatchCount : undefined,
          unfinishedMatchCount:
            typeof upd.unfinishedMatchCount === 'number' ? upd.unfinishedMatchCount : undefined,
          selectionSettlements: Array.isArray(upd.selectionSettlements)
            ? (upd.selectionSettlements as GeneratedTicket['selectionSettlements'])
            : [],
          shareCode: upd.shareCode ? String(upd.shareCode) : null,
          shareUrl: upd.shareUrl ? String(upd.shareUrl) : null,
          shareCodeDeadline: null,
          shareCodeVerified: Boolean(upd.shareCodeVerified),
          bookingCodeStatus: (upd.bookingCodeStatus as GeneratedTicket['bookingCodeStatus']) || 'NOT_REQUESTED',
          bookingCodeError: upd.bookingCodeError ? String(upd.bookingCodeError) : null,
          settledAt: upd.settledAt ? String(upd.settledAt) : null,
          lastCheckedAt: null,
        });
      });

      const cycles: GenerationCycle[] = [];
      cyclesSnap.forEach((doc) => {
        const d = doc.data() as Record<string, unknown>;
        cycles.push({
          cycleId: String(d.cycleId || doc.id),
          idempotencyKey: String(d.idempotencyKey || doc.id),
          bookmakerId: (d.bookmakerId as BookmakerId) || 'SPORTYBET_TZ',
          dateKey: String(d.dateKey || ''),
          status: (d.status as GenerationCycle['status']) || 'ACTIVE',
          generationLocked: Boolean(d.generationLocked),
          ticketIds: Array.isArray(d.ticketIds) ? (d.ticketIds as string[]) : [],
          ticketCount: Number(d.ticketCount || 0),
          totalMatches: Number(d.totalMatches || 0),
          finishedMatches: Number(d.finishedMatches || 0),
          unfinishedMatches: Number(d.unfinishedMatches || 0),
          wonTickets: Number(d.wonTickets || 0),
          lostTickets: Number(d.lostTickets || 0),
          voidTickets: Number(d.voidTickets || 0),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settledAt: d.settledAt ? String(d.settledAt) : null,
        });
      });

      const feedStates: Partial<Record<BookmakerId, BookmakerFeedState>> = {};
      statesSnap.forEach((doc) => {
        const d = doc.data() as BookmakerFeedState;
        if (d.bookmakerId === 'SPORTYBET_TZ' || d.bookmakerId === 'BETPAWA_TZ') {
          feedStates[d.bookmakerId] = {
            ...d,
            activeCycleId: d.activeCycleId || null,
            lastGenerationAt: d.lastGenerationAt || null,
            lastResultCheckAt: d.lastResultCheckAt || null,
            lastUnlockedAt: d.lastUnlockedAt || null,
          };
        }
      });

      const matchResults: MatchResultRecord[] = [];
      resultsSnap.forEach((doc) => {
        const d = doc.data() as MatchResultRecord;
        matchResults.push(d);
      });

      return { tickets, cycles, feedStates, matchResults };
    } catch (err) {
      console.error('Failed to hydrate state from Firestore:', err);
      return null;
    }
  }
}

export const firebaseAdminBridge = new FirebaseAdminBridge();
