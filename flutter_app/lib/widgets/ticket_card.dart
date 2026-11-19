import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/utils/formatters.dart';
import '../models/bookmaker.dart';
import '../models/ticket.dart';
import '../theme/odyx_colors.dart';
import 'glass_card.dart';
import 'status_badge.dart';

class TicketCard extends StatelessWidget {
  const TicketCard({
    super.key,
    required this.ticket,
    required this.isBookmarked,
    required this.onTap,
    required this.onToggleBookmark,
  });

  final DailyTicket ticket;
  final bool isBookmarked;
  final VoidCallback onTap;
  final VoidCallback onToggleBookmark;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textTheme = Theme.of(context).textTheme;

    Color? glowColor;
    Color? borderColor;
    if (ticket.status == TicketStatus.won) {
      glowColor = OdyxColors.wonEmerald;
      borderColor = OdyxColors.wonEmerald.withValues(alpha: 0.45);
    } else if (ticket.status == TicketStatus.lost) {
      borderColor = OdyxColors.lostRose.withValues(alpha: 0.35);
    } else if (ticket.status == TicketStatus.live ||
        ticket.status == TicketStatus.partiallySettled) {
      borderColor = OdyxColors.liveAmber.withValues(alpha: 0.40);
    }

    final settlementByKey = <String, SelectionSettlement>{};
    for (final s in ticket.selectionSettlements) {
      if (s.selectionKey.isNotEmpty) {
        settlementByKey[s.selectionKey] = s;
      } else if (s.eventId.isNotEmpty) {
        settlementByKey[s.eventId] = s;
      }
    }

    final previewLegs = ticket.selections.take(2).toList();
    final remainingCount = ticket.selections.length - previewLegs.length;
    final hasBookingCode =
        ticket.shareCode != null && ticket.shareCode!.trim().isNotEmpty;

    return GlassCard(
      onTap: onTap,
      borderColor: borderColor,
      accentGlowColor: glowColor,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Category + Section + Bookmark + Status
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    _TagLabel(
                      text: ticket.categoryLabel,
                      color: OdyxColors.accentBlue,
                    ),
                    _TagLabel(
                      text: ticket.sectionLabel,
                      color: ticket.bookmakerId == BookmakerId.betpawaTz
                          ? OdyxColors.liveAmber
                          : OdyxColors.accentCyan,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              TicketStatusBadge(status: ticket.status, compact: true),
              const SizedBox(width: 4),
              InkWell(
                onTap: onToggleBookmark,
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Icon(
                    isBookmarked
                        ? Icons.bookmark_rounded
                        : Icons.bookmark_border_rounded,
                    size: 20,
                    color: isBookmarked
                        ? OdyxColors.liveAmber
                        : (isDark
                            ? OdyxColors.darkTextSecondary
                            : OdyxColors.lightTextSecondary),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Primary Metrics Row: Combined Odds + Selection Count + Date Key
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'COMBINED ODDS',
                    style: textTheme.labelSmall?.copyWith(
                      letterSpacing: 0.8,
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        OdyxFormatters.formatOdds(ticket.effectiveCombinedOdds),
                        style: textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                          fontFeatures: const [FontFeature.tabularFigures()],
                          color: ticket.status == TicketStatus.won
                              ? OdyxColors.wonEmerald
                              : null,
                        ),
                      ),
                      if ((ticket.effectiveCombinedOdds -
                                  ticket.actualCombinedOdds)
                              .abs() >
                          0.02) ...[
                        const SizedBox(width: 8),
                        Text(
                          OdyxFormatters.formatOdds(ticket.actualCombinedOdds),
                          style: textTheme.bodySmall?.copyWith(
                            decoration: TextDecoration.lineThrough,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${ticket.totalMatchCount} ${ticket.totalMatchCount == 1 ? 'Match' : 'Matches'}',
                    style: textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    ticket.generatedDateKey.isNotEmpty
                        ? ticket.generatedDateKey
                        : OdyxFormatters.formatIsoCompact(ticket.generatedAt),
                    style: textTheme.labelSmall,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Settlement progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: ticket.settlementProgress,
              minHeight: 5,
              backgroundColor: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : OdyxColors.lightSurfaceSubtle,
              valueColor: AlwaysStoppedAnimation<Color>(
                ticket.status == TicketStatus.lost
                    ? OdyxColors.lostRose
                    : ticket.status == TicketStatus.won
                        ? OdyxColors.wonEmerald
                        : OdyxColors.accentBlue,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Preview legs
          ...previewLegs.map((sel) {
            final settlement = settlementByKey[sel.selectionKey] ??
                settlementByKey[sel.eventId];
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _LegPreviewRow(
                selection: sel,
                settlement: settlement,
              ),
            );
          }),

          if (remainingCount > 0)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                '+ $remainingCount more ${remainingCount == 1 ? 'selection' : 'selections'} inside slip',
                style: textTheme.labelSmall?.copyWith(
                  color: OdyxColors.accentBlue,
                ),
              ),
            ),

          Divider(
            height: 16,
            color: isDark ? OdyxColors.darkBorder : OdyxColors.lightBorder,
          ),

          // Footer: Booking code + Kickoff span + View Details
          Row(
            children: [
              if (hasBookingCode)
                InkWell(
                  onTap: () async {
                    await Clipboard.setData(
                      ClipboardData(text: ticket.shareCode!),
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            'Booking code ${ticket.shareCode} copied',
                          ),
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    }
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: OdyxColors.accentBlue.withValues(
                        alpha: isDark ? 0.16 : 0.10,
                      ),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: OdyxColors.accentBlue.withValues(alpha: 0.35),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          ticket.shareCode!,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w800,
                            fontSize: 12.5,
                            color: OdyxColors.accentBlue,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(
                          Icons.copy_rounded,
                          size: 14,
                          color: OdyxColors.accentBlue,
                        ),
                      ],
                    ),
                  ),
                )
              else
                Text(
                  ticket.bookingCodeStatus == BookingCodeStatus.failed
                      ? 'Code unavailable'
                      : OdyxFormatters.formatKickoffSpan(
                          ticket.kickoffStartMs,
                          ticket.kickoffEndMs,
                        ),
                  style: textTheme.labelSmall,
                ),
              const Spacer(),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'View Slip',
                    style: textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: isDark
                          ? OdyxColors.darkTextPrimary
                          : OdyxColors.lightTextPrimary,
                    ),
                  ),
                  const SizedBox(width: 2),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 18,
                    color: isDark
                        ? OdyxColors.darkTextSecondary
                        : OdyxColors.lightTextSecondary,
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TagLabel extends StatelessWidget {
  const _TagLabel({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: isDark ? 0.14 : 0.09),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _LegPreviewRow extends StatelessWidget {
  const _LegPreviewRow({
    required this.selection,
    this.settlement,
  });

  final TicketSelection selection;
  final SelectionSettlement? settlement;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final status = settlement?.status;
    final Color dotColor;
    switch (status) {
      case SelectionSettlementStatus.won:
        dotColor = OdyxColors.wonEmerald;
        break;
      case SelectionSettlementStatus.lost:
        dotColor = OdyxColors.lostRose;
        break;
      case SelectionSettlementStatus.voided:
        dotColor = OdyxColors.voidSlate;
        break;
      case SelectionSettlementStatus.live:
        dotColor = OdyxColors.liveAmber;
        break;
      default:
        dotColor = OdyxColors.accentCyan;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : OdyxColors.lightSurfaceSubtle,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: dotColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${selection.homeTeam} vs ${selection.awayTeam}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${selection.marketName} • ${selection.outcomeDesc}'
                  '${settlement?.score != null ? '  (${settlement!.score})' : ''}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontSize: 11.5,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            OdyxFormatters.formatOdds(selection.odds),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
          ),
        ],
      ),
    );
  }
}
