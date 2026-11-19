import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useFirebase } from '../firebase/auth/AuthContext.tsx';
import { db } from '../firebase/config.ts';
import { handleFirestoreError, OperationType } from '../firebase/firestore/errors.ts';
import {
  deleteFavoriteTicket,
  deletePublicTicketBundle,
  mapPublicDocsToGeneratedTickets,
  saveAdminAuditLogRecord,
  saveAdminSettingsRecord,
  saveBookingCodeRecord,
  saveFavoriteTicket,
  saveNotificationRecord,
  savePublicStatsRecord,
  saveScanHistoryRecord,
  syncBookmakerFeedState,
  syncFeedCycleRecord,
  syncPublicTicketBundle,
  updateUserPreferences,
  type AppNotificationRecord,
  type BookmakerFeedStateDocRecord,
  type FeedCycleDocRecord,
  type MatchResultDocRecord,
  type PublicStatsDocRecord,
  type PublicTicketDocRecord,
  type PublicTicketUpdateDocRecord,
} from '../firebase/firestore/repository.ts';
import { apiClient } from '../services/apiClient.ts';
import {
  DEFAULT_ALLOWED_DAILY_FEED_MARKETS,
  isTicketAllowedInDailyFeed,
} from '../utils/dailyFeedFilter.ts';
import { getTodayInputDate } from '../utils/formatters.ts';
import type {
  AutomationJobLog,
  BetslipSelection,
  BetslipValidationResponse,
  BookmakerCatalogInfo,
  BookmakerFeedState,
  BookmakerId,
  BookingCodeResponse,
  CycleUnfinishedMatchInfo,
  DailyFactoryConfig,
  DiagnosticCheck,
  GeneratedTicket,
  GenerationCycle,
  LeagueDirectoryItem,
  MarketCatalogItem,
  MatchResultRecord,
  NormalizedMatch,
  OddsCategoryConfig,
  PerformanceAnalyticsSummary,
  PlatformSettings,
  QualifyingSelection,
  ResearchReport,
  ResultVerificationFailure,
  ScannerConfig,
  ScanResult,
  SchedulerStatus,
} from '../types/sportybet.ts';

const BOOKMAKER_STORAGE_KEY = 'odds_hunter_bookmaker';

export const DEFAULT_BOOKMAKER_LIST: BookmakerCatalogInfo[] = [
  {
    id: 'SPORTYBET_TZ',
    name: 'SportyBet Tanzania',
    shortName: 'SportyBet TZ',
    country: 'Tanzania',
    websiteUrl: 'https://www.sportybet.com/tz/m/',
    apiBaseUrl: 'https://www.sportybet.com/api/tz',
    bookingCodeSupported: true,
    bookingCodeMechanism: 'POST /api/tz/orders/share',
    notes: 'Full upcoming/live football odds and sharing codes.',
  },
  {
    id: 'BETPAWA_TZ',
    name: 'betPawa Tanzania',
    shortName: 'betPawa TZ',
    country: 'Tanzania',
    websiteUrl: 'https://www.betpawa.co.tz/bets',
    apiBaseUrl: 'https://www.betpawa.co.tz/api/sportsbook',
    bookingCodeSupported: true,
    bookingCodeMechanism: 'POST /api/sportsbook/v3/booking-number',
    notes: 'Isolated betPawa TZ v4 sportsbook feed and native booking numbers.',
  },
];

function readStoredBookmaker(): BookmakerId {
  try {
    const saved = window.localStorage.getItem(BOOKMAKER_STORAGE_KEY);
    return saved === 'BETPAWA_TZ' ? 'BETPAWA_TZ' : 'SPORTYBET_TZ';
  } catch {
    return 'SPORTYBET_TZ';
  }
}

export type NavSection =
  | 'feed'
  | 'ticket-details'
  | 'transfer'
  | 'stats'
  | 'favorites'
  | 'admin-control'
  | 'live'
  | 'upcoming'
  | 'scanner'
  | 'filters'
  | 'betslip'
  | 'booking-codes'
  | 'history'
  | 'data-sources'
  | 'settings'
  | 'diagnostics';

const PATH_TO_SECTION: Record<string, NavSection> = {
  '/': 'feed',
  '/feed': 'feed',
  '/transfer': 'transfer',
  '/bet-transfer': 'transfer',
  '/stats': 'stats',
  '/favorites': 'favorites',
  '/admin': 'admin-control',
  '/admin-control': 'admin-control',
  '/live': 'live',
  '/upcoming': 'upcoming',
  '/scanner': 'scanner',
  '/filters': 'filters',
  '/betslip': 'betslip',
  '/booking-codes': 'booking-codes',
  '/history': 'history',
  '/data-sources': 'data-sources',
  '/settings': 'settings',
  '/diagnostics': 'diagnostics',
};

const SECTION_TO_PATH: Partial<Record<NavSection, string>> = {
  feed: '/',
  transfer: '/transfer',
  stats: '/stats',
  favorites: '/favorites',
  'admin-control': '/admin',
  live: '/live',
  upcoming: '/upcoming',
  scanner: '/scanner',
  filters: '/filters',
  betslip: '/betslip',
  'booking-codes': '/booking-codes',
  history: '/history',
  'data-sources': '/data-sources',
  settings: '/settings',
  diagnostics: '/diagnostics',
};

function readInitialSectionFromPath(): NavSection {
  try {
    const cleanPath = window.location.pathname.replace(/\/+$/, '') || '/';
    return PATH_TO_SECTION[cleanPath] || 'feed';
  } catch {
    return 'feed';
  }
}

export interface LocalNotification {
  id: string;
  type: AppNotificationRecord['type'];
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const DEFAULT_ODDS_CATEGORIES_UI: OddsCategoryConfig[] = [
  {
    id: 'cat_2_3',
    label: '2.00–3.00',
    minCombinedOdds: 2.0,
    maxCombinedOdds: 3.0,
    targetCombinedOdds: 2.45,
    weight: 30,
  },
  {
    id: 'cat_3_5',
    label: '3.00–5.00',
    minCombinedOdds: 3.0,
    maxCombinedOdds: 5.0,
    targetCombinedOdds: 3.9,
    weight: 30,
  },
  {
    id: 'cat_5_10',
    label: '5.00–10.00',
    minCombinedOdds: 5.0,
    maxCombinedOdds: 10.0,
    targetCombinedOdds: 7.2,
    weight: 25,
  },
  {
    id: 'cat_10_20',
    label: '10.00–20.00',
    minCombinedOdds: 10.0,
    maxCombinedOdds: 20.0,
    targetCombinedOdds: 13.5,
    weight: 15,
  },
];

export const DEFAULT_FACTORY_CONFIG_UI: DailyFactoryConfig = {
  enabled: true,
  paused: false,
  activeBookmaker: 'SPORTYBET_TZ',
  minIndividualOdds: 1.01,
  maxIndividualOdds: 1.25,
  dailyTicketTarget: 55,
  liveFootballTarget: 12,
  otherSportsTarget: 12,
  autoReplenishOnSettle: true,
  maxTickets: 100,
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
  oddsCategories: DEFAULT_ODDS_CATEGORIES_UI,
  duplicatePrevention: true,
  autoCreateBookingCodes: true,
  scheduleIntervalMinutes: 60,
};

function isTerminalStatus(status: GeneratedTicket['status']): boolean {
  return status === 'WON' || status === 'LOST' || status === 'VOID';
}

function isSelectionTerminal(status: string): boolean {
  return status === 'WON' || status === 'LOST' || status === 'VOID';
}

function defaultBookmakerFeedState(bookmakerId: BookmakerId): BookmakerFeedState {
  const info =
    DEFAULT_BOOKMAKER_LIST.find((b) => b.id === bookmakerId) || DEFAULT_BOOKMAKER_LIST[0];
  return {
    bookmakerId,
    bookmakerName: info.name,
    activeCycleId: null,
    generationLocked: false,
    lockStatus: 'UNLOCKED',
    lockReason: 'No active cycle yet — unlocked for initial permanent feed generation.',
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
    updatedAt: new Date(0).toISOString(),
  };
}

function timestampValToIso(val: unknown, fallback = ''): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return fallback;
}

function mergeImmutableFeeds(
  firebaseTickets: GeneratedTicket[],
  apiTickets: GeneratedTicket[]
): GeneratedTicket[] {
  const merged = new Map<string, GeneratedTicket>();

  for (const fb of firebaseTickets) {
    merged.set(fb.internalTicketId, fb);
  }

  for (const api of apiTickets) {
    const existing = merged.get(api.internalTicketId);
    if (!existing) {
      merged.set(api.internalTicketId, api);
      continue;
    }

    // WON and VOID outcomes are permanently locked
    if (existing.status === 'WON' || existing.status === 'VOID') {
      continue;
    }

    // LOST tickets preserve terminal LOST status & odds, while permitting unfinished legs in that ticket to settle
    if (existing.status === 'LOST') {
      const existingSettledCount = existing.selectionSettlements.filter((s) =>
        isSelectionTerminal(s.status)
      ).length;
      const apiSettledCount = api.selectionSettlements.filter((s) =>
        isSelectionTerminal(s.status)
      ).length;
      if (apiSettledCount > existingSettledCount) {
        merged.set(api.internalTicketId, {
          ...existing,
          selectionSettlements: api.selectionSettlements,
          settledMatchCount: api.settledMatchCount ?? apiSettledCount,
          totalMatchCount: api.totalMatchCount ?? existing.selections.length,
          unfinishedMatchCount:
            api.unfinishedMatchCount ??
            Math.max(0, existing.selections.length - apiSettledCount),
          lastCheckedAt: api.lastCheckedAt || existing.lastCheckedAt,
        });
      }
      continue;
    }

    const shouldTakeMutableUpdate =
      isTerminalStatus(api.status) ||
      (Boolean(api.shareCode) && !existing.shareCode) ||
      api.status !== existing.status ||
      (api.settledMatchCount ?? 0) !== (existing.settledMatchCount ?? 0) ||
      api.selectionSettlements.length > existing.selectionSettlements.length;

    if (shouldTakeMutableUpdate) {
      merged.set(api.internalTicketId, {
        ...existing,
        status: api.status,
        effectiveCombinedOdds: api.effectiveCombinedOdds,
        settledMatchCount: api.settledMatchCount ?? existing.settledMatchCount,
        totalMatchCount: api.totalMatchCount ?? existing.totalMatchCount,
        unfinishedMatchCount: api.unfinishedMatchCount ?? existing.unfinishedMatchCount,
        shareCode: api.shareCode || existing.shareCode,
        shareUrl: api.shareUrl || existing.shareUrl,
        shareCodeVerified: api.shareCodeVerified || existing.shareCodeVerified,
        bookingCodeStatus:
          api.shareCode || existing.shareCode
            ? 'GENERATED'
            : api.bookingCodeStatus || existing.bookingCodeStatus,
        bookingCodeError: api.bookingCodeError ?? existing.bookingCodeError,
        selectionSettlements:
          api.selectionSettlements.length > 0
            ? api.selectionSettlements
            : existing.selectionSettlements,
        settledAt: api.settledAt || existing.settledAt,
        lastCheckedAt: api.lastCheckedAt || existing.lastCheckedAt,
      });
    }
  }

  return Array.from(merged.values())
    .filter((t) => isTicketAllowedInDailyFeed(t))
    .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt));
}

interface OddsHunterContextValue {
  activeSection: NavSection;
  setActiveSection: (s: NavSection) => void;
  selectedTicketId: string | null;
  selectedTicket: GeneratedTicket | null;
  openTicketDetails: (internalTicketId: string) => void;
  closeTicketDetails: () => void;

  // Platform Enablement Status
  platformSettings: PlatformSettings | null;
  refreshPlatformStatus: () => Promise<void>;

  // Multi-Bookmaker Switching & Isolation
  bookmakers: BookmakerCatalogInfo[];
  activeBookmaker: BookmakerId;
  activeBookmakerInfo: BookmakerCatalogInfo;
  setActiveBookmaker: (id: BookmakerId) => void;

  markets: MarketCatalogItem[];
  leagues: LeagueDirectoryItem[];
  liveMatches: NormalizedMatch[];
  upcomingMatches: NormalizedMatch[];
  upcomingTotal: number;
  upcomingPage: number;
  loadingLive: boolean;
  loadingUpcoming: boolean;
  loadingLeagues: boolean;
  liveError: string | null;
  upcomingError: string | null;
  refreshLiveMatches: () => Promise<void>;
  loadUpcomingMatches: (pageNum?: number, todayGames?: boolean) => Promise<void>;
  selectedMatchId: string | null;
  openMatchDetail: (eventId: string) => void;
  closeMatchDetail: () => void;

  // Scanner
  scannerConfig: ScannerConfig;
  setScannerConfig: React.Dispatch<React.SetStateAction<ScannerConfig>>;
  resetScannerConfig: () => void;
  scanResult: ScanResult | null;
  setScanResult: React.Dispatch<React.SetStateAction<ScanResult | null>>;
  scanning: boolean;
  scanError: string | null;
  executeScan: (overrideConfig?: ScannerConfig) => Promise<ScanResult | null>;
  autoRescanSec: number;
  setAutoRescanSec: (sec: number) => void;

  // Betslip
  betslip: BetslipSelection[];
  stakeTzs: number;
  setStakeTzs: (stake: number) => void;
  addToBetslip: (sel: Omit<BetslipSelection, 'addedAt'>) => void;
  updateBetslipSelection: (
    oldSelectionKey: string,
    replacement: Omit<BetslipSelection, 'addedAt'>
  ) => void;
  acceptUpdatedOdds: (selectionKey: string, newOdds: number) => void;
  removeFromBetslip: (selectionKey: string) => void;
  replaceBetslip: (selections: BetslipSelection[]) => void;
  clearBetslip: () => void;
  validation: BetslipValidationResponse | null;
  validatingSlip: boolean;
  validateSlipNow: () => Promise<BetslipValidationResponse | null>;

  // Booking Codes
  latestBookingCode: BookingCodeResponse | null;
  generatingCode: boolean;
  codeError: string | null;
  generateBookingCode: () => Promise<BookingCodeResponse | null>;
  verifyAndLoadBookingCode: (
    code: string,
    loadIntoSlip?: boolean,
    targetBookmaker?: BookmakerId
  ) => Promise<BookingCodeResponse | null>;

  // Diagnostics & Research
  diagnostics: DiagnosticCheck[];
  diagnosticsCheckedAt: string | null;
  loadingDiagnostics: boolean;
  runDiagnosticsCheck: () => Promise<void>;
  researchReport: ResearchReport | null;

  // Notifications
  notifications: LocalNotification[];
  unreadCount: number;
  pushNotification: (
    type: AppNotificationRecord['type'],
    title: string,
    message: string
  ) => void;
  markLocalNotificationRead: (id: string) => void;

  // Public Daily Feed, Favorites & Admin Daily Factory Controls
  portfolioTickets: GeneratedTicket[];
  activeBookmakerTickets: GeneratedTicket[];
  loadingPortfolio: boolean;
  refreshPortfolio: () => Promise<void>;
  isTicketFavorited: (internalTicketId: string) => boolean;
  toggleFavoriteTicket: (ticket: GeneratedTicket) => Promise<void>;
  analyticsSummary: PerformanceAnalyticsSummary | null;
  refreshAnalytics: () => Promise<void>;
  schedulerStatus: SchedulerStatus | null;
  refreshScheduler: () => Promise<void>;
  feedStates: Record<BookmakerId, BookmakerFeedState>;
  activeFeedState: BookmakerFeedState;
  feedCycles: GenerationCycle[];
  activeCycle: GenerationCycle | null;
  unfinishedMatches: CycleUnfinishedMatchInfo[];
  verificationFailures: ResultVerificationFailure[];
  matchResults: MatchResultRecord[];

  // Admin-Only State & Controls
  factoryConfig: DailyFactoryConfig;
  setFactoryConfig: React.Dispatch<React.SetStateAction<DailyFactoryConfig>>;
  automationLogs: AutomationJobLog[];
  loadingAdminState: boolean;
  runningFactory: boolean;
  trackingResults: boolean;
  retryingCodes: boolean;
  retryingResults: boolean;
  loadAdminFactoryState: () => Promise<void>;
  saveFactoryConfig: (cfg: DailyFactoryConfig) => Promise<void>;
  toggleAutomation: (mode: 'start' | 'stop' | 'pause' | 'resume') => Promise<void>;
  runFactoryNow: (bookmaker?: BookmakerId) => Promise<void>;
  deletePortfolioTicket: (internalTicketId: string) => Promise<void>;
  createBookingCodeForTicket: (internalTicketId: string) => Promise<GeneratedTicket | null>;
  retryFailedBookingCodes: (ticketIds?: string[]) => Promise<void>;
  trackAllResultsNow: (ticketIds?: string[], bookmaker?: BookmakerId) => Promise<void>;
  retryFailedResultChecks: (bookmaker?: BookmakerId) => Promise<void>;
}

const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  minOdds: 1.01,
  maxOdds: 1.25,
  startDate: getTodayInputDate(0),
  endDate: getTodayInputDate(12),
  sportId: 'sr:sport:1',
  leagues: [],
  matchStatus: 'ALL',
  markets: ['10', '18'],
  maxResults: 100,
  searchQuery: '',
  sortBy: 'kickoff_asc',
};

const OddsHunterContext = createContext<OddsHunterContextValue | null>(null);

export function OddsHunterProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, favoriteTickets, getIdToken, profile, openAuthModal } = useFirebase();

  const [activeSection, setActiveSectionState] = useState<NavSection>(readInitialSectionFromPath);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  const setActiveSection = useCallback((section: NavSection) => {
    setActiveSectionState(section);
    try {
      const targetPath = SECTION_TO_PATH[section];
      if (targetPath && window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    } catch {
      // Ignore history error in restricted sandboxes
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setActiveSectionState(readInitialSectionFromPath());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const [bookmakers, setBookmakers] = useState<BookmakerCatalogInfo[]>(DEFAULT_BOOKMAKER_LIST);
  const [activeBookmaker, setActiveBookmakerState] = useState<BookmakerId>(readStoredBookmaker);
  const lastHydratedBookmakerUidRef = useRef<string | null>(null);

  const activeBookmakerInfo =
    bookmakers.find((b) => b.id === activeBookmaker) || DEFAULT_BOOKMAKER_LIST[0];

  const [markets, setMarkets] = useState<MarketCatalogItem[]>([]);
  const [leagues, setLeagues] = useState<LeagueDirectoryItem[]>([]);
  const [liveMatches, setLiveMatches] = useState<NormalizedMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<NormalizedMatch[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(1);

  const [loadingLive, setLoadingLive] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const [scannerConfig, setScannerConfig] = useState<ScannerConfig>(() => ({
    ...DEFAULT_SCANNER_CONFIG,
    bookmakerId: readStoredBookmaker(),
    markets: readStoredBookmaker() === 'BETPAWA_TZ' ? ['4693', '5000'] : ['10', '18'],
  }));
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [autoRescanSec, setAutoRescanSec] = useState(0);

  const [betslip, setBetslip] = useState<BetslipSelection[]>([]);
  const [stakeTzs, setStakeTzs] = useState(10000);
  const [validation, setValidation] = useState<BetslipValidationResponse | null>(null);
  const [validatingSlip, setValidatingSlip] = useState(false);

  const [latestBookingCode, setLatestBookingCode] = useState<BookingCodeResponse | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [diagnostics, setDiagnostics] = useState<DiagnosticCheck[]>([]);
  const [diagnosticsCheckedAt, setDiagnosticsCheckedAt] = useState<string | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [researchReport, setResearchReport] = useState<ResearchReport | null>(null);

  const [notifications, setNotifications] = useState<LocalNotification[]>([]);

  // Shared Daily Factory Feed & Analytics (Firebase Immutable Base + Live Backend Sync)
  const [firebaseTicketDocs, setFirebaseTicketDocs] = useState<PublicTicketDocRecord[]>([]);
  const [firebaseUpdateDocs, setFirebaseUpdateDocs] = useState<PublicTicketUpdateDocRecord[]>([]);
  const [firebasePublicStats, setFirebasePublicStats] = useState<PublicStatsDocRecord | null>(null);
  const [firebaseFeedStateDocs, setFirebaseFeedStateDocs] = useState<BookmakerFeedStateDocRecord[]>([]);
  const [firebaseFeedCycleDocs, setFirebaseFeedCycleDocs] = useState<FeedCycleDocRecord[]>([]);
  const [firebaseMatchResultDocs, setFirebaseMatchResultDocs] = useState<MatchResultDocRecord[]>([]);
  const [firebaseFeedLoaded, setFirebaseFeedLoaded] = useState(false);
  const [apiTickets, setApiTickets] = useState<GeneratedTicket[]>([]);
  const [apiFeedStates, setApiFeedStates] = useState<Record<BookmakerId, BookmakerFeedState> | null>(null);
  const [apiFeedCycles, setApiFeedCycles] = useState<GenerationCycle[]>([]);
  const [apiUnfinishedMatches, setApiUnfinishedMatches] = useState<CycleUnfinishedMatchInfo[]>([]);
  const [apiVerificationFailures, setApiVerificationFailures] = useState<ResultVerificationFailure[]>([]);
  const [apiMatchResults, setApiMatchResults] = useState<MatchResultRecord[]>([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [analyticsSummaryRaw, setAnalyticsSummary] = useState<PerformanceAnalyticsSummary | null>(
    null
  );
  const [schedulerStatusRaw, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const hydratedKeyRef = useRef<string>('');
  const autoMirroredKeyRef = useRef<string>('');

  const firebaseTickets = useMemo(
    () => mapPublicDocsToGeneratedTickets(firebaseTicketDocs, firebaseUpdateDocs),
    [firebaseTicketDocs, firebaseUpdateDocs]
  );

  const portfolioTickets = useMemo(
    () => mergeImmutableFeeds(firebaseTickets, apiTickets),
    [firebaseTickets, apiTickets]
  );

  const activeBookmakerTickets = useMemo(
    () =>
      portfolioTickets.filter(
        (t) => (t.bookmakerId || 'SPORTYBET_TZ') === activeBookmaker
      ),
    [portfolioTickets, activeBookmaker]
  );

  const feedStates = useMemo<Record<BookmakerId, BookmakerFeedState>>(() => {
    const out: Record<BookmakerId, BookmakerFeedState> = {
      SPORTYBET_TZ: defaultBookmakerFeedState('SPORTYBET_TZ'),
      BETPAWA_TZ: defaultBookmakerFeedState('BETPAWA_TZ'),
    };

    for (const bk of ['SPORTYBET_TZ', 'BETPAWA_TZ'] as BookmakerId[]) {
      const fbDoc = firebaseFeedStateDocs.find((d) => d.bookmakerId === bk || d.id === bk);
      const apiSt = apiFeedStates?.[bk] || schedulerStatusRaw?.byBookmaker?.[bk];

      const bkTickets = portfolioTickets.filter((t) => (t.bookmakerId || 'SPORTYBET_TZ') === bk);
      const fbMapped: BookmakerFeedState | null = fbDoc
        ? {
            bookmakerId: bk,
            bookmakerName: fbDoc.bookmakerName || out[bk].bookmakerName,
            activeCycleId: fbDoc.activeCycleId || null,
            generationLocked: Boolean(fbDoc.generationLocked),
            lockStatus: fbDoc.lockStatus === 'LOCKED' ? 'LOCKED' : 'UNLOCKED',
            lockReason: fbDoc.lockReason || out[bk].lockReason,
            totalTicketsInCycle: Number(fbDoc.totalTicketsInCycle || 0),
            settledTicketsInCycle: Number(fbDoc.settledTicketsInCycle || 0),
            unsettledTicketsCount: Number(fbDoc.unsettledTicketsCount || 0),
            totalMatchesInCycle: Number(fbDoc.totalMatchesInCycle || 0),
            finishedMatchesCount: Number(fbDoc.finishedMatchesCount || 0),
            unfinishedMatchesCount: Number(fbDoc.unfinishedMatchesCount || 0),
            unverifiedMatchesCount: Number(fbDoc.unverifiedMatchesCount || 0),
            verificationFailuresCount: Number(fbDoc.verificationFailuresCount || 0),
            lastGenerationAt: fbDoc.lastGenerationAt || null,
            lastResultCheckAt: fbDoc.lastResultCheckAt || null,
            lastUnlockedAt: fbDoc.lastUnlockedAt || null,
            updatedAt: timestampValToIso(fbDoc.updatedAt, out[bk].updatedAt),
          }
        : null;

      if (apiSt && (!fbMapped || Date.parse(apiSt.updatedAt || '') >= Date.parse(fbMapped.updatedAt || ''))) {
        out[bk] = apiSt;
      } else if (fbMapped) {
        out[bk] = fbMapped;
      } else if (bkTickets.length > 0) {
        // Derive cycle lock conservatively from tickets on client if feedState doc not yet created
        const latestCycleId = bkTickets[0]?.cycleId || null;
        const cycleScope = latestCycleId
          ? bkTickets.filter((t) => t.cycleId === latestCycleId)
          : bkTickets;
        let unfinished = 0;
        let finished = 0;
        let total = 0;
        let unsettled = 0;
        for (const t of cycleScope) {
          let legUnfinished = false;
          for (const sel of t.selections) {
            total++;
            const st = t.selectionSettlements.find((s) => s.selectionKey === sel.selectionKey);
            if (st && isSelectionTerminal(st.status)) {
              finished++;
            } else {
              unfinished++;
              legUnfinished = true;
            }
          }
          if (!isTerminalStatus(t.status) || legUnfinished) unsettled++;
        }
        const locked = unfinished > 0 || unsettled > 0;
        out[bk] = {
          ...out[bk],
          activeCycleId: latestCycleId,
          generationLocked: locked,
          lockStatus: locked ? 'LOCKED' : 'UNLOCKED',
          lockReason: locked
            ? `LOCKED: Waiting for ${unfinished} unfinished match selection(s) before new generation.`
            : 'All matches settled — unlocked for next cycle.',
          totalTicketsInCycle: cycleScope.length,
          settledTicketsInCycle: cycleScope.length - unsettled,
          unsettledTicketsCount: unsettled,
          totalMatchesInCycle: total,
          finishedMatchesCount: finished,
          unfinishedMatchesCount: unfinished,
        };
      }
    }

    return out;
  }, [firebaseFeedStateDocs, apiFeedStates, schedulerStatusRaw?.byBookmaker, portfolioTickets]);

  const feedCycles = useMemo<GenerationCycle[]>(() => {
    const map = new Map<string, GenerationCycle>();
    for (const d of firebaseFeedCycleDocs) {
      const cyc: GenerationCycle = {
        cycleId: d.cycleId || d.id,
        idempotencyKey: d.idempotencyKey || d.cycleId || d.id,
        bookmakerId: d.bookmakerId === 'BETPAWA_TZ' ? 'BETPAWA_TZ' : 'SPORTYBET_TZ',
        dateKey: d.dateKey || '2026-01-01',
        status: d.status === 'SETTLED' ? 'SETTLED' : 'ACTIVE',
        generationLocked: Boolean(d.generationLocked),
        ticketIds: Array.isArray(d.ticketIds) ? d.ticketIds : [],
        ticketCount: Number(d.ticketCount || 0),
        totalMatches: Number(d.totalMatches || 0),
        finishedMatches: Number(d.finishedMatches || 0),
        unfinishedMatches: Number(d.unfinishedMatches || 0),
        wonTickets: Number(d.wonTickets || 0),
        lostTickets: Number(d.lostTickets || 0),
        voidTickets: Number(d.voidTickets || 0),
        createdAt: timestampValToIso(d.createdAt, new Date(0).toISOString()),
        updatedAt: timestampValToIso(d.updatedAt, new Date(0).toISOString()),
        settledAt: d.settledAt || null,
      };
      map.set(cyc.cycleId, cyc);
    }
    for (const c of apiFeedCycles) {
      const prev = map.get(c.cycleId);
      if (!prev || prev.status !== 'SETTLED' || c.status === 'SETTLED') {
        map.set(c.cycleId, c);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
  }, [firebaseFeedCycleDocs, apiFeedCycles]);

  const activeFeedState = feedStates[activeBookmaker];

  const activeCycle = useMemo<GenerationCycle | null>(() => {
    const bkCycles = feedCycles.filter((c) => c.bookmakerId === activeBookmaker);
    if (activeFeedState.activeCycleId) {
      const found = bkCycles.find((c) => c.cycleId === activeFeedState.activeCycleId);
      if (found) return found;
    }
    return bkCycles.find((c) => c.status === 'ACTIVE') || bkCycles[0] || null;
  }, [feedCycles, activeBookmaker, activeFeedState.activeCycleId]);

  const unfinishedMatches = useMemo<CycleUnfinishedMatchInfo[]>(() => {
    if (apiUnfinishedMatches.length > 0) return apiUnfinishedMatches;
    if (schedulerStatusRaw?.unfinishedMatches && schedulerStatusRaw.unfinishedMatches.length > 0) {
      return schedulerStatusRaw.unfinishedMatches;
    }
    const list: CycleUnfinishedMatchInfo[] = [];
    for (const t of portfolioTickets) {
      const bk = (t.bookmakerId || 'SPORTYBET_TZ') as BookmakerId;
      for (const sel of t.selections) {
        const st = t.selectionSettlements.find((s) => s.selectionKey === sel.selectionKey);
        const legStatus = st?.status || 'UPCOMING';
        if (!isSelectionTerminal(legStatus)) {
          list.push({
            bookmakerId: bk,
            cycleId: t.cycleId || feedStates[bk].activeCycleId || 'ACTIVE',
            ticketId: t.internalTicketId,
            eventId: sel.eventId,
            selectionKey: sel.selectionKey,
            homeTeam: sel.homeTeam,
            awayTeam: sel.awayTeam,
            kickoffMs: sel.estimateStartTime,
            status: legStatus,
            reason: st?.reason || 'Awaiting official result',
          });
        }
      }
    }
    return list;
  }, [apiUnfinishedMatches, schedulerStatusRaw?.unfinishedMatches, portfolioTickets, feedStates]);

  const verificationFailures = useMemo<ResultVerificationFailure[]>(() => {
    if (apiVerificationFailures.length > 0) return apiVerificationFailures;
    return schedulerStatusRaw?.verificationFailures || [];
  }, [apiVerificationFailures, schedulerStatusRaw?.verificationFailures]);

  const matchResults = useMemo<MatchResultRecord[]>(() => {
    if (apiMatchResults.length > 0) return apiMatchResults;
    return firebaseMatchResultDocs.map((d) => ({
      resultId: d.resultId || d.id,
      bookmakerId: d.bookmakerId === 'BETPAWA_TZ' ? 'BETPAWA_TZ' : 'SPORTYBET_TZ',
      eventId: d.eventId,
      homeTeam: d.homeTeam,
      awayTeam: d.awayTeam,
      officialMatchStatus: d.officialMatchStatus,
      status: d.status,
      score: d.score,
      verified: Boolean(d.verified),
      reason: d.reason,
      updatedAt: timestampValToIso(d.updatedAt),
    }));
  }, [apiMatchResults, firebaseMatchResultDocs]);

  const loadingPortfolio = !firebaseFeedLoaded && !apiLoaded;

  const schedulerStatus = useMemo<SchedulerStatus | null>(() => {
    if (!schedulerStatusRaw && !firebasePublicStats && portfolioTickets.length === 0) return null;
    const base = schedulerStatusRaw;
    const fb = firebasePublicStats;
    const todayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Dar_es_Salaam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const todayScoped = activeBookmakerTickets.filter((t) => t.generatedDateKey === todayKey);

    return {
      enabled: base?.enabled ?? true,
      paused: base?.paused ?? false,
      factoryRunning: base?.factoryRunning ?? false,
      resultsTrackerRunning: base?.resultsTrackerRunning ?? false,
      resultsIntervalMinutes: base?.resultsIntervalMinutes ?? 10,
      lastFactoryRunAt: base?.lastFactoryRunAt ?? (fb?.lastScanningAt || null),
      lastResultsRunAt: base?.lastResultsRunAt ?? (fb?.lastSettlementAt || null),
      lastScanningAt: base?.lastScanningAt ?? (fb?.lastScanningAt || null),
      lastSettlementAt: base?.lastSettlementAt ?? (fb?.lastSettlementAt || null),
      nextFactoryRunAt: base?.nextFactoryRunAt ?? null,
      totalDailyTicketsToday:
        todayScoped.length > 0 ? todayScoped.length : base?.totalDailyTicketsToday ?? 0,
      dailyTicketTarget: base?.dailyTicketTarget ?? fb?.dailyTicketTarget ?? 55,
      liveFootballCount:
        todayScoped.length > 0
          ? todayScoped.filter((t) => t.feedSection === 'LIVE_FOOTBALL').length
          : base?.liveFootballCount ?? 0,
      otherSportsCount:
        todayScoped.length > 0
          ? todayScoped.filter((t) => t.feedSection === 'OTHER_SPORTS').length
          : base?.otherSportsCount ?? 0,
      upcomingActiveCount:
        todayScoped.length > 0
          ? todayScoped.filter(
              (t) => (t.feedSection || 'UPCOMING') === 'UPCOMING' && !isTerminalStatus(t.status)
            ).length
          : base?.upcomingActiveCount ?? 0,
      settledWonCount:
        activeBookmakerTickets.length > 0
          ? activeBookmakerTickets.filter((t) => t.status === 'WON').length
          : base?.settledWonCount ?? 0,
      settledLostCount:
        activeBookmakerTickets.length > 0
          ? activeBookmakerTickets.filter((t) => t.status === 'LOST').length
          : base?.settledLostCount ?? 0,
      settledVoidCount:
        activeBookmakerTickets.length > 0
          ? activeBookmakerTickets.filter((t) => t.status === 'VOID').length
          : base?.settledVoidCount ?? 0,
      bookingCodesGeneratedToday:
        todayScoped.length > 0
          ? todayScoped.filter((t) => Boolean(t.shareCode)).length
          : base?.bookingCodesGeneratedToday ?? 0,
      bookingCodeFailuresToday:
        todayScoped.length > 0
          ? todayScoped.filter((t) => t.bookingCodeStatus === 'FAILED').length
          : base?.bookingCodeFailuresToday ?? 0,
      dailyShortfallReason: base?.dailyShortfallReason ?? null,
      byBookmaker: feedStates,
      unfinishedMatches,
      verificationFailures,
    };
  }, [
    schedulerStatusRaw,
    firebasePublicStats,
    portfolioTickets.length,
    activeBookmakerTickets,
    feedStates,
    unfinishedMatches,
    verificationFailures,
  ]);

  const analyticsSummary = useMemo<PerformanceAnalyticsSummary | null>(() => {
    if (activeBookmakerTickets.length === 0) {
      return analyticsSummaryRaw;
    }

    const todayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Dar_es_Salaam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const wonCount = activeBookmakerTickets.filter((t) => t.status === 'WON').length;
    const lostCount = activeBookmakerTickets.filter((t) => t.status === 'LOST').length;
    const voidCount = activeBookmakerTickets.filter((t) => t.status === 'VOID').length;
    const partiallySettledCount = activeBookmakerTickets.filter(
      (t) => t.status === 'PARTIALLY_SETTLED'
    ).length;
    const pendingOrLiveCount = activeBookmakerTickets.filter(
      (t) => t.status === 'PENDING' || t.status === 'LIVE'
    ).length;
    const unverifiedCount = activeBookmakerTickets.filter((t) => t.status === 'UNVERIFIED').length;
    const settledNonVoid = wonCount + lostCount;

    const buildRows = (
      groups: Map<string, GeneratedTicket[]>
    ): PerformanceAnalyticsSummary['byCategory'] =>
      Array.from(groups.entries()).map(([label, list]) => {
        const won = list.filter((x) => x.status === 'WON').length;
        const lost = list.filter((x) => x.status === 'LOST').length;
        const voided = list.filter((x) => x.status === 'VOID').length;
        const pending = list.filter(
          (x) =>
            x.status === 'PENDING' ||
            x.status === 'LIVE' ||
            x.status === 'PARTIALLY_SETTLED' ||
            x.status === 'UNVERIFIED'
        ).length;
        const denom = won + lost;
        return {
          label,
          total: list.length,
          won,
          lost,
          voided,
          pending,
          settledNonVoid: denom,
          winRatePct: denom > 0 ? Number(((won / denom) * 100).toFixed(1)) : null,
        };
      });

    const catMap = new Map<string, GeneratedTicket[]>();
    const mktMap = new Map<string, GeneratedTicket[]>();
    const lgMap = new Map<string, GeneratedTicket[]>();
    const dayMap = new Map<string, GeneratedTicket[]>();

    for (const t of activeBookmakerTickets) {
      const catList = catMap.get(t.categoryLabel) || [];
      catList.push(t);
      catMap.set(t.categoryLabel, catList);

      const dayList = dayMap.get(t.generatedDateKey) || [];
      dayList.push(t);
      dayMap.set(t.generatedDateKey, dayList);

      const seenMkts = new Set<string>();
      const seenLeagues = new Set<string>();
      for (const s of t.selections) {
        if (s.marketName && !seenMkts.has(s.marketName)) {
          seenMkts.add(s.marketName);
          const arr = mktMap.get(s.marketName) || [];
          arr.push(t);
          mktMap.set(s.marketName, arr);
        }
        if (s.leagueName && !seenLeagues.has(s.leagueName)) {
          seenLeagues.add(s.leagueName);
          const arr = lgMap.get(s.leagueName) || [];
          arr.push(t);
          lgMap.set(s.leagueName, arr);
        }
      }
    }

    return {
      totalGenerated: activeBookmakerTickets.length,
      generatedToday: activeBookmakerTickets.filter((t) => t.generatedDateKey === todayKey).length,
      dailyTarget: schedulerStatus?.dailyTicketTarget ?? analyticsSummaryRaw?.dailyTarget ?? 55,
      totalSettled: wonCount + lostCount + voidCount,
      wonCount,
      lostCount,
      voidCount,
      partiallySettledCount,
      pendingOrLiveCount,
      unverifiedCount,
      validSharingCodes: activeBookmakerTickets.filter((t) => Boolean(t.shareCode)).length,
      failedBookingCodes: activeBookmakerTickets.filter((t) => !t.shareCode).length,
      settledNonVoidDenominator: settledNonVoid,
      winRatePct: settledNonVoid > 0 ? Number(((wonCount / settledNonVoid) * 100).toFixed(1)) : null,
      lastScanningAt: schedulerStatus?.lastScanningAt ?? analyticsSummaryRaw?.lastScanningAt ?? null,
      lastSettlementAt:
        schedulerStatus?.lastSettlementAt ?? analyticsSummaryRaw?.lastSettlementAt ?? null,
      byCategory: buildRows(catMap),
      byMarket: buildRows(mktMap).slice(0, 15),
      byLeague: buildRows(lgMap).slice(0, 15),
      dailyTrends: Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, list]) => ({
          dateKey,
          generated: list.length,
          won: list.filter((x) => x.status === 'WON').length,
          lost: list.filter((x) => x.status === 'LOST').length,
          voided: list.filter((x) => x.status === 'VOID').length,
        })),
      performanceDisclaimer:
        analyticsSummaryRaw?.performanceDisclaimer ||
        'Win rates are computed strictly from verified finished official SportyBet TZ / betPawa TZ match results stored in Firebase (voided tickets excluded from win-rate denominator).',
    };
  }, [analyticsSummaryRaw, activeBookmakerTickets, schedulerStatus]);

  // Admin-Only State
  const [factoryConfig, setFactoryConfig] = useState<DailyFactoryConfig>(
    DEFAULT_FACTORY_CONFIG_UI
  );
  const [automationLogs, setAutomationLogs] = useState<AutomationJobLog[]>([]);
  const [loadingAdminState, setLoadingAdminState] = useState(false);
  const [runningFactory, setRunningFactory] = useState(false);
  const [trackingResults, setTrackingResults] = useState(false);
  const [retryingCodes, setRetryingCodes] = useState(false);
  const [retryingResults, setRetryingResults] = useState(false);

  const refreshPlatformStatus = useCallback(async () => {
    try {
      const res = await apiClient.getPlatformStatus();
      setPlatformSettings(res.settings);
    } catch {
      // Non-fatal
    }
  }, []);

  const pushNotification = useCallback(
    (type: AppNotificationRecord['type'], title: string, message: string) => {
      const item: LocalNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [item, ...prev].slice(0, 50));
      if (user && user.emailVerified) {
        void saveNotificationRecord(user.uid, { type, title, message }).catch(() => {});
      }
    },
    [user]
  );

  const markLocalNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  useEffect(() => {
    if (profile) {
      setStakeTzs(profile.defaultStakeTzs);
      setAutoRescanSec(profile.autoScanIntervalSec);
      setScannerConfig((prev) => ({
        ...prev,
        minOdds: profile.defaultMinOdds,
        maxOdds: profile.defaultMaxOdds,
      }));
      if (
        user &&
        profile.preferredBookmaker &&
        (profile.preferredBookmaker === 'SPORTYBET_TZ' ||
          profile.preferredBookmaker === 'BETPAWA_TZ') &&
        lastHydratedBookmakerUidRef.current !== user.uid
      ) {
        lastHydratedBookmakerUidRef.current = user.uid;
        setActiveBookmakerState(profile.preferredBookmaker);
        try {
          window.localStorage.setItem(BOOKMAKER_STORAGE_KEY, profile.preferredBookmaker);
        } catch {
          // Ignore storage error
        }
      }
    } else if (!user) {
      lastHydratedBookmakerUidRef.current = null;
    }
  }, [profile, user]);

  useEffect(() => {
    void refreshPlatformStatus();
    apiClient
      .getBookmakers()
      .then((res) => {
        if (Array.isArray(res.bookmakers) && res.bookmakers.length > 0) {
          setBookmakers(res.bookmakers);
        }
      })
      .catch(() => {});
  }, [refreshPlatformStatus]);

  const setActiveBookmaker = useCallback(
    (nextId: BookmakerId) => {
      if (nextId === activeBookmaker) return;
      setActiveBookmakerState(nextId);
      try {
        window.localStorage.setItem(BOOKMAKER_STORAGE_KEY, nextId);
      } catch {
        // Ignore storage error
      }
      if (user && user.emailVerified) {
        lastHydratedBookmakerUidRef.current = user.uid;
        void updateUserPreferences(user.uid, { preferredBookmaker: nextId }).catch(() => {});
      }
      setScannerConfig((prev) => ({
        ...prev,
        bookmakerId: nextId,
        leagues: [],
        markets: nextId === 'BETPAWA_TZ' ? ['4693', '5000'] : ['10', '18'],
      }));
      setScanResult(null);
      setScanError(null);
      const nextInfo = bookmakers.find((b) => b.id === nextId) || DEFAULT_BOOKMAKER_LIST[0];
      pushNotification(
        'SCAN_COMPLETE',
        `Switched Bookmaker: ${nextInfo.shortName}`,
        `Active data source switched to ${nextInfo.name}. Existing daily tickets remain preserved.`
      );
    },
    [activeBookmaker, bookmakers, pushNotification, user]
  );

  const openTicketDetails = useCallback(
    (internalTicketId: string) => {
      setSelectedTicketId(internalTicketId);
      setActiveSection('ticket-details');
    },
    [setActiveSection]
  );

  const closeTicketDetails = useCallback(() => {
    setSelectedTicketId(null);
    setActiveSection('feed');
  }, [setActiveSection]);

  const selectedTicket =
    portfolioTickets.find((t) => t.internalTicketId === selectedTicketId) || null;

  const isTicketFavorited = useCallback(
    (internalTicketId: string) => {
      return favoriteTickets.some((f) => f.internalTicketId === internalTicketId);
    },
    [favoriteTickets]
  );

  const toggleFavoriteTicket = useCallback(
    async (ticket: GeneratedTicket) => {
      if (!user) {
        pushNotification(
          'SCAN_COMPLETE',
          'Sign In to Bookmark Tickets',
          'Sign in or create an account to save favorite daily tickets to your profile.'
        );
        openAuthModal('signin');
        return;
      }

      if (!user.emailVerified) {
        pushNotification(
          'INTEGRATION_ERROR',
          'Email Verification Required',
          'Verify your email address first to save bookmarks to your Firestore profile.'
        );
        return;
      }

      if (isTicketFavorited(ticket.internalTicketId)) {
        await deleteFavoriteTicket(user.uid, ticket.internalTicketId);
        pushNotification(
          'SCAN_COMPLETE',
          'Removed Favorite Ticket',
          `Ticket ${ticket.internalTicketId} removed from your favorites.`
        );
      } else {
        await saveFavoriteTicket(user.uid, ticket);
        pushNotification(
          'SCAN_COMPLETE',
          'Ticket Bookmarked',
          `Saved ticket ${ticket.internalTicketId} (${ticket.actualCombinedOdds.toFixed(
            2
          )} odds) to Favorites.`
        );
      }
    },
    [isTicketFavorited, openAuthModal, pushNotification, user]
  );

  const refreshLiveMatches = useCallback(async () => {
    setLoadingLive(true);
    setLiveError(null);
    try {
      const res = await apiClient.getLiveMatches(activeBookmaker);
      setLiveMatches(res.matches);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load live matches';
      setLiveError(msg);
    } finally {
      setLoadingLive(false);
    }
  }, [activeBookmaker]);

  const loadUpcomingMatches = useCallback(
    async (pageNum = 1, todayGames = false) => {
      setLoadingUpcoming(true);
      setUpcomingError(null);
      try {
        const res = await apiClient.getUpcomingMatches({
          pageNum,
          pageSize: 50,
          todayGames,
          bookmaker: activeBookmaker,
        });
        setUpcomingMatches(res.matches);
        setUpcomingTotal(res.totalAvailable);
        setUpcomingPage(res.pageNum);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load upcoming matches';
        setUpcomingError(msg);
      } finally {
        setLoadingUpcoming(false);
      }
    },
    [activeBookmaker]
  );

  const runDiagnosticsCheck = useCallback(async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await apiClient.getDiagnostics(activeBookmaker);
      setDiagnostics(res.checks);
      setDiagnosticsCheckedAt(res.checkedAt);
    } catch (err) {
      pushNotification(
        'INTEGRATION_ERROR',
        'Diagnostics Probe Failed',
        err instanceof Error ? err.message : 'Unable to probe backend diagnostics.'
      );
    } finally {
      setLoadingDiagnostics(false);
    }
  }, [activeBookmaker, pushNotification]);

  const refreshPortfolio = useCallback(async () => {
    try {
      const res = await apiClient.listTickets();
      setApiTickets(res.tickets.filter((t) => isTicketAllowedInDailyFeed(t)));
    } catch {
      // Preserve Firebase snapshot feed on transient backend error
    } finally {
      setApiLoaded(true);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    try {
      const summary = await apiClient.getPerformanceAnalytics(activeBookmaker);
      setAnalyticsSummary(summary);
    } catch {
      // Ignore transient analytics fetch error
    }
  }, [activeBookmaker]);

  const refreshScheduler = useCallback(async () => {
    try {
      const res = await apiClient.getSchedulerStatus(activeBookmaker);
      setSchedulerStatus(res.status);
      if (res.feedStates) setApiFeedStates(res.feedStates);
      if (Array.isArray(res.feedCycles)) setApiFeedCycles(res.feedCycles);
      if (Array.isArray(res.matchResults)) setApiMatchResults(res.matchResults);
      if (Array.isArray(res.verificationFailures)) {
        setApiVerificationFailures(res.verificationFailures);
      }
      if (Array.isArray(res.status?.unfinishedMatches)) {
        setApiUnfinishedMatches(res.status.unfinishedMatches);
      }
    } catch {
      // Ignore transient scheduler fetch error
    }
  }, [activeBookmaker]);

  const loadAdminFactoryState = useCallback(async () => {
    if (!isAdmin) return;
    const token = await getIdToken();
    if (!token) return;
    setLoadingAdminState(true);
    try {
      const res = await apiClient.getDailyFactoryAdminState(token);
      setFactoryConfig(res.config);
      setSchedulerStatus(res.status);
      if (res.feedStates) setApiFeedStates(res.feedStates);
      if (Array.isArray(res.feedCycles)) setApiFeedCycles(res.feedCycles);
      if (Array.isArray(res.unfinishedMatches)) setApiUnfinishedMatches(res.unfinishedMatches);
      if (Array.isArray(res.verificationFailures)) {
        setApiVerificationFailures(res.verificationFailures);
      }
      setAutomationLogs(res.logs);
    } catch (err) {
      pushNotification(
        'INTEGRATION_ERROR',
        'Admin State Load Error',
        err instanceof Error ? err.message : 'Unable to fetch Admin Control Center state.'
      );
    } finally {
      setLoadingAdminState(false);
    }
  }, [getIdToken, isAdmin, pushNotification]);

  useEffect(() => {
    apiClient
      .getMarkets(activeBookmaker)
      .then((res) => setMarkets(res.markets))
      .catch(() => {});
    apiClient
      .getResearchReport(activeBookmaker)
      .then((res) => setResearchReport(res))
      .catch(() => {});
    setLoadingLeagues(true);
    apiClient
      .getLeagues(activeBookmaker)
      .then((res) => setLeagues(res.leagues))
      .catch(() => {})
      .finally(() => setLoadingLeagues(false));

    void refreshLiveMatches();
    void loadUpcomingMatches(1, false);
    void runDiagnosticsCheck();
    void refreshPortfolio();
    void refreshAnalytics();
    void refreshScheduler();
  }, [
    activeBookmaker,
    refreshLiveMatches,
    loadUpcomingMatches,
    runDiagnosticsCheck,
    refreshPortfolio,
    refreshAnalytics,
    refreshScheduler,
  ]);

  // Real-Time Firestore Listeners for Immutable Public Daily Feeds, Cycles, Feed States & Results
  useEffect(() => {
    const unsubTickets = onSnapshot(
      query(collection(db, 'publicTickets'), where('isPublic', '==', true), limit(500)),
      (snap) => {
        setFirebaseTicketDocs(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PublicTicketDocRecord, 'id'>) }))
        );
        setFirebaseFeedLoaded(true);
      },
      (err) => {
        setFirebaseFeedLoaded(true);
        handleFirestoreError(err, OperationType.LIST, 'publicTickets');
      }
    );

    const unsubUpdates = onSnapshot(
      query(collection(db, 'publicTicketUpdates'), where('isPublic', '==', true), limit(500)),
      (snap) => {
        setFirebaseUpdateDocs(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<PublicTicketUpdateDocRecord, 'id'>),
          }))
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'publicTicketUpdates');
      }
    );

    const unsubStats = onSnapshot(
      doc(db, 'publicStats', 'daily'),
      (snap) => {
        if (snap.exists()) {
          setFirebasePublicStats({
            id: snap.id,
            ...(snap.data() as Omit<PublicStatsDocRecord, 'id'>),
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'publicStats/daily');
      }
    );

    const unsubFeedStates = onSnapshot(
      query(collection(db, 'bookmakerFeedStates'), where('isPublic', '==', true), limit(10)),
      (snap) => {
        setFirebaseFeedStateDocs(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<BookmakerFeedStateDocRecord, 'id'>),
          }))
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'bookmakerFeedStates');
      }
    );

    const unsubCycles = onSnapshot(
      query(collection(db, 'feedCycles'), where('isPublic', '==', true), limit(100)),
      (snap) => {
        setFirebaseFeedCycleDocs(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FeedCycleDocRecord, 'id'>),
          }))
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'feedCycles');
      }
    );

    const unsubMatchResults = onSnapshot(
      query(collection(db, 'matchResults'), where('isPublic', '==', true), limit(500)),
      (snap) => {
        setFirebaseMatchResultDocs(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<MatchResultDocRecord, 'id'>),
          }))
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'matchResults');
      }
    );

    return () => {
      unsubTickets();
      unsubUpdates();
      unsubStats();
      unsubFeedStates();
      unsubCycles();
      unsubMatchResults();
    };
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadAdminFactoryState();
    }
  }, [isAdmin, loadAdminFactoryState]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshPortfolio();
      void refreshAnalytics();
      void refreshScheduler();
    }, 30000);
    return () => clearInterval(timer);
  }, [refreshPortfolio, refreshAnalytics, refreshScheduler]);

  const executeScan = useCallback(
    async (overrideConfig?: ScannerConfig): Promise<ScanResult | null> => {
      const cfg: ScannerConfig = {
        ...(overrideConfig || scannerConfig),
        bookmakerId: (overrideConfig || scannerConfig).bookmakerId || activeBookmaker,
      };
      setScanning(true);
      setScanError(null);
      try {
        const result = await apiClient.runScanner(cfg);
        setScanResult(result);
        pushNotification(
          'SCAN_COMPLETE',
          `Scan Complete: ${result.qualifyingCount} Selections`,
          `Scanned ${result.totalMatchesScanned} matches on ${activeBookmakerInfo.shortName} (${cfg.minOdds.toFixed(
            2
          )}–${cfg.maxOdds.toFixed(2)}).`
        );
        if (user && user.emailVerified) {
          void saveScanHistoryRecord(user.uid, result).catch(() => {});
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Odds scan failed';
        setScanError(msg);
        pushNotification('INTEGRATION_ERROR', 'Scanner Execution Failed', msg);
        return null;
      } finally {
        setScanning(false);
      }
    },
    [activeBookmaker, activeBookmakerInfo.shortName, scannerConfig, pushNotification, user]
  );

  useEffect(() => {
    if (!autoRescanSec || autoRescanSec < 15) return;
    const timer = setInterval(() => {
      void executeScan();
    }, autoRescanSec * 1000);
    return () => clearInterval(timer);
  }, [autoRescanSec, executeScan]);

  const resetScannerConfig = useCallback(() => {
    setScannerConfig({
      ...DEFAULT_SCANNER_CONFIG,
      bookmakerId: activeBookmaker,
      markets: activeBookmaker === 'BETPAWA_TZ' ? ['4693', '5000'] : ['10', '18'],
      startDate: getTodayInputDate(0),
      endDate: getTodayInputDate(12),
    });
  }, [activeBookmaker]);

  const addToBetslip = useCallback(
    (sel: Omit<BetslipSelection, 'addedAt'>) => {
      const taggedSel: BetslipSelection = {
        ...sel,
        bookmakerId: sel.bookmakerId || activeBookmaker,
        bookmakerName: sel.bookmakerName || activeBookmakerInfo.name,
        addedAt: new Date().toISOString(),
      };
      let rejectedReason: string | null = null;

      setBetslip((prev) => {
        if (prev.length > 0) {
          const slipBk = prev[0].bookmakerId || 'SPORTYBET_TZ';
          if (slipBk !== taggedSel.bookmakerId) {
            const slipBkName =
              bookmakers.find((b) => b.id === slipBk)?.shortName || slipBk;
            rejectedReason = `Cannot mix ${taggedSel.bookmakerName} with existing ${slipBkName} selections on one betslip. Clear the betslip first.`;
            return prev;
          }
        }
        if (prev.some((p) => p.selectionKey === taggedSel.selectionKey)) {
          return prev;
        }
        return [...prev, taggedSel];
      });

      if (rejectedReason) {
        pushNotification('INTEGRATION_ERROR', 'Platform Isolation Guard', rejectedReason);
        return;
      }
      setValidation(null);
    },
    [activeBookmaker, activeBookmakerInfo.name, bookmakers, pushNotification]
  );

  const updateBetslipSelection = useCallback(
    (oldSelectionKey: string, replacement: Omit<BetslipSelection, 'addedAt'>) => {
      setBetslip((prev) =>
        prev.map((s) =>
          s.selectionKey === oldSelectionKey
            ? { ...replacement, addedAt: new Date().toISOString() }
            : s
        )
      );
      setValidation(null);
    },
    []
  );

  const acceptUpdatedOdds = useCallback((selectionKey: string, newOdds: number) => {
    setBetslip((prev) =>
      prev.map((s) => (s.selectionKey === selectionKey ? { ...s, odds: newOdds } : s))
    );
    setValidation(null);
  }, []);

  const removeFromBetslip = useCallback((selectionKey: string) => {
    setBetslip((prev) => prev.filter((s) => s.selectionKey !== selectionKey));
    setValidation(null);
  }, []);

  const replaceBetslip = useCallback(
    (selections: BetslipSelection[]) => {
      if (selections.length === 0) {
        setBetslip([]);
        setValidation(null);
        return;
      }
      const baseBookmaker = selections[0]?.bookmakerId || activeBookmaker;
      const baseInfo = bookmakers.find((b) => b.id === baseBookmaker) || activeBookmakerInfo;
      const normalized = selections
        .filter((s) => (s.bookmakerId || baseBookmaker) === baseBookmaker)
        .map((s) => ({
          ...s,
          bookmakerId: baseBookmaker,
          bookmakerName: s.bookmakerName || baseInfo.name,
        }));
      setBetslip(normalized);
      setValidation(null);
    },
    [activeBookmaker, activeBookmakerInfo, bookmakers]
  );

  const clearBetslip = useCallback(() => {
    setBetslip([]);
    setValidation(null);
  }, []);

  const validateSlipNow = useCallback(async (): Promise<BetslipValidationResponse | null> => {
    if (betslip.length === 0) return null;
    const slipBookmaker = betslip[0]?.bookmakerId || activeBookmaker;
    const slipBookmakerName =
      bookmakers.find((b) => b.id === slipBookmaker)?.shortName || activeBookmakerInfo.shortName;
    setValidatingSlip(true);
    try {
      const res = await apiClient.validateBetslip(betslip, slipBookmaker);
      setValidation(res);
      if (res.hasOddsChanges) {
        pushNotification(
          'ODDS_SHIFT',
          'Odds Movement Detected',
          `One or more selections on your betslip changed odds on ${slipBookmakerName}.`
        );
      }
      if (res.hasSuspendedMarkets || res.hasMissingSelections) {
        pushNotification(
          'MARKET_UNAVAILABLE',
          'Market Suspension / Removal',
          'One or more betslip selections are suspended or no longer offered.'
        );
      }
      return res;
    } catch (err) {
      pushNotification(
        'INTEGRATION_ERROR',
        'Betslip Validation Failed',
        err instanceof Error
          ? err.message
          : `Unable to validate betslip against ${slipBookmakerName}.`
      );
      return null;
    } finally {
      setValidatingSlip(false);
    }
  }, [activeBookmaker, activeBookmakerInfo.shortName, betslip, bookmakers, pushNotification]);

  const generateBookingCode = useCallback(async (): Promise<BookingCodeResponse | null> => {
    if (betslip.length === 0) return null;
    const slipBookmaker = betslip[0]?.bookmakerId || activeBookmaker;
    const slipBookmakerName =
      bookmakers.find((b) => b.id === slipBookmaker)?.shortName || activeBookmakerInfo.shortName;
    setGeneratingCode(true);
    setCodeError(null);
    try {
      const booking = await apiClient.createBookingCode(betslip, slipBookmaker);
      setLatestBookingCode(booking);
      pushNotification(
        'CODE_CREATED',
        `Booking Code Created: ${booking.shareCode}`,
        `Verified ${booking.selectionCount} legs @ ${booking.combinedOdds.toFixed(
          2
        )} total odds on ${slipBookmakerName}.`
      );
      if (user && user.emailVerified) {
        void saveBookingCodeRecord(user.uid, booking, stakeTzs).catch(() => {});
      }
      return booking;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create booking code';
      setCodeError(msg);
      pushNotification('INTEGRATION_ERROR', 'Booking Code Generation Failed', msg);
      return null;
    } finally {
      setGeneratingCode(false);
    }
  }, [activeBookmaker, activeBookmakerInfo.shortName, betslip, bookmakers, pushNotification, user, stakeTzs]);

  const verifyAndLoadBookingCode = useCallback(
    async (
      code: string,
      loadIntoSlip = false,
      targetBookmaker?: BookmakerId
    ): Promise<BookingCodeResponse | null> => {
      setCodeError(null);
      const bk = targetBookmaker || activeBookmaker;
      try {
        const res = await apiClient.verifyBookingCode(code, bk);
        setLatestBookingCode(res);
        if (loadIntoSlip && res.selections.length > 0) {
          setBetslip(res.selections);
          setValidation(null);
        }
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Booking code lookup failed';
        setCodeError(msg);
        return null;
      }
    },
    [activeBookmaker]
  );

  // Admin Control Center Actions
  const requireAdminToken = useCallback(async (): Promise<string> => {
    if (!isAdmin) {
      throw new Error('Administrator authorization is required.');
    }
    const token = await getIdToken();
    if (!token) {
      throw new Error('Missing Firebase authentication token.');
    }
    return token;
  }, [getIdToken, isAdmin]);

  const syncPublicMirrorIfAdmin = useCallback(
    async (
      ticketsToSync: GeneratedTicket[] = [],
      status?: SchedulerStatus | null,
      extra?: {
        cycles?: GenerationCycle[];
        feedStates?: Record<BookmakerId, BookmakerFeedState>;
      }
    ) => {
      if (!user || !user.emailVerified || !isAdmin) return;
      const list = Array.isArray(ticketsToSync) ? ticketsToSync : [];
      for (let i = 0; i < Math.min(list.length, 200); i += 10) {
        const chunk = list.slice(i, i + 10);
        await Promise.all(
          chunk.map((t) => syncPublicTicketBundle(user.uid, t).catch(() => {}))
        );
      }

      const statesToSync = extra?.feedStates || status?.byBookmaker || feedStates;
      for (const bk of ['SPORTYBET_TZ', 'BETPAWA_TZ'] as BookmakerId[]) {
        if (statesToSync[bk]) {
          void syncBookmakerFeedState(statesToSync[bk]).catch(() => {});
        }
      }

      const cyclesToSync = extra?.cycles || feedCycles;
      for (const cyc of cyclesToSync.slice(0, 30)) {
        void syncFeedCycleRecord(cyc).catch(() => {});
      }

      const todayKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Dar_es_Salaam',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const combined = mergeImmutableFeeds(firebaseTickets, list.length > 0 ? list : apiTickets);
      const todayCombined = combined.filter((t) => t.generatedDateKey === todayKey);

      void savePublicStatsRecord({
        statDocId: 'daily',
        dailyTicketTarget: status?.dailyTicketTarget ?? factoryConfig.dailyTicketTarget,
        totalGeneratedToday: Math.max(status?.totalDailyTicketsToday ?? 0, todayCombined.length),
        bookingCodesGeneratedToday: Math.max(
          status?.bookingCodesGeneratedToday ?? 0,
          todayCombined.filter((t) => Boolean(t.shareCode)).length
        ),
        liveFootballCount: todayCombined.filter((t) => t.feedSection === 'LIVE_FOOTBALL').length,
        otherSportsCount: todayCombined.filter((t) => t.feedSection === 'OTHER_SPORTS').length,
        upcomingActiveCount: todayCombined.filter(
          (t) => (t.feedSection || 'UPCOMING') === 'UPCOMING' && !isTerminalStatus(t.status)
        ).length,
        settledWonCount: combined.filter((t) => t.status === 'WON').length,
        settledLostCount: combined.filter((t) => t.status === 'LOST').length,
        settledVoidCount: combined.filter((t) => t.status === 'VOID').length,
        lastScanningAt: status?.lastScanningAt ?? schedulerStatus?.lastScanningAt ?? null,
        lastSettlementAt: status?.lastSettlementAt ?? schedulerStatus?.lastSettlementAt ?? null,
      }).catch(() => {});

      for (const bk of ['SPORTYBET_TZ', 'BETPAWA_TZ'] as BookmakerId[]) {
        const bkAll = combined.filter((t) => (t.bookmakerId || 'SPORTYBET_TZ') === bk);
        const bkToday = bkAll.filter((t) => t.generatedDateKey === todayKey);
        const st = statesToSync[bk];
        void savePublicStatsRecord({
          statDocId: `daily_${bk}`,
          bookmakerId: bk,
          activeCycleId: st?.activeCycleId ?? null,
          generationLocked: st?.generationLocked ?? false,
          lockStatus: st?.lockStatus ?? 'UNLOCKED',
          lockReason: st?.lockReason ?? '',
          dailyTicketTarget: status?.dailyTicketTarget ?? factoryConfig.dailyTicketTarget,
          totalGeneratedToday: bkToday.length,
          bookingCodesGeneratedToday: bkToday.filter((t) => Boolean(t.shareCode)).length,
          liveFootballCount: bkToday.filter((t) => t.feedSection === 'LIVE_FOOTBALL').length,
          otherSportsCount: bkToday.filter((t) => t.feedSection === 'OTHER_SPORTS').length,
          upcomingActiveCount: bkToday.filter(
            (t) => (t.feedSection || 'UPCOMING') === 'UPCOMING' && !isTerminalStatus(t.status)
          ).length,
          unfinishedMatchesCount: st?.unfinishedMatchesCount ?? 0,
          unsettledTicketsCount: st?.unsettledTicketsCount ?? 0,
          settledWonCount: bkAll.filter((t) => t.status === 'WON').length,
          settledLostCount: bkAll.filter((t) => t.status === 'LOST').length,
          settledVoidCount: bkAll.filter((t) => t.status === 'VOID').length,
          lastScanningAt: status?.lastScanningAt ?? schedulerStatus?.lastScanningAt ?? null,
          lastSettlementAt: st?.lastResultCheckAt ?? status?.lastSettlementAt ?? null,
        }).catch(() => {});
      }
    },
    [
      apiTickets,
      factoryConfig.dailyTicketTarget,
      feedCycles,
      feedStates,
      firebaseTickets,
      isAdmin,
      schedulerStatus?.lastScanningAt,
      schedulerStatus?.lastSettlementAt,
      user,
    ]
  );

  // Admin Cold-Start Hydration (Firebase -> Backend Memory) & Background Auto-Mirror (Backend -> Firebase)
  useEffect(() => {
    if (!isAdmin || !user?.emailVerified || !firebaseFeedLoaded || !apiLoaded) return;

    const apiById = new Map(apiTickets.map((t) => [t.internalTicketId, t]));
    const fbById = new Map(firebaseTickets.map((t) => [t.internalTicketId, t]));

    const missingInBackend = firebaseTickets.filter((fb) => {
      const apiMatch = apiById.get(fb.internalTicketId);
      if (!apiMatch) return true;
      if (isTerminalStatus(fb.status) && !isTerminalStatus(apiMatch.status)) return true;
      const fbSettled = fb.selectionSettlements.filter((s) => isSelectionTerminal(s.status)).length;
      const apiSettled = apiMatch.selectionSettlements.filter((s) =>
        isSelectionTerminal(s.status)
      ).length;
      return fbSettled > apiSettled;
    });

    if (missingInBackend.length > 0 || (firebaseFeedCycleDocs.length > 0 && apiFeedCycles.length === 0)) {
      const hydrationSig =
        missingInBackend.map((t) => `${t.internalTicketId}:${t.status}`).join('|') +
        `#cyc:${firebaseFeedCycleDocs.length}`;
      if (hydratedKeyRef.current !== hydrationSig) {
        hydratedKeyRef.current = hydrationSig;
        void getIdToken().then((token) => {
          if (!token) return;
          void apiClient
            .hydrateTickets(firebaseTickets.slice(0, 200), token, {
              cycles: feedCycles,
              feedStates,
            })
            .then(() => {
              void refreshPortfolio();
              void refreshScheduler();
              void refreshAnalytics();
            })
            .catch(() => {});
        });
      }
    }

    const unsyncedToFirebase = apiTickets.filter((api) => {
      const fb = fbById.get(api.internalTicketId);
      if (!fb) return true;
      if (fb.status === 'WON' || fb.status === 'VOID') return false;
      if (fb.status === 'LOST') {
        const fbSettled = fb.selectionSettlements.filter((s) => isSelectionTerminal(s.status)).length;
        const apiSettled = api.selectionSettlements.filter((s) =>
          isSelectionTerminal(s.status)
        ).length;
        return apiSettled > fbSettled;
      }
      return (
        isTerminalStatus(api.status) ||
        api.status !== fb.status ||
        (api.settledMatchCount ?? 0) !== (fb.settledMatchCount ?? 0) ||
        (Boolean(api.shareCode) && !fb.shareCode)
      );
    });

    if (unsyncedToFirebase.length > 0) {
      const mirrorSig = unsyncedToFirebase
        .slice(0, 40)
        .map(
          (t) =>
            `${t.internalTicketId}:${t.status}:${t.settledMatchCount ?? 0}:${t.shareCode || ''}`
        )
        .join('|');
      if (autoMirroredKeyRef.current !== mirrorSig) {
        autoMirroredKeyRef.current = mirrorSig;
        void syncPublicMirrorIfAdmin(unsyncedToFirebase, schedulerStatusRaw, {
          cycles: feedCycles,
          feedStates,
        });
      }
    }
  }, [
    apiFeedCycles.length,
    apiLoaded,
    apiTickets,
    feedCycles,
    feedStates,
    firebaseFeedCycleDocs.length,
    firebaseFeedLoaded,
    firebaseTickets,
    getIdToken,
    isAdmin,
    refreshAnalytics,
    refreshPortfolio,
    refreshScheduler,
    schedulerStatusRaw,
    syncPublicMirrorIfAdmin,
    user?.emailVerified,
  ]);

  const saveFactoryConfig = useCallback(
    async (cfg: DailyFactoryConfig) => {
      const token = await requireAdminToken();
      const res = await apiClient.updateDailyFactoryConfig(cfg, token);
      setFactoryConfig(res.config);
      setSchedulerStatus(res.status);
      setAutomationLogs(res.logs);
      if (user && user.emailVerified && isAdmin) {
        void saveAdminSettingsRecord(user, res.config).catch(() => {});
        if (res.logs[0]) {
          void saveAdminAuditLogRecord(user, res.logs[0]).catch(() => {});
        }
      }
      pushNotification(
        'SCAN_COMPLETE',
        'Daily Factory Settings Updated',
        `Saved ${res.config.minIndividualOdds.toFixed(2)}–${res.config.maxIndividualOdds.toFixed(
          2
        )} individual odds, ${res.config.dailyTicketTarget} upcoming target, ${
          res.config.liveFootballTarget ?? 12
        } live football, ${res.config.otherSportsTarget ?? 12} other games.`
      );
    },
    [isAdmin, pushNotification, requireAdminToken, user]
  );

  const toggleAutomation = useCallback(
    async (mode: 'start' | 'stop' | 'pause' | 'resume') => {
      const token = await requireAdminToken();
      const res = await apiClient.toggleFactoryAutomation(mode, token);
      setFactoryConfig(res.config);
      setSchedulerStatus(res.status);
      setAutomationLogs(res.logs);
      if (user && user.emailVerified && isAdmin) {
        void saveAdminSettingsRecord(user, res.config).catch(() => {});
        if (res.logs[0]) {
          void saveAdminAuditLogRecord(user, res.logs[0]).catch(() => {});
        }
      }
      pushNotification(
        'SCAN_COMPLETE',
        `Factory ${mode.toUpperCase()}`,
        res.logs[0]?.message || `Automation ${mode} executed.`
      );
    },
    [isAdmin, pushNotification, requireAdminToken, user]
  );

  const runFactoryNow = useCallback(
    async (targetBookmaker?: BookmakerId) => {
      setRunningFactory(true);
      try {
        const token = await requireAdminToken();
        const res = await apiClient.runDailyFactoryNow(token, targetBookmaker);
        setApiTickets(res.tickets.filter((t) => isTicketAllowedInDailyFeed(t)));
        setSchedulerStatus(res.status);
        if (res.feedStates) setApiFeedStates(res.feedStates);
        if (Array.isArray(res.feedCycles)) setApiFeedCycles(res.feedCycles);
        if (Array.isArray(res.status?.unfinishedMatches)) {
          setApiUnfinishedMatches(res.status.unfinishedMatches);
        }
        if (Array.isArray(res.status?.verificationFailures)) {
          setApiVerificationFailures(res.status.verificationFailures);
        }
        setAutomationLogs(res.logs);
        await refreshAnalytics();
        const toMirror = Array.isArray(res.newTickets) ? res.newTickets : [];
        void syncPublicMirrorIfAdmin(toMirror, res.status, {
          cycles: res.feedCycles,
          feedStates: res.feedStates,
        });
        if (user && user.emailVerified && isAdmin) {
          void saveAdminAuditLogRecord(user, res.log).catch(() => {});
        }
        pushNotification(
          res.log.status === 'SKIPPED' ? 'MARKET_UNAVAILABLE' : 'SCAN_COMPLETE',
          res.log.status === 'SKIPPED' ? 'Cycle Lock Active' : 'Daily Factory Executed',
          res.log.message
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Daily Factory execution failed';
        pushNotification('INTEGRATION_ERROR', 'Daily Factory Error', msg);
      } finally {
        setRunningFactory(false);
      }
    },
    [isAdmin, pushNotification, refreshAnalytics, requireAdminToken, syncPublicMirrorIfAdmin, user]
  );

  const deletePortfolioTicket = useCallback(
    async (internalTicketId: string) => {
      const token = await requireAdminToken();
      await apiClient.deleteTicket(internalTicketId, token);
      setApiTickets((prev) => prev.filter((t) => t.internalTicketId !== internalTicketId));
      setFirebaseTicketDocs((prev) => prev.filter((t) => t.internalTicketId !== internalTicketId));
      setFirebaseUpdateDocs((prev) => prev.filter((t) => t.internalTicketId !== internalTicketId));
      if (selectedTicketId === internalTicketId) {
        setSelectedTicketId(null);
        setActiveSection('feed');
      }
      await refreshAnalytics();
      await refreshScheduler();
      if (isAdmin && user?.emailVerified) {
        void deletePublicTicketBundle(internalTicketId).catch(() => {});
      }
    },
    [isAdmin, refreshAnalytics, refreshScheduler, requireAdminToken, selectedTicketId, setActiveSection, user?.emailVerified]
  );

  const createBookingCodeForTicket = useCallback(
    async (internalTicketId: string): Promise<GeneratedTicket | null> => {
      try {
        const token = await requireAdminToken();
        const res = await apiClient.createTicketBookingCode(internalTicketId, token);
        if (res.ticket) {
          setApiTickets((prev) =>
            prev.map((t) => (t.internalTicketId === internalTicketId ? res.ticket : t))
          );
          await refreshAnalytics();
          await refreshScheduler();
          if (user && user.emailVerified && isAdmin) {
            void syncPublicTicketBundle(user.uid, res.ticket).catch(() => {});
          }
          pushNotification(
            'CODE_CREATED',
            `Booking Code: ${res.booking.shareCode}`,
            `Attached genuine booking code to ${internalTicketId}.`
          );
          return res.ticket;
        }
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Booking code creation failed';
        await refreshPortfolio();
        pushNotification('INTEGRATION_ERROR', 'Booking Code Failed', msg);
        throw err;
      }
    },
    [isAdmin, pushNotification, refreshAnalytics, refreshPortfolio, refreshScheduler, requireAdminToken, user]
  );

  const retryFailedBookingCodes = useCallback(
    async (ticketIds?: string[]) => {
      setRetryingCodes(true);
      try {
        const token = await requireAdminToken();
        const res = await apiClient.retryFailedBookingCodes(token, ticketIds);
        setApiTickets(res.tickets.filter((t) => isTicketAllowedInDailyFeed(t)));
        setSchedulerStatus(res.status);
        setAutomationLogs(res.logs);
        await refreshAnalytics();
        void syncPublicMirrorIfAdmin(res.tickets, res.status);
        if (user && user.emailVerified && isAdmin) {
          void saveAdminAuditLogRecord(user, res.log).catch(() => {});
        }
        pushNotification('CODE_CREATED', 'Booking Code Retry Complete', res.log.message);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Retry booking codes failed';
        pushNotification('INTEGRATION_ERROR', 'Retry Booking Codes Error', msg);
      } finally {
        setRetryingCodes(false);
      }
    },
    [isAdmin, pushNotification, refreshAnalytics, requireAdminToken, syncPublicMirrorIfAdmin, user]
  );

  const trackAllResultsNow = useCallback(
    async (ticketIds?: string[], targetBookmaker?: BookmakerId) => {
      setTrackingResults(true);
      try {
        const token = await requireAdminToken();
        const res = await apiClient.trackTicketsResults(token, ticketIds, targetBookmaker);
        setApiTickets(res.tickets.filter((t) => isTicketAllowedInDailyFeed(t)));
        setSchedulerStatus(res.status);
        if (res.feedStates) setApiFeedStates(res.feedStates);
        if (Array.isArray(res.feedCycles)) setApiFeedCycles(res.feedCycles);
        if (Array.isArray(res.status?.unfinishedMatches)) {
          setApiUnfinishedMatches(res.status.unfinishedMatches);
        }
        if (Array.isArray(res.status?.verificationFailures)) {
          setApiVerificationFailures(res.status.verificationFailures);
        }
        setAutomationLogs(res.logs);
        await refreshAnalytics();
        const mirrorBatch = Array.isArray(res.updatedTickets) ? res.updatedTickets : [];
        void syncPublicMirrorIfAdmin(mirrorBatch, res.status, {
          cycles: res.feedCycles,
          feedStates: res.feedStates,
        });
        if (user && user.emailVerified && isAdmin) {
          void saveAdminAuditLogRecord(user, res.log).catch(() => {});
        }
        pushNotification('SCAN_COMPLETE', 'Settlement Tracker Updated', res.log.message);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Results check failed';
        pushNotification('INTEGRATION_ERROR', 'Results Tracking Error', msg);
      } finally {
        setTrackingResults(false);
      }
    },
    [isAdmin, pushNotification, refreshAnalytics, requireAdminToken, syncPublicMirrorIfAdmin, user]
  );

  const retryFailedResultChecks = useCallback(
    async (targetBookmaker?: BookmakerId) => {
      setRetryingResults(true);
      try {
        const token = await requireAdminToken();
        const res = await apiClient.retryFailedResultChecks(token, targetBookmaker);
        setApiTickets(res.tickets.filter((t) => isTicketAllowedInDailyFeed(t)));
        setSchedulerStatus(res.status);
        if (res.feedStates) setApiFeedStates(res.feedStates);
        if (Array.isArray(res.feedCycles)) setApiFeedCycles(res.feedCycles);
        if (Array.isArray(res.status?.unfinishedMatches)) {
          setApiUnfinishedMatches(res.status.unfinishedMatches);
        }
        if (Array.isArray(res.status?.verificationFailures)) {
          setApiVerificationFailures(res.status.verificationFailures);
        }
        setAutomationLogs(res.logs);
        await refreshAnalytics();
        void syncPublicMirrorIfAdmin(res.updatedTickets || [], res.status, {
          cycles: res.feedCycles,
          feedStates: res.feedStates,
        });
        if (user && user.emailVerified && isAdmin) {
          void saveAdminAuditLogRecord(user, res.log).catch(() => {});
        }
        pushNotification('SCAN_COMPLETE', 'Failed Result Checks Retried', res.log.message);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Retry failed result checks errored';
        pushNotification('INTEGRATION_ERROR', 'Retry Results Error', msg);
      } finally {
        setRetryingResults(false);
      }
    },
    [isAdmin, pushNotification, refreshAnalytics, requireAdminToken, syncPublicMirrorIfAdmin, user]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <OddsHunterContext.Provider
      value={{
        activeSection,
        setActiveSection,
        selectedTicketId,
        selectedTicket,
        openTicketDetails,
        closeTicketDetails,
        platformSettings,
        refreshPlatformStatus,
        bookmakers,
        activeBookmaker,
        activeBookmakerInfo,
        setActiveBookmaker,
        markets,
        leagues,
        liveMatches,
        upcomingMatches,
        upcomingTotal,
        upcomingPage,
        loadingLive,
        loadingUpcoming,
        loadingLeagues,
        liveError,
        upcomingError,
        refreshLiveMatches,
        loadUpcomingMatches,
        selectedMatchId,
        openMatchDetail: (id) => setSelectedMatchId(id),
        closeMatchDetail: () => setSelectedMatchId(null),
        scannerConfig,
        setScannerConfig,
        resetScannerConfig,
        scanResult,
        setScanResult,
        scanning,
        scanError,
        executeScan,
        autoRescanSec,
        setAutoRescanSec,
        betslip,
        stakeTzs,
        setStakeTzs,
        addToBetslip,
        updateBetslipSelection,
        acceptUpdatedOdds,
        removeFromBetslip,
        replaceBetslip,
        clearBetslip,
        validation,
        validatingSlip,
        validateSlipNow,
        latestBookingCode,
        generatingCode,
        codeError,
        generateBookingCode,
        verifyAndLoadBookingCode,
        diagnostics,
        diagnosticsCheckedAt,
        loadingDiagnostics,
        runDiagnosticsCheck,
        researchReport,
        notifications,
        unreadCount,
        pushNotification,
        markLocalNotificationRead,
        portfolioTickets,
        activeBookmakerTickets,
        loadingPortfolio,
        refreshPortfolio,
        isTicketFavorited,
        toggleFavoriteTicket,
        analyticsSummary,
        refreshAnalytics,
        schedulerStatus,
        refreshScheduler,
        feedStates,
        activeFeedState,
        feedCycles,
        activeCycle,
        unfinishedMatches,
        verificationFailures,
        matchResults,
        factoryConfig,
        setFactoryConfig,
        automationLogs,
        loadingAdminState,
        runningFactory,
        trackingResults,
        retryingCodes,
        retryingResults,
        loadAdminFactoryState,
        saveFactoryConfig,
        toggleAutomation,
        runFactoryNow,
        deletePortfolioTicket,
        createBookingCodeForTicket,
        retryFailedBookingCodes,
        trackAllResultsNow,
        retryFailedResultChecks,
      }}
    >
      {children}
    </OddsHunterContext.Provider>
  );
}

export function useOddsHunter(): OddsHunterContextValue {
  const ctx = useContext(OddsHunterContext);
  if (!ctx) {
    throw new Error('useOddsHunter must be used inside OddsHunterProvider');
  }
  return ctx;
}

export function selectionFromQualifying(q: QualifyingSelection): Omit<BetslipSelection, 'addedAt'> {
  return {
    selectionKey: q.selectionKey,
    bookmakerId: q.bookmakerId,
    bookmakerName: q.bookmakerName,
    sportId: q.sportId,
    sportName: q.sportName,
    eventId: q.eventId,
    homeTeam: q.homeTeam,
    awayTeam: q.awayTeam,
    leagueName: q.leagueName,
    country: q.country,
    estimateStartTime: q.estimateStartTime,
    matchStatus: q.matchStatus,
    isLive: q.isLive,
    marketId: q.marketId,
    marketName: q.marketName,
    specifier: q.specifier,
    outcomeId: q.outcomeId,
    outcomeDesc: q.outcomeDesc,
    odds: q.odds,
  };
}
