import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/utils/formatters.dart';
import '../models/ticket.dart';
import '../providers/auth_provider.dart';
import '../providers/feed_provider.dart';
import '../theme/odyx_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/status_badge.dart';

class TicketDetailsScreen extends StatefulWidget {
  const TicketDetailsScreen({
    super.key,
    required this.initialTicket,
  });

  final DailyTicket initialTicket;

  @override
  State<TicketDetailsScreen> createState() => _TicketDetailsScreenState();
}

class _TicketDetailsScreenState extends State<TicketDetailsScreen> {
  late DailyTicket _ticket;
  bool _isRefreshing = false;
  bool _isRunningAdminAction = false;

  @override
  void initState() {
    super.initState();
    _ticket = widget.initialTicket;
    _refreshLatest();
  }

  Future<void> _refreshLatest() async {
    setState(() => _isRefreshing = true);
    final updated = await context
        .read<FeedProvider>()
        .fetchTicketDetail(_ticket.internalTicketId);
    if (!mounted) return;
    setState(() {
      if (updated != null) _ticket = updated;
      _isRefreshing = false;
    });
  }

  Future<void> _openBookmakerUrl() async {
    final raw = _ticket.shareUrl ??
        context.read<FeedProvider>().activeBookmakerInfo.websiteUrl;
    final uri = Uri.tryParse(raw);
    if (uri == null) return;
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open external browser.')),
      );
    }
  }

  Future<void> _adminGenerateCode() async {
    final auth = context.read<AuthProvider>();
    final token = await auth.getIdToken();
    if (token == null || !mounted) return;
    setState(() => _isRunningAdminAction = true);
    try {
      await context.read<FeedProvider>().generateTicketBookingCode(
            internalTicketId: _ticket.internalTicketId,
            token: token,
          );
      await _refreshLatest();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Booking code check completed.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Code request failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _isRunningAdminAction = false);
    }
  }

  Future<void> _adminDeleteTicket() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Ticket?'),
        content: Text(
          'Permanently remove ${_ticket.internalTicketId} from the public feed?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: OdyxColors.lostRose),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final token = await context.read<AuthProvider>().getIdToken();
    if (token == null || !mounted) return;
    setState(() => _isRunningAdminAction = true);
    try {
      await context.read<FeedProvider>().deleteTicket(
            internalTicketId: _ticket.internalTicketId,
            token: token,
          );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ticket removed.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to delete ticket: $e')),
      );
      setState(() => _isRunningAdminAction = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final textTheme = Theme.of(context).textTheme;
    final isBookmarked = auth.isBookmarked(_ticket.internalTicketId);

    final settlementByKey = <String, SelectionSettlement>{};
    for (final s in _ticket.selectionSettlements) {
      if (s.selectionKey.isNotEmpty) {
        settlementByKey[s.selectionKey] = s;
      } else if (s.eventId.isNotEmpty) {
        settlementByKey[s.eventId] = s;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _ticket.categoryLabel,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            tooltip: isBookmarked ? 'Remove Bookmark' : 'Bookmark Ticket',
            onPressed: () async {
              final ok = await auth.toggleBookmark(_ticket);
              if (!context.mounted) return;
              if (!ok && auth.errorMessage != null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(auth.errorMessage!)),
                );
              }
            },
            icon: Icon(
              isBookmarked
                  ? Icons.bookmark_rounded
                  : Icons.bookmark_border_rounded,
              color: isBookmarked ? OdyxColors.liveAmber : null,
            ),
          ),
          IconButton(
            tooltip: 'Refresh Slip',
            onPressed: _isRefreshing ? null : _refreshLatest,
            icon: _isRefreshing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          // Summary Header Card
          GlassCard(
            accentGlowColor: _ticket.status == TicketStatus.won
                ? OdyxColors.wonEmerald
                : OdyxColors.accentBlue,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _ticket.bookmakerName,
                            style: textTheme.labelSmall?.copyWith(
                              color: OdyxColors.accentBlue,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _ticket.internalTicketId,
                            style: textTheme.bodySmall?.copyWith(
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),
                    TicketStatusBadge(status: _ticket.status),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('EFFECTIVE ODDS', style: textTheme.labelSmall),
                          const SizedBox(height: 2),
                          Text(
                            OdyxFormatters.formatOdds(
                              _ticket.effectiveCombinedOdds,
                            ),
                            style: textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                              fontFeatures: const [
                                FontFeature.tabularFigures(),
                              ],
                              color: _ticket.status == TicketStatus.won
                                  ? OdyxColors.wonEmerald
                                  : null,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('MATCH PROGRESS', style: textTheme.labelSmall),
                          const SizedBox(height: 2),
                          Text(
                            '${_ticket.settledMatchCount}/${_ticket.totalMatchCount} Settled',
                            style: textTheme.titleLarge,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _ticket.settlementProgress,
                    minHeight: 6,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _ticket.status == TicketStatus.lost
                          ? OdyxColors.lostRose
                          : _ticket.status == TicketStatus.won
                              ? OdyxColors.wonEmerald
                              : OdyxColors.accentBlue,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 16,
                  runSpacing: 6,
                  children: [
                    _MetaItem(
                      icon: Icons.category_rounded,
                      text: _ticket.sectionLabel,
                    ),
                    _MetaItem(
                      icon: Icons.calendar_today_rounded,
                      text: _ticket.generatedDateKey,
                    ),
                    _MetaItem(
                      icon: Icons.schedule_rounded,
                      text: OdyxFormatters.formatKickoffSpan(
                        _ticket.kickoffStartMs,
                        _ticket.kickoffEndMs,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Booking Code Panel
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Booking Code & Slip Link', style: textTheme.titleMedium),
                const SizedBox(height: 10),
                if (_ticket.shareCode != null && _ticket.shareCode!.isNotEmpty)
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: OdyxColors.accentBlue.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color:
                                  OdyxColors.accentBlue.withValues(alpha: 0.35),
                            ),
                          ),
                          child: Text(
                            _ticket.shareCode!,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.4,
                              color: OdyxColors.accentBlue,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      FilledButton.icon(
                        onPressed: () async {
                          await Clipboard.setData(
                            ClipboardData(text: _ticket.shareCode!),
                          );
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content:
                                  Text('Copied code ${_ticket.shareCode}'),
                            ),
                          );
                        },
                        icon: const Icon(Icons.copy_rounded, size: 18),
                        label: const Text('Copy'),
                      ),
                    ],
                  )
                else
                  Text(
                    _ticket.bookingCodeError ??
                        'Official booking code is pending or unavailable for this slip.',
                    style: textTheme.bodySmall,
                  ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: _openBookmakerUrl,
                      icon: const Icon(Icons.open_in_new_rounded, size: 17),
                      label: Text('Open ${_ticket.bookmakerName}'),
                    ),
                    if (auth.isAdmin &&
                        (_ticket.shareCode == null ||
                            _ticket.shareCode!.isEmpty)) ...[
                      const SizedBox(width: 10),
                      FilledButton.tonalIcon(
                        onPressed:
                            _isRunningAdminAction ? null : _adminGenerateCode,
                        icon: const Icon(Icons.qr_code_rounded, size: 17),
                        label: const Text('Generate Code'),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          Text(
            'Selections (${_ticket.selections.length})',
            style: textTheme.titleMedium,
          ),
          const SizedBox(height: 10),

          ..._ticket.selections.map((sel) {
            final settlement = settlementByKey[sel.selectionKey] ??
                settlementByKey[sel.eventId];
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            [
                              if (sel.sportName != null &&
                                  sel.sportName!.isNotEmpty)
                                sel.sportName!,
                              if (sel.country.isNotEmpty) sel.country,
                              if (sel.leagueName.isNotEmpty) sel.leagueName,
                            ].join(' • '),
                            style: textTheme.labelSmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (settlement != null)
                          SelectionStatusBadge(status: settlement.status),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${sel.homeTeam} vs ${sel.awayTeam}',
                      style: textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${sel.marketName}: ${sel.outcomeDesc}',
                            style: textTheme.bodyMedium?.copyWith(
                              color: OdyxColors.accentBlue,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Text(
                          OdyxFormatters.formatOdds(sel.odds),
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 12,
                      runSpacing: 4,
                      children: [
                        Text(
                          'Kickoff: ${OdyxFormatters.formatEpochMsCompact(sel.estimateStartTime)}',
                          style: textTheme.bodySmall,
                        ),
                        if (settlement?.score != null)
                          Text(
                            'Score: ${settlement!.score}',
                            style: textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        if (settlement?.playedSeconds != null)
                          Text(
                            settlement!.playedSeconds!,
                            style: textTheme.bodySmall?.copyWith(
                              color: OdyxColors.liveAmber,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                      ],
                    ),
                    if (settlement != null && settlement.reason.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        settlement.reason,
                        style: textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
            );
          }),

          if (auth.isAdmin) ...[
            const SizedBox(height: 16),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: OdyxColors.lostRose,
                side: const BorderSide(color: OdyxColors.lostRose),
              ),
              onPressed: _isRunningAdminAction ? null : _adminDeleteTicket,
              icon: const Icon(Icons.delete_outline_rounded),
              label: const Text('Admin: Remove Ticket from Public Feed'),
            ),
          ],
        ],
      ),
    );
  }
}

class _MetaItem extends StatelessWidget {
  const _MetaItem({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: OdyxColors.accentCyan),
        const SizedBox(width: 5),
        Text(text, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
