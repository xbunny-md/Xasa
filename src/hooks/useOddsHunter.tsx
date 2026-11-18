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
  syncPublicTicketBundle,
  updateUserPreferences,
  type AppNotificationRecord,
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
  BookmakerId,
  BookingCodeResponse,
  DailyFactoryConfig,
  DiagnosticCheck,
  GeneratedTicket,
  LeagueDirectoryItem,
  MarketCatalogItem,
  NormalizedMatch,
  OddsCategoryConfig,
  PerformanceAnalyticsSummary,
  PlatformSettings,
  QualifyingSelection,
  ResearchReport,
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

    // Never mutate or overwrite immutable ticket core selections/category/odds or locked terminal outcomes
    if (isTerminalStatus(existing.status)) {
      continue;
    }

    const shouldTakeMutableUpdate =
      isTerminalStatus(api.status) ||
      (Boolean(api.shareCode) && !existing.shareCode) ||
      api.status !== existing.status ||
      api.selectionSettlements.length > existing.selectionSettlements.length;

    if (shouldTakeMutableUpdate) {
      merged.set(api.internalTicketId, {
        ...existing,
        status: api.status,
        effectiveCombinedOdds: api.effectiveCombinedOdds,
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
  loadingPortfolio: boolean;
  refreshPortfolio: () => Promise<void>;
  isTicketFavorited: (internalTicketId: string) => boolean;
  toggleFavoriteTicket: (ticket: GeneratedTicket) => Promise<void>;
  analyticsSummary: PerformanceAnalyticsSummary | null;
  refreshAnalytics: () => Promise<void>;
  schedulerStatus: SchedulerStatus | null;
  refreshScheduler: () => Promise<void>;

  // Admin-Only State & Controls
  factoryConfig: DailyFactoryConfig;
  setFactoryConfig: React.Dispatch<React.SetStateAction<DailyFactoryConfig>>;
  automationLogs: AutomationJobLog[];
  loadingAdminState: boolean;
  runningFactory: boolean;
  trackingResults: boolean;
  retryingCodes: boolean;
  loadAdminFactoryState: () => Promise<void>;
  saveFactoryConfig: (cfg: DailyFactoryConfig) => Promise<void>;
  toggleAutomation: (mode: 'start' | 'stop' | 'pause' | 'resume') => Promise<void>;
  runFactoryNow: () => Promise<void>;
  deletePortfolioTicket: (internalTicketId: string) => Promise<void>;
  createBookingCodeForTicket: (internalTicketId: string) => Promise<GeneratedTicket | null>;
  retryFailedBookingCodes: (ticketIds?: string[]) => Promise<void>;
  trackAllResultsNow: (ticketIds?: string[]) => Promise<void>;
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
  const [firebaseFeedLoaded, setFirebaseFeedLoaded] = useState(false);
  const [apiTickets, setApiTickets] = useState<GeneratedTicket[]>([]);
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

  const loadingPortfolio = !firebaseFeedLoaded && !apiLoaded;

  const schedulerStatus = useMemo<SchedulerStatus | null>(() => {
    if (!schedulerStatusRaw && !firebasePublicStats) return null;
    const base = schedulerStatusRaw;
    const fb = firebasePublicStats;
    const todayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Dar_es_Salaam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const todayMerged = portfolioTickets.filter((t) => t.generatedDateKey === todayKey);

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
      totalDailyTicketsToday: Math.max(
        base?.totalDailyTicketsToday ?? 0,
        fb?.totalGeneratedToday ?? 0,
        todayMerged.length
      ),
      dailyTicketTarget: base?.dailyTicketTarget ?? fb?.dailyTicketTarget ?? 55,
      liveFootballCount: Math.max(
        base?.liveFootballCount ?? 0,
        fb?.liveFootballCount ?? 0,
        todayMerged.filter((t) => t.feedSection === 'LIVE_FOOTBALL').length
      ),
      otherSportsCount: Math.max(
        base?.otherSportsCount ?? 0,
        fb?.otherSportsCount ?? 0,
        todayMerged.filter((t) => t.feedSection === 'OTHER_SPORTS').length
      ),
      upcomingActiveCount: Math.max(
        base?.upcomingActiveCount ?? 0,
        fb?.upcomingActiveCount ?? 0,
        todayMerged.filter(
          (t) => (t.feedSection || 'UPCOMING') === 'UPCOMING' && !isTerminalStatus(t.status)
        ).length
      ),
      settledWonCount: Math.max(
        base?.settledWonCount ?? 0,
        fb?.settledWonCount ?? 0,
        portfolioTickets.filter((t) => t.status === 'WON').length
      ),
      settledLostCount: Math.max(
        base?.settledLostCount ?? 0,
        fb?.settledLostCount ?? 0,
        portfolioTickets.filter((t) => t.status === 'LOST').length
      ),
      settledVoidCount: Math.max(
        base?.settledVoidCount ?? 0,
        fb?.settledVoidCount ?? 0,
        portfolioTickets.filter((t) => t.status === 'VOID').length
      ),
      bookingCodesGeneratedToday: Math.max(
        base?.bookingCodesGeneratedToday ?? 0,
        fb?.bookingCodesGeneratedToday ?? 0,
        todayMerged.filter((t) => Boolean(t.shareCode)).length
      ),
      bookingCodeFailuresToday: base?.bookingCodeFailuresToday ?? 0,
      dailyShortfallReason: base?.dailyShortfallReason ?? null,
    };
  }, [schedulerStatusRaw, firebasePublicStats, portfolioTickets]);

  const analyticsSummary = useMemo<PerformanceAnalyticsSummary | null>(() => {
    if (
      analyticsSummaryRaw &&
      analyticsSummaryRaw.totalGenerated >= portfolioTickets.length
    ) {
      return analyticsSummaryRaw;
    }
    if (portfolioTickets.length === 0) {
      return analyticsSummaryRaw;
    }

    const todayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Dar_es_Salaam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const wonCount = portfolioTickets.filter((t) => t.status === 'WON').length;
    const lostCount = portfolioTickets.filter((t) => t.status === 'LOST').length;
    const voidCount = portfolioTickets.filter((t) => t.status === 'VOID').length;
    const partiallySettledCount = portfolioTickets.filter(
      (t) => t.status === 'PARTIALLY_SETTLED'
    ).length;
    const pendingOrLiveCount = portfolioTickets.filter(
      (t) => t.status === 'PENDING' || t.status === 'LIVE'
    ).length;
    const unverifiedCount = portfolioTickets.filter((t) => t.status === 'UNVERIFIED').length;
    const settledNonVoid = wonCount + lostCount;

    const buildRows = (
      groups: Map<string, GeneratedTicket[]>
    ): PerformanceAnalyticsSummary['byCategory'] =>
      Array.from(groups.entries()).map(([label, list]) => {
        const won = list.filter((x) => x.status === 'WON').length;
        const lost = list.filter((x) => x.status === 'LOST').length;
        const voided = list.filter((x) => x.status === 'VOID').length;
        const pending = list.filter(
          (x) => x.status === 'PENDING' || x.status === 'LIVE' || x.status === 'PARTIALLY_SETTLED'
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

    for (const t of portfolioTickets) {
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
      totalGenerated: portfolioTickets.length,
      generatedToday: portfolioTickets.filter((t) => t.generatedDateKey === todayKey).length,
      dailyTarget: schedulerStatus?.dailyTicketTarget ?? analyticsSummaryRaw?.dailyTarget ?? 55,
      totalSettled: wonCount + lostCount + voidCount,
      wonCount,
      lostCount,
      voidCount,
      partiallySettledCount,
      pendingOrLiveCount,
      unverifiedCount,
      validSharingCodes: portfolioTickets.filter((t) => Boolean(t.shareCode)).length,
      failedBookingCodes: portfolioTickets.filter((t) => !t.shareCode).length,
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
  }, [analyticsSummaryRaw, portfolioTickets, schedulerStatus]);

  // Admin-Only State
  const [factoryConfig, setFactoryConfig] = useState<DailyFactoryConfig>(
    DEFAULT_FACTORY_CONFIG_UI
  );
  const [automationLogs, setAutomationLogs] = useState<AutomationJobLog[]>([]);
  const [loadingAdminState, setLoadingAdminState] = useState(false);
  const [runningFactory, setRunningFactory] = useState(false);
  const [trackingResults, setTrackingResults] = useState(false);
  const [retryingCodes, setRetryingCodes] = useState(false);

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
      const summary = await apiClient.getPerformanceAnalytics();
      setAnalyticsSummary(summary);
    } catch {
      // Ignore transient analytics fetch error
    }
  }, []);

  const refreshScheduler = useCallback(async () => {
    try {
      const res = await apiClient.getSchedulerStatus();
      setSchedulerStatus(res.status);
    } catch {
      // Ignore transient scheduler fetch error
    }
  }, []);

  const loadAdminFactoryState = useCallback(async () => {
    if (!isAdmin) return;
    const token = await getIdToken();
    if (!token) return;
    setLoadingAdminState(true);
    try {
      const res = await apiClient.getDailyFactoryAdminState(token);
      setFactoryConfig(res.config);
      setSchedulerStatus(res.status);
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

  // Real-Time Firestore Listeners for Immutable Public Daily Feeds & Stats
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

    return () => {
      unsubTickets();
      unsubUpdates();
      unsubStats();
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
    async (ticketsToSync: GeneratedTicket[] = [], status?: SchedulerStatus | null) => {
      if (!user || !user.emailVerified || !isAdmin) return;
      const list = Array.isArray(ticketsToSync) ? ticketsToSync : [];
      for (let i = 0; i < Math.min(list.length, 200); i += 10) {
        const chunk = list.slice(i, i + 10);
        await Promise.all(
          chunk.map((t) => syncPublicTicketBundle(user.uid, t).catch(() => {}))
        );
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
        dailyTicketTarget: status?.dailyTicketTarget ?? factoryConfig.dailyTicketTarget,
        totalGeneratedToday: Math.max(status?.totalDailyTicketsToday ?? 0, todayCombined.length),
        bookingCodesGeneratedToday: Math.max(
          status?.bookingCodesGeneratedToday ?? 0,
          todayCombined.filter((t) => Boolean(t.shareCode)).length
        ),
        liveFootballCount: Math.max(
          status?.liveFootballCount ?? 0,
          todayCombined.filter((t) => t.feedSection === 'LIVE_FOOTBALL').length
        ),
        otherSportsCount: Math.max(
          status?.otherSportsCount ?? 0,
          todayCombined.filter((t) => t.feedSection === 'OTHER_SPORTS').length
        ),
        upcomingActiveCount: Math.max(
          status?.upcomingActiveCount ?? 0,
          todayCombined.filter(
            (t) => (t.feedSection || 'UPCOMING') === 'UPCOMING' && !isTerminalStatus(t.status)
          ).length
        ),
        settledWonCount: Math.max(
          status?.settledWonCount ?? 0,
          combined.filter((t) => t.status === 'WON').length
        ),
        settledLostCount: Math.max(
          status?.settledLostCount ?? 0,
          combined.filter((t) => t.status === 'LOST').length
        ),
        settledVoidCount: Math.max(
          status?.settledVoidCount ?? 0,
          combined.filter((t) => t.status === 'VOID').length
        ),
        lastScanningAt: status?.lastScanningAt ?? schedulerStatus?.lastScanningAt ?? null,
        lastSettlementAt: status?.lastSettlementAt ?? schedulerStatus?.lastSettlementAt ?? null,
      }).catch(() => {});
    },
    [
      apiTickets,
      factoryConfig.dailyTicketTarget,
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
      return isTerminalStatus(fb.status) && !isTerminalStatus(apiMatch.status);
    });

    if (missingInBackend.length > 0) {
      const hydrationSig = missingInBackend.map((t) => `${t.internalTicketId}:${t.status}`).join('|');
      if (hydratedKeyRef.current !== hydrationSig) {
        hydratedKeyRef.current = hydrationSig;
        void getIdToken().then((token) => {
          if (!token) return;
          void apiClient
            .hydrateTickets(firebaseTickets.slice(0, 200), token)
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
      if (isTerminalStatus(fb.status)) return false;
      return (
        isTerminalStatus(api.status) ||
        api.status !== fb.status ||
        (Boolean(api.shareCode) && !fb.shareCode)
      );
    });

    if (unsyncedToFirebase.length > 0) {
      const mirrorSig = unsyncedToFirebase
        .slice(0, 40)
        .map((t) => `${t.internalTicketId}:${t.status}:${t.shareCode || ''}`)
        .join('|');
      if (autoMirroredKeyRef.current !== mirrorSig) {
        autoMirroredKeyRef.current = mirrorSig;
        void syncPublicMirrorIfAdmin(unsyncedToFirebase, schedulerStatusRaw);
      }
    }
  }, [
    apiLoaded,
    apiTickets,
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

  const runFactoryNow = useCallback(async () => {
    setRunningFactory(true);
    try {
      const token = await requireAdminToken();
      const res = await apiClient.runDailyFactoryNow(token);
      setApiTickets(res.tickets.filter((t) => isTicketAllowedInDailyFeed(t)));
      setSchedulerStatus(res.status);
      setAutomationLogs(res.logs);
      await refreshAnalytics();
      const toMirror =
        Array.isArray(res.newTickets) && res.newTickets.length > 0 ? res.newTickets : res.tickets;
      void syncPublicMirrorIfAdmin(toMirror, res.status);
      if (user && user.emailVerified && isAdmin) {
        void saveAdminAuditLogRecord(user, res.log).catch(() => {});
      }
      pushNotification('SCAN_COMPLETE', 'Daily Factory Executed', res.log.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Daily Factory execution failed';
      pushNotification('INTEGRATION_ERROR', 'Daily Factory Error', msg);
    } finally {
      setRunningFactory(false);
    }
  }, [isAdmin, pushNotification, refreshAnalytics, requireAdminToken, syncPublicMirrorIfAdmin, user]);

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
    async (ticketIds?: string[]) => {
      setTrackingResults(true);
      try {
        const token = await requireAdminToken();
        const res = await apiClient.trackTicketsResults(token, ticketIds);
        setApiTickets(res.tickets.filter((t) => isTicketAllowedInDailyFeed(t)));
        setSchedulerStatus(res.status);
        setAutomationLogs(res.logs);
        await refreshAnalytics();
        const mirrorBatch = [
          ...(Array.isArray(res.updatedTickets) ? res.updatedTickets : []),
          ...(Array.isArray(res.replenishedTickets) ? res.replenishedTickets : []),
        ];
        void syncPublicMirrorIfAdmin(mirrorBatch, res.status);
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
        loadingPortfolio,
        refreshPortfolio,
        isTicketFavorited,
        toggleFavoriteTicket,
        analyticsSummary,
        refreshAnalytics,
        schedulerStatus,
        refreshScheduler,
        factoryConfig,
        setFactoryConfig,
        automationLogs,
        loadingAdminState,
        runningFactory,
        trackingResults,
        retryingCodes,
        loadAdminFactoryState,
        saveFactoryConfig,
        toggleAutomation,
        runFactoryNow,
        deletePortfolioTicket,
        createBookingCodeForTicket,
        retryFailedBookingCodes,
        trackAllResultsNow,
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
