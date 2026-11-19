import 'package:flutter/material.dart';

import '../models/ticket.dart';
import '../theme/odyx_colors.dart';

class TicketStatusBadge extends StatelessWidget {
  const TicketStatusBadge({
    super.key,
    required this.status,
    this.compact = false,
  });

  final TicketStatus status;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final style = _styleForTicketStatus(status);
    return _SemanticPill(
      icon: style.$1,
      label: status.displayLabel,
      color: style.$2,
      compact: compact,
    );
  }

  static (IconData, Color) _styleForTicketStatus(TicketStatus status) {
    switch (status) {
      case TicketStatus.won:
        return (Icons.check_circle_rounded, OdyxColors.wonEmerald);
      case TicketStatus.lost:
        return (Icons.cancel_rounded, OdyxColors.lostRose);
      case TicketStatus.voided:
        return (Icons.remove_circle_outline_rounded, OdyxColors.voidSlate);
      case TicketStatus.live:
        return (Icons.bolt_rounded, OdyxColors.liveAmber);
      case TicketStatus.partiallySettled:
        return (Icons.timelapse_rounded, OdyxColors.liveAmber);
      case TicketStatus.unverified:
        return (Icons.sync_rounded, OdyxColors.accentBlue);
      case TicketStatus.pending:
        return (Icons.schedule_rounded, OdyxColors.accentCyan);
    }
  }
}

class SelectionStatusBadge extends StatelessWidget {
  const SelectionStatusBadge({
    super.key,
    required this.status,
  });

  final SelectionSettlementStatus status;

  @override
  Widget build(BuildContext context) {
    final style = _styleForSelection(status);
    return _SemanticPill(
      icon: style.$1,
      label: status.apiValue,
      color: style.$2,
      compact: true,
    );
  }

  static (IconData, Color) _styleForSelection(
    SelectionSettlementStatus status,
  ) {
    switch (status) {
      case SelectionSettlementStatus.won:
        return (Icons.check_circle_rounded, OdyxColors.wonEmerald);
      case SelectionSettlementStatus.lost:
        return (Icons.cancel_rounded, OdyxColors.lostRose);
      case SelectionSettlementStatus.voided:
        return (Icons.block_rounded, OdyxColors.voidSlate);
      case SelectionSettlementStatus.live:
        return (Icons.bolt_rounded, OdyxColors.liveAmber);
      case SelectionSettlementStatus.postponed:
      case SelectionSettlementStatus.suspended:
        return (Icons.pause_circle_outline_rounded, OdyxColors.liveAmber);
      case SelectionSettlementStatus.unverified:
        return (Icons.sync_rounded, OdyxColors.accentBlue);
      case SelectionSettlementStatus.upcoming:
      case SelectionSettlementStatus.pending:
        return (Icons.schedule_rounded, OdyxColors.accentCyan);
    }
  }
}

class CycleStatusBanner extends StatelessWidget {
  const CycleStatusBanner({
    super.key,
    required this.feedState,
    required this.statusLabel,
    required this.ticketCount,
  });

  final BookmakerFeedState feedState;
  final String statusLabel;
  final int ticketCount;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bool isUpdating = feedState.unverifiedMatchesCount > 0 ||
        feedState.verificationFailuresCount > 0;
    final bool isWaiting =
        feedState.generationLocked || feedState.unfinishedMatchesCount > 0;

    final Color accent;
    final IconData icon;
    if (isUpdating) {
      accent = OdyxColors.accentBlue;
      icon = Icons.sync_rounded;
    } else if (isWaiting) {
      accent = OdyxColors.liveAmber;
      icon = Icons.hourglass_top_rounded;
    } else if (ticketCount == 0) {
      accent = OdyxColors.accentCyan;
      icon = Icons.auto_awesome_rounded;
    } else {
      accent = OdyxColors.wonEmerald;
      icon = Icons.verified_rounded;
    }

    final totalMatches = feedState.totalMatchesInCycle;
    final finishedMatches = feedState.finishedMatchesCount;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: isDark ? 0.11 : 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: accent.withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: accent),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  statusLabel,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: isDark ? OdyxColors.darkTextPrimary : accent,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  totalMatches > 0
                      ? '$finishedMatches of $totalMatches fixtures settled across $ticketCount active tickets'
                      : '$ticketCount curated tickets available in this feed',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SemanticPill extends StatelessWidget {
  const _SemanticPill({
    required this.icon,
    required this.label,
    required this.color,
    required this.compact,
  });

  final IconData icon;
  final String label;
  final Color color;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 10,
        vertical: compact ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: isDark ? 0.16 : 0.11),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.38)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: compact ? 12 : 14, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: compact ? 10.5 : 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.4,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
