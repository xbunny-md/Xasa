import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  History,
  RefreshCw,
  Search,
  Settings,
  Ticket,
  Trophy,
} from 'lucide-react';
import { TicketPosterCard } from '../components/TicketPosterCard.tsx';
import { useOddsHunter } from '../hooks/useOddsHunter.tsx';
import type { FeedSection } from '../types/sportybet.ts';
import { isTicketAllowedInDailyFeed } from '../utils/dailyFeedFilter.ts';
import { formatDateTimeCompact } from '../utils/formatters.ts';

type FeedStatusFilter =
  | 'ALL'
  | 'TODAY'
  | 'UPCOMING'
  | 'PENDING'
  | 'WON'
  | 'LOST'
  | 'VOID'
  | 'UNVERIFIED';
type FeedSectionFilter = 'ALL' | FeedSection;
type CycleScopeFilter = 'ALL_HISTORY' | 'ACTIVE_CYCLE' | string;
type SortOption = 'newest' | 'odds_asc' | 'odds_desc' | 'kickoff_asc';

function getTodayKeyTz(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Dar_es_Salaam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function TicketFeedPage() {
  const {
    activeBookmaker,
    activeBookmakerInfo,
    activeBookmakerTickets,
    activeFeedState,
    activeCycle,
    feedCycles,
    loadingPortfolio,
    refreshPortfolio,
    openTicketDetails,
    isTicketFavorited,
    toggleFavoriteTicket,
    setActiveSection,
  } = useOddsHunter();

  const [sectionFilter, setSectionFilter] = useState<FeedSectionFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<FeedStatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [cycleScope, setCycleScope] = useState<CycleScopeFilter>('ALL_HISTORY');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const todayKey = useMemo(() => getTodayKeyTz(), []);

  // Strictly displays only tickets belonging to the active preferred bookmaker
  const allowedTickets = useMemo(
    () => activeBookmakerTickets.filter((t) => isTicketAllowedInDailyFeed(t)),
    [activeBookmakerTickets]
  );

  const bookmakerCycles = useMemo(
    () => feedCycles.filter((c) => c.bookmakerId === activeBookmaker),
    [feedCycles, activeBookmaker]
  );

  const cycleScopedTickets = useMemo(() => {
    if (cycleScope === 'ALL_HISTORY') return allowedTickets;
    if (cycleScope === 'ACTIVE_CYCLE') {
      const targetCycleId = activeFeedState.activeCycleId || activeCycle?.cycleId;
      if (!targetCycleId) return allowedTickets;
      return allowedTickets.filter((t) => t.cycleId === targetCycleId);
    }
    return allowedTickets.filter((t) => t.cycleId === cycleScope);
  }, [allowedTickets, cycleScope, activeFeedState.activeCycleId, activeCycle?.cycleId]);

  const feedCounts = useMemo(() => {
    const now = Date.now();
    let upcomingSec = 0;
    let liveFootballSec = 0;
    let otherSportsSec = 0;
    let today = 0;
    let upcomingKickoff = 0;
    let pending = 0;
    let won = 0;
    let lost = 0;
    let voided = 0;
    let unverified = 0;

    for (const t of cycleScopedTickets) {
      const sec = t.feedSection || 'UPCOMING';
      if (sec === 'LIVE_FOOTBALL') liveFootballSec++;
      else if (sec === 'OTHER_SPORTS') otherSportsSec++;
      else upcomingSec++;

      if (t.generatedDateKey === todayKey) today++;
      if (t.kickoffStartMs > now && t.status === 'PENDING') upcomingKickoff++;
      if (t.status === 'PENDING' || t.status === 'LIVE' || t.status === 'PARTIALLY_SETTLED') {
        pending++;
      }
      if (t.status === 'WON') won++;
      if (t.status === 'LOST') lost++;
      if (t.status === 'VOID') voided++;
      if (t.status === 'UNVERIFIED') unverified++;
    }

    return {
      total: cycleScopedTickets.length,
      upcomingSec,
      liveFootballSec,
      otherSportsSec,
      today,
      upcomingKickoff,
      pending,
      won,
      lost,
      voided,
      unverified,
    };
  }, [cycleScopedTickets, todayKey]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of cycleScopedTickets) {
      if (t.categoryId && t.categoryLabel) {
        map.set(t.categoryId, t.categoryLabel);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [cycleScopedTickets]);

  const filteredTickets = useMemo(() => {
    const now = Date.now();
    const q = searchQuery.trim().toLowerCase();

    const list = cycleScopedTickets.filter((t) => {
      const sec: FeedSection = t.feedSection || 'UPCOMING';
      if (sectionFilter !== 'ALL' && sec !== sectionFilter) return false;

      if (statusFilter === 'TODAY' && t.generatedDateKey !== todayKey) return false;
      if (statusFilter === 'UPCOMING' && !(t.kickoffStartMs > now && t.status === 'PENDING')) {
        return false;
      }
      if (
        statusFilter === 'PENDING' &&
        t.status !== 'PENDING' &&
        t.status !== 'LIVE' &&
        t.status !== 'PARTIALLY_SETTLED'
      ) {
        return false;
      }
      if (statusFilter === 'WON' && t.status !== 'WON') return false;
      if (statusFilter === 'LOST' && t.status !== 'LOST') return false;
      if (statusFilter === 'VOID' && t.status !== 'VOID') return false;
      if (statusFilter === 'UNVERIFIED' && t.status !== 'UNVERIFIED') return false;

      if (categoryFilter !== 'ALL' && t.categoryId !== categoryFilter) return false;

      if (q) {
        const matchesId = t.internalTicketId.toLowerCase().includes(q);
        const matchesCode = (t.shareCode || '').toLowerCase().includes(q);
        const matchesCategory = t.categoryLabel.toLowerCase().includes(q);
        const matchesSport = (t.sportName || '').toLowerCase().includes(q);
        const matchesTeam = t.selections.some(
          (s) =>
            s.homeTeam.toLowerCase().includes(q) ||
            s.awayTeam.toLowerCase().includes(q) ||
            s.leagueName.toLowerCase().includes(q) ||
            (s.sportName || '').toLowerCase().includes(q)
        );
        if (!matchesId && !matchesCode && !matchesCategory && !matchesSport && !matchesTeam) {
          return false;
        }
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'odds_asc') return a.actualCombinedOdds - b.actualCombinedOdds;
      if (sortBy === 'odds_desc') return b.actualCombinedOdds - a.actualCombinedOdds;
      if (sortBy === 'kickoff_asc') return a.kickoffStartMs - b.kickoffStartMs;
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    });
  }, [
    cycleScopedTickets,
    sectionFilter,
    statusFilter,
    categoryFilter,
    searchQuery,
    sortBy,
    todayKey,
  ]);

  const bookingCodesCount = cycleScopedTickets.filter((t) => Boolean(t.shareCode)).length;

  // User-friendly generation status presentation (underlying lock state preserved exactly)
  const generationBanner = useMemo(() => {
    if (activeFeedState.generationLocked) {
      const remaining = activeFeedState.unfinishedMatchesCount;
      if (
        activeFeedState.unverifiedMatchesCount > 0 ||
        activeFeedState.verificationFailuresCount > 0
      ) {
        return {
          title: 'Results being updated',
          note:
            remaining > 0
              ? `Checking final scores for ${remaining} remaining match${remaining === 1 ? '' : 'es'}.`
              : 'Confirming official final results for this round.',
          tone: 'amber' as const,
          Icon: RefreshCw,
        };
      }
      return {
        title: 'Waiting for all matches to finish',
        note:
          remaining > 0
            ? `${remaining} match${remaining === 1 ? '' : 'es'} still to finish before new picks open.`
            : 'Current round matches are in progress.',
        tone: 'blue' as const,
        Icon: Clock,
      };
    }

    return {
      title: 'New picks pending',
      note:
        allowedTickets.length > 0
          ? 'All matches from the latest round have finished.'
          : `Fresh picks for ${activeBookmakerInfo.name} will appear shortly.`,
      tone: 'emerald' as const,
      Icon: CheckCircle2,
    };
  }, [
    activeFeedState.generationLocked,
    activeFeedState.unfinishedMatchesCount,
    activeFeedState.unverifiedMatchesCount,
    activeFeedState.verificationFailuresCount,
    allowedTickets.length,
    activeBookmakerInfo.name,
  ]);

  const [brandIconError, setBrandIconError] = useState(false);

  const StatusBannerIcon = generationBanner.Icon;

  return (
    <div className="space-y-6">
      {/* Daily Picks Hero Header & Compact Stats */}
      <section className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-gradient-to-br dark:from-[#0E1629]/95 dark:via-[#0B1222]/92 dark:to-[#080D1A]/95 dark:backdrop-blur-xl border border-slate-200 dark:border-white/[0.09] p-5 sm:p-6 shadow-xs dark:shadow-[0_24px_60px_-28px_rgba(2,6,23,0.95)] space-y-5 transition-colors">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/[0.06] dark:bg-blue-500/[0.11] blur-3xl"
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black border border-slate-300/80 dark:border-white/15 shadow-md overflow-hidden flex items-center justify-center shrink-0">
              {!brandIconError ? (
                <img
                  src="/assets/aistudio/1795084245256_fb70236e.jpg"
                  alt="Daily Picks Icon"
                  referrerPolicy="no-referrer"
                  onError={() => setBrandIconError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Ticket className="w-6 h-6 text-slate-200" />
              )}
            </div>

            <div className="min-w-0 space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400 block">
                Daily Picks
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                {activeBookmakerInfo.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Curated accumulators, live match progress, and ready-to-copy booking codes
                {activeFeedState.lastResultCheckAt
                  ? ` · Updated ${formatDateTimeCompact(activeFeedState.lastResultCheckAt)}`
                  : ''}
              </p>
            </div>
          </div>

          {/* Polished Status Indicator */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <div
              className={`rounded-xl border px-3.5 py-2.5 flex items-center gap-2.5 text-xs ${
                generationBanner.tone === 'amber'
                  ? 'bg-amber-50/90 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-200'
                  : generationBanner.tone === 'blue'
                    ? 'bg-blue-50/90 border-blue-200 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/25 dark:text-blue-200'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/25 dark:text-emerald-200'
              }`}
            >
              <StatusBannerIcon className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold leading-tight">{generationBanner.title}</div>
                <div className="text-[11px] opacity-85 mt-0.5">{generationBanner.note}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void refreshPortfolio()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.11] border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPortfolio ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 5 Compact Statistic Cards */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="rounded-xl bg-slate-50/90 dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.08] px-3.5 py-3 transition-colors">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Saved Tickets
            </span>
            <span className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums block">
              {feedCounts.total}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50/90 dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.08] px-3.5 py-3 transition-colors">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Matches Settled
            </span>
            <span className="mt-1 font-display text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300 tabular-nums block">
              {activeFeedState.finishedMatchesCount}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                /{activeFeedState.totalMatchesInCycle}
              </span>
            </span>
          </div>

          <div className="rounded-xl bg-slate-50/90 dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.08] px-3.5 py-3 transition-colors">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Won Tickets
            </span>
            <span className="mt-1 font-display text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums block">
              {feedCounts.won}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50/90 dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.08] px-3.5 py-3 transition-colors">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Lost Tickets
            </span>
            <span className="mt-1 font-display text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-300 tabular-nums block">
              {feedCounts.lost}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl bg-slate-50/90 dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.08] px-3.5 py-3 transition-colors">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Available Booking Codes
            </span>
            <span className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums block">
              {bookingCodesCount}
            </span>
          </div>
        </div>
      </section>

      {/* Feed Navigation & Filter Controls */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                { id: 'ALL', label: `All Picks (${feedCounts.total})`, icon: Ticket },
                {
                  id: 'UPCOMING',
                  label: `Upcoming (${feedCounts.upcomingSec})`,
                  icon: Clock,
                },
                {
                  id: 'LIVE_FOOTBALL',
                  label: `Live Football (${feedCounts.liveFootballSec})`,
                  icon: Flame,
                },
                {
                  id: 'OTHER_SPORTS',
                  label: `Other Games (${feedCounts.otherSportsSec})`,
                  icon: Trophy,
                },
              ] as const
            ).map((sec) => {
              const Icon = sec.icon;
              const active = sectionFilter === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSectionFilter(sec.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 border ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs'
                      : 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 dark:bg-[#0F172A]/80 dark:text-slate-300 dark:hover:text-white dark:border-white/[0.08]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'ALL', label: `All (${feedCounts.total})` },
              { id: 'TODAY', label: `Today (${feedCounts.today})` },
              { id: 'UPCOMING', label: `Upcoming (${feedCounts.upcomingKickoff})` },
              { id: 'PENDING', label: `In Progress (${feedCounts.pending})` },
              { id: 'WON', label: `Won (${feedCounts.won})` },
              { id: 'LOST', label: `Lost (${feedCounts.lost})` },
              { id: 'VOID', label: `Void (${feedCounts.voided})` },
              ...(feedCounts.unverified > 0
                ? [{ id: 'UNVERIFIED' as const, label: `Updating (${feedCounts.unverified})` }]
                : []),
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  active
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-600/20 dark:text-blue-200 dark:border-blue-500/40'
                    : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 dark:bg-[#0F172A]/70 dark:text-slate-400 dark:hover:text-white dark:border-white/[0.08]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <label className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team, league, or code..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-[#0F172A]/80 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </label>

          <div className="relative flex items-center">
            <History className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
            <select
              value={cycleScope}
              onChange={(e) => setCycleScope(e.target.value)}
              aria-label="Filter by round history"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-[#0F172A]/80 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL_HISTORY">
                All Saved Rounds ({bookmakerCycles.length})
              </option>
              {(activeFeedState.activeCycleId || activeCycle?.cycleId) && (
                <option value="ACTIVE_CYCLE">Current Round</option>
              )}
              {bookmakerCycles.map((cyc, index) => (
                <option key={cyc.cycleId} value={cyc.cycleId}>
                  {cyc.dateKey} · Round {bookmakerCycles.length - index} ({cyc.ticketCount} picks)
                </option>
              ))}
            </select>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by odds range"
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-[#0F172A]/80 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500/50"
          >
            <option value="ALL">All Odds Ranges</option>
            {categoryOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label} Odds
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort picks"
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-[#0F172A]/80 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500/50"
          >
            <option value="newest">Newest First</option>
            <option value="odds_asc">Lowest Odds First</option>
            <option value="odds_desc">Highest Odds First</option>
            <option value="kickoff_asc">Soonest Kickoff</option>
          </select>
        </div>
      </section>

      {/* Responsive 2-Column Mobile / Multi-Column Desktop Card Grid */}
      {loadingPortfolio && allowedTickets.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="h-64 rounded-2xl bg-white dark:bg-[#0F172A]/75 border border-slate-200 dark:border-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0F172A]/85 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.08] p-10 text-center space-y-3 shadow-xs dark:shadow-none">
          <Ticket className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {allowedTickets.length === 0
                ? `No daily picks available yet for ${activeBookmakerInfo.name}`
                : 'No picks match your current filters'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {allowedTickets.length === 0
                ? 'Fresh daily tickets appear automatically once ready, or you can change your preferred bookmaker in Settings.'
                : 'Try clearing your search or choosing All Picks to browse saved tickets.'}
            </p>
          </div>
          {allowedTickets.length === 0 ? (
            <button
              type="button"
              onClick={() => setActiveSection('settings')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Open Settings</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSectionFilter('ALL');
                setStatusFilter('ALL');
                setCategoryFilter('ALL');
                setCycleScope('ALL_HISTORY');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filteredTickets.map((ticket) => (
            <TicketPosterCard
              key={ticket.internalTicketId}
              ticket={ticket}
              favorited={isTicketFavorited(ticket.internalTicketId)}
              onOpenDetails={openTicketDetails}
              onToggleFavorite={(t) => void toggleFavoriteTicket(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
