import React from 'react';
import {
  Bookmark,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Layers,
  MinusCircle,
  Radio,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import type { GeneratedTicket, TicketStatus } from '../types/sportybet.ts';
import { formatKickoffTime } from '../utils/formatters.ts';

interface TicketPosterCardProps {
  ticket: GeneratedTicket;
  favorited: boolean;
  onOpenDetails: (internalTicketId: string) => void;
  onToggleFavorite: (ticket: GeneratedTicket) => void;
}

const STATUS_STYLE: Record<
  TicketStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    badgeText: string;
    cardBorder: string;
    topGlow: string;
    progressBar: string;
    label: string;
  }
> = {
  WON: {
    icon: CheckCircle2,
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    cardBorder: 'border-emerald-300/80 dark:border-emerald-500/35',
    topGlow: 'dark:bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_65%)]',
    progressBar: 'bg-emerald-500 dark:bg-emerald-400',
    label: 'WON',
  },
  LOST: {
    icon: XCircle,
    badgeText: 'text-rose-700 dark:text-rose-300',
    cardBorder: 'border-rose-300/80 dark:border-rose-500/35',
    topGlow: 'dark:bg-[radial-gradient(ellipse_at_top,rgba(244,63,94,0.11),transparent_65%)]',
    progressBar: 'bg-rose-500 dark:bg-rose-400',
    label: 'LOST',
  },
  VOID: {
    icon: MinusCircle,
    badgeText: 'text-slate-600 dark:text-slate-300',
    cardBorder: 'border-slate-300 dark:border-slate-500/35',
    topGlow: '',
    progressBar: 'bg-slate-400 dark:bg-slate-500',
    label: 'VOID',
  },
  LIVE: {
    icon: Radio,
    badgeText: 'text-amber-700 dark:text-amber-300',
    cardBorder: 'border-amber-300/75 dark:border-amber-500/30',
    topGlow: 'dark:bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.11),transparent_65%)]',
    progressBar: 'bg-amber-500 dark:bg-amber-400',
    label: 'LIVE',
  },
  PARTIALLY_SETTLED: {
    icon: RefreshCw,
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    cardBorder: 'border-slate-200 dark:border-white/[0.09]',
    topGlow: '',
    progressBar: 'bg-cyan-500 dark:bg-cyan-400',
    label: 'IN PROGRESS',
  },
  UNVERIFIED: {
    icon: Clock,
    badgeText: 'text-orange-700 dark:text-orange-300',
    cardBorder: 'border-slate-200 dark:border-white/[0.09]',
    topGlow: '',
    progressBar: 'bg-orange-400',
    label: 'UPDATING',
  },
  PENDING: {
    icon: Clock,
    badgeText: 'text-blue-700 dark:text-blue-300',
    cardBorder: 'border-slate-200 dark:border-white/[0.09]',
    topGlow: 'dark:bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.10),transparent_65%)]',
    progressBar: 'bg-blue-500 dark:bg-blue-400',
    label: 'PENDING',
  },
};

export function TicketPosterCard({
  ticket,
  favorited,
  onOpenDetails,
  onToggleFavorite,
}: TicketPosterCardProps) {
  const [copied, setCopied] = React.useState(false);
  const statusMeta = STATUS_STYLE[ticket.status] || STATUS_STYLE.PENDING;
  const StatusIcon = statusMeta.icon;
  const bookmakerLabel = ticket.bookmakerId === 'BETPAWA_TZ' ? 'betPawa TZ' : 'SportyBet TZ';
  const sectionLabel =
    ticket.feedSection === 'LIVE_FOOTBALL'
      ? 'Live Football'
      : ticket.feedSection === 'OTHER_SPORTS'
        ? ticket.sportName || ticket.selections[0]?.sportName || 'Other Games'
        : 'Upcoming';

  const totalMatches = Math.max(
    1,
    ticket.totalMatchCount ?? ticket.selections.length ?? ticket.selectionCount
  );
  const settledMatches =
    ticket.settledMatchCount ??
    ticket.selectionSettlements.filter(
      (s) => s.status === 'WON' || s.status === 'LOST' || s.status === 'VOID'
    ).length;
  const progressPct = Math.min(100, Math.round((settledMatches / totalMatches) * 100));

  const kickoffSpan =
    ticket.kickoffStartMs > 0
      ? ticket.kickoffStartMs === ticket.kickoffEndMs
        ? formatKickoffTime(ticket.kickoffStartMs)
        : `${formatKickoffTime(ticket.kickoffStartMs)} – ${formatKickoffTime(ticket.kickoffEndMs)}`
      : '—';

  const previewSelections = ticket.selections.slice(0, 2);
  const extraCount = Math.max(0, ticket.selections.length - previewSelections.length);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ticket.shareCode) return;
    navigator.clipboard.writeText(ticket.shareCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(ticket.internalTicketId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetails(ticket.internalTicketId);
        }
      }}
      className={`group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-[#0D1424]/85 dark:backdrop-blur-xl border ${statusMeta.cardBorder} hover:-translate-y-0.5 hover:border-blue-500/45 dark:hover:border-blue-400/45 shadow-xs dark:shadow-[0_18px_42px_-24px_rgba(2,6,23,0.95)] hover:shadow-[0_18px_38px_-18px_rgba(37,99,235,0.28)] transition-all duration-200 overflow-hidden cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60`}
    >
      {/* Subtle Top Radial Specular Layer */}
      <div className={`pointer-events-none ${statusMeta.topGlow}`}>
        {/* Card Header */}
        <div className="pointer-events-auto px-3 sm:px-3.5 pt-3.5 pb-2.5 flex items-start justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="min-w-0 space-y-0.5">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {ticket.categoryLabel} Odds
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {bookmakerLabel} · {sectionLabel}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(ticket);
            }}
            aria-label={favorited ? 'Remove pick from favorites' : 'Save pick to favorites'}
            className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
              favorited
                ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-500/15 dark:border-amber-400/30 dark:text-amber-300'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${favorited ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Odds Hero & Clear Status */}
        <div className="pointer-events-auto px-3 sm:px-3.5 pt-4 pb-3 flex flex-col items-center text-center">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Combined Odds
          </span>
          <div className="mt-0.5 font-display font-extrabold text-3xl sm:text-[34px] leading-none tracking-tight text-slate-900 dark:text-white tabular-nums group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
            {ticket.actualCombinedOdds.toFixed(2)}
          </div>

          {ticket.effectiveCombinedOdds !== ticket.actualCombinedOdds && (
            <span className="mt-1 font-mono text-[11px] font-medium text-amber-700 dark:text-amber-300 tabular-nums">
              Adjusted {ticket.effectiveCombinedOdds.toFixed(2)}
            </span>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium tabular-nums">
              <Layers className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              {ticket.selectionCount} {ticket.selectionCount === 1 ? 'Pick' : 'Picks'}
            </span>
            <span className="text-slate-300 dark:text-white/20" aria-hidden="true">
              ·
            </span>
            <span className={`inline-flex items-center gap-1 tracking-wide ${statusMeta.badgeText}`}>
              <StatusIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{statusMeta.label}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Compact Selection Preview */}
      {previewSelections.length > 0 && (
        <div className="px-3 sm:px-3.5 pb-3 pt-2 border-t border-slate-100/80 dark:border-white/[0.05] space-y-1.5">
          {previewSelections.map((sel) => {
            const legSettlement = ticket.selectionSettlements.find(
              (s) => s.selectionKey === sel.selectionKey
            );
            const legState = legSettlement?.status;
            return (
              <div
                key={sel.selectionKey}
                className="flex items-center justify-between gap-2 text-[11px] leading-tight text-slate-600 dark:text-slate-300"
              >
                <span className="truncate min-w-0">
                  {sel.homeTeam} vs {sel.awayTeam}
                </span>
                <span
                  className={`font-mono text-[10px] font-semibold shrink-0 tabular-nums ${
                    legState === 'WON'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : legState === 'LOST'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {sel.outcomeDesc}
                </span>
              </div>
            );
          })}
          {extraCount > 0 && (
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              +{extraCount} more selection{extraCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
      )}

      {/* Footer: Match Progress, Date & Booking Code */}
      <div className="bg-slate-50/90 dark:bg-[#080D18]/85 border-t border-slate-200/80 dark:border-white/[0.06] px-3 sm:px-3.5 py-3 space-y-2.5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              Matches settled: {settledMatches}/{totalMatches}
            </span>
            <span className="truncate">{ticket.generatedDateKey}</span>
          </div>
          <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${statusMeta.progressBar}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
            <span>Kickoff</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums truncate">
              {kickoffSpan}
            </span>
          </div>
        </div>

        {/* Booking Code Copy Row */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2">
          {ticket.shareCode ? (
            <>
              <div className="min-w-0">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  Booking Code
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 truncate block tabular-nums">
                  {ticket.shareCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copy booking code"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:border-emerald-500/30 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 whitespace-nowrap transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Booking Code</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {ticket.bookingCodeStatus === 'FAILED' ? 'Unavailable' : 'Pending'}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
