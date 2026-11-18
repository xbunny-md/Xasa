import { beforeEach, describe, expect, it, vi } from 'vitest';

const setDocMock = vi.fn().mockResolvedValue(undefined);
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const deleteDocMock = vi.fn().mockResolvedValue(undefined);
const getDocMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...segments: string[]) => segments.join('/')),
  doc: vi.fn((_db, ...segments: string[]) => segments.join('/')),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  getDocFromServer: vi.fn().mockResolvedValue({ exists: () => false }),
  getFirestore: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      uid: 'user_abc_123',
      email: 'analyst@example.com',
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerData: [{ providerId: 'google.com', email: 'analyst@example.com' }],
    },
  })),
  GoogleAuthProvider: vi.fn(),
}));

import { handleFirestoreError, OperationType } from '../src/firebase/firestore/errors.ts';
import {
  ensureUserProfile,
  mapPublicDocsToGeneratedTickets,
  saveBookingCodeRecord,
  saveFavoriteItem,
  saveFilterPreset,
  saveScanHistoryRecord,
  syncPublicTicketBundle,
  updateUserPreferences,
  updateUserSettings,
} from '../src/firebase/firestore/repository.ts';

describe('Firebase Authentication & Firestore Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a bounded UserProfile document on initial Google sign-in with default theme and bookmaker', async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false });

    await ensureUserProfile({
      uid: 'user_abc_123',
      displayName: 'Amina Hassan',
      email: 'amina@example.com',
    });

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = setDocMock.mock.calls[0];
    expect(payload.uid).toBe('user_abc_123');
    expect(payload.defaultMinOdds).toBe(1.01);
    expect(payload.defaultMaxOdds).toBe(1.25);
    expect(payload.themePreference).toBe('dark');
    expect(payload.preferredBookmaker).toBe('SPORTYBET_TZ');
    expect(payload.createdAt).toBe('SERVER_TIMESTAMP');
    expect(payload.updatedAt).toBe('SERVER_TIMESTAMP');
  });

  it('persists light/dark themePreference and preferredBookmaker via updateUserPreferences', async () => {
    await updateUserPreferences('user_abc_123', {
      themePreference: 'light',
      preferredBookmaker: 'BETPAWA_TZ',
    });

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.themePreference).toBe('light');
    expect(payload.preferredBookmaker).toBe('BETPAWA_TZ');
    expect(payload.updatedAt).toBe('SERVER_TIMESTAMP');
  });

  it('clamps user settings updates to valid blueprint bounds', async () => {
    await updateUserSettings('user_abc_123', {
      displayName: 'Analyst Pro',
      defaultMinOdds: 0.5, // below 1.01 bound
      defaultMaxOdds: 1.2,
      defaultStakeTzs: -500, // negative
      autoScanIntervalSec: 99999, // above 3600
    });

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.defaultMinOdds).toBe(1.01);
    expect(payload.defaultStakeTzs).toBe(0);
    expect(payload.autoScanIntervalSec).toBe(3600);
    expect(payload.updatedAt).toBe('SERVER_TIMESTAMP');
  });

  it('persists scan history bounded to <= 25 preview records', async () => {
    const fakeResults = Array.from({ length: 40 }, (_, i) => ({
      selectionKey: `k${i}`,
      eventId: `sr:match:${i}`,
      homeTeam: 'Home',
      awayTeam: 'Away',
      leagueId: 'sr:tournament:1',
      leagueName: 'League',
      country: 'TZ',
      estimateStartTime: Date.now() + 3600000,
      kickoffIso: new Date().toISOString(),
      matchStatus: 'Not start',
      isLive: false,
      marketId: '10',
      marketName: 'Double Chance',
      specifier: '',
      outcomeId: '9',
      outcomeDesc: 'Home or Draw',
      odds: 1.25,
      probability: 0.75,
      dataSource: 'SportyBet TZ',
      retrievedAt: new Date().toISOString(),
    }));

    await saveScanHistoryRecord('user_abc_123', {
      scanId: 's1',
      scannedAt: new Date().toISOString(),
      dataSource: 'SportyBet TZ',
      status: 'COMPLETED',
      totalMatchesScanned: 200,
      qualifyingCount: 40,
      results: fakeResults,
      appliedConfig: {
        minOdds: 1.1,
        maxOdds: 1.5,
        startDate: '2026-11-18',
        endDate: '2026-11-30',
        sportId: 'sr:sport:1',
        leagues: [],
        matchStatus: 'ALL',
        markets: ['10'],
        maxResults: 100,
      },
      warnings: [],
    });

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = setDocMock.mock.calls[0];
    expect(payload.resultsPreview).toHaveLength(25);
    expect(payload.userId).toBe('user_abc_123');
  });

  it('persists verified booking codes, presets, and favorites cleanly', async () => {
    await saveBookingCodeRecord(
      'user_abc_123',
      {
        shareCode: '5DBMUG',
        shareUrl: 'https://www.sportybet.com/tz/?shareCode=5DBMUG',
        deadline: Date.now() + 86400000,
        createdAt: new Date().toISOString(),
        selectionCount: 1,
        combinedOdds: 1.35,
        verified: true,
        selections: [
          {
            selectionKey: 'e1::10::::9',
            eventId: 'e1',
            homeTeam: 'Simba',
            awayTeam: 'Azam',
            leagueName: 'Ligi Kuu',
            country: 'Tanzania',
            estimateStartTime: Date.now() + 86400000,
            matchStatus: 'Not start',
            isLive: false,
            marketId: '10',
            marketName: 'Double Chance',
            specifier: '',
            outcomeId: '9',
            outcomeDesc: 'Home or Draw',
            odds: 1.35,
            addedAt: new Date().toISOString(),
          },
        ],
      },
      10000
    );

    await saveFilterPreset('user_abc_123', {
      name: 'Low Risk DC',
      minOdds: 1.1,
      maxOdds: 1.4,
      markets: ['10'],
      leagues: [],
      matchStatus: 'UPCOMING',
      maxResults: 50,
    });

    await saveFavoriteItem('user_abc_123', {
      kind: 'TEAM',
      refId: 'simba',
      label: 'Simba SC',
      country: 'Tanzania',
    });

    expect(setDocMock).toHaveBeenCalledTimes(3);
  });

  it('mirrors immutable publicTickets with feedSection/sport metadata and locks settled updates', async () => {
    getDocMock
      .mockResolvedValueOnce({ exists: () => false }) // publicTickets does not exist yet
      .mockResolvedValueOnce({ exists: () => false }); // publicTicketUpdates does not exist yet

    await syncPublicTicketBundle('admin_uid_1', {
      internalTicketId: 'TKT-FB-1',
      bookmakerId: 'SPORTYBET_TZ',
      feedSection: 'OTHER_SPORTS',
      sportId: 'sr:sport:2',
      sportName: 'Basketball',
      replacedTicketId: 'TKT-OLD-1',
      signature: 'sig_fb_1',
      sourceType: 'DAILY_FACTORY',
      categoryId: 'cat_2_3',
      categoryLabel: '2.00–3.00',
      targetOdds: 2.3,
      actualCombinedOdds: 2.25,
      oddsDifference: 0.05,
      selectionCount: 1,
      selections: [
        {
          selectionKey: 'k1',
          eventId: 'ev1',
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          leagueId: 'l1',
          leagueName: 'NBA',
          country: 'USA',
          estimateStartTime: Date.now() + 3600000,
          matchStatus: 'Not start',
          isLive: false,
          marketId: '225',
          marketName: 'Total',
          specifier: 'total=190.5',
          outcomeId: '12',
          outcomeDesc: 'Over 190.5',
          odds: 1.2,
          addedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
        },
      ],
      kickoffStartMs: Date.now() + 3600000,
      kickoffEndMs: Date.now() + 3600000,
      dataSource: 'SportyBet TZ',
      generatedAt: '2026-11-25T10:00:00.000Z',
      generatedDateKey: '2026-11-25',
      published: true,
      revalidatedAt: '2026-11-25T10:00:00.000Z',
      status: 'WON',
      effectiveCombinedOdds: 2.25,
      selectionSettlements: [],
      shareCode: 'XY1234',
      shareUrl: 'https://www.sportybet.com/tz/?shareCode=XY1234',
      shareCodeDeadline: null,
      shareCodeVerified: true,
      bookingCodeStatus: 'GENERATED',
      bookingCodeError: null,
      settledAt: '2026-11-25T15:00:00.000Z',
      lastCheckedAt: '2026-11-25T15:00:00.000Z',
    });

    expect(setDocMock).toHaveBeenCalledTimes(2);
    expect(setDocMock.mock.calls[0][1].feedSection).toBe('OTHER_SPORTS');
    expect(setDocMock.mock.calls[0][1].sportName).toBe('Basketball');
    expect(setDocMock.mock.calls[0][1].replacedTicketId).toBe('TKT-OLD-1');

    // Subsequent call when Firebase already holds WON status must NOT update publicTicketUpdates
    vi.clearAllMocks();
    getDocMock
      .mockResolvedValueOnce({ exists: () => true })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ status: 'WON' }) });

    await syncPublicTicketBundle('admin_uid_1', {
      internalTicketId: 'TKT-FB-1',
      signature: 'sig_fb_1',
      sourceType: 'DAILY_FACTORY',
      categoryId: 'cat_2_3',
      categoryLabel: '2.00–3.00',
      targetOdds: 2.3,
      actualCombinedOdds: 2.25,
      oddsDifference: 0.05,
      selectionCount: 1,
      selections: [],
      kickoffStartMs: 1000,
      kickoffEndMs: 1000,
      dataSource: 'SportyBet TZ',
      generatedAt: '2026-11-25T10:00:00.000Z',
      generatedDateKey: '2026-11-25',
      published: true,
      revalidatedAt: '2026-11-25T10:00:00.000Z',
      status: 'LOST',
      effectiveCombinedOdds: 2.25,
      selectionSettlements: [],
      shareCode: 'XY1234',
      shareUrl: 'https://www.sportybet.com/tz/?shareCode=XY1234',
      shareCodeDeadline: null,
      shareCodeVerified: true,
      bookingCodeStatus: 'GENERATED',
      bookingCodeError: null,
      settledAt: '2026-11-25T15:00:00.000Z',
      lastCheckedAt: null,
    });

    expect(setDocMock).not.toHaveBeenCalled();
    expect(updateDocMock).not.toHaveBeenCalled();

    const reconstructed = mapPublicDocsToGeneratedTickets(
      [
        {
          id: 'TKT-FB-1',
          isPublic: true,
          publishedByUid: 'admin_uid_1',
          internalTicketId: 'TKT-FB-1',
          signature: 'sig_fb_1',
          bookmakerId: 'SPORTYBET_TZ',
          feedSection: 'LIVE_FOOTBALL',
          sportId: 'sr:sport:1',
          sportName: 'Football',
          sourceType: 'DAILY_FACTORY',
          categoryId: 'cat_2_3',
          categoryLabel: '2.00–3.00',
          targetOdds: 2.3,
          actualCombinedOdds: 2.25,
          selectionCount: 1,
          kickoffStartMs: 1000,
          kickoffEndMs: 1000,
          dataSource: 'SportyBet TZ',
          generatedDateKey: '2026-11-25',
          originalSelections: [],
        },
      ],
      [
        {
          id: 'TKT-FB-1',
          isPublic: true,
          internalTicketId: 'TKT-FB-1',
          status: 'WON',
          effectiveCombinedOdds: 2.25,
          shareCode: 'XY1234',
          shareUrl: 'https://www.sportybet.com/tz/?shareCode=XY1234',
          shareCodeVerified: true,
          bookingCodeStatus: 'GENERATED',
          bookingCodeError: '',
          selectionSettlements: [],
          settledAt: '2026-11-25T15:00:00.000Z',
        },
      ]
    );
    expect(reconstructed).toHaveLength(1);
    expect(reconstructed[0]?.feedSection).toBe('LIVE_FOOTBALL');
    expect(reconstructed[0]?.status).toBe('WON');
    expect(reconstructed[0]?.shareCode).toBe('XY1234');
  });

  it('formats structured FirestoreErrorInfo with auth context on permission failure', () => {
    expect(() =>
      handleFirestoreError(
        new Error('Missing or insufficient permissions.'),
        OperationType.WRITE,
        'users/user_abc_123/bookingCodes/c1'
      )
    ).toThrow(/"userId":"user_abc_123".*"emailVerified":true.*"operationType":"write"/);
  });
});
