import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../core/utils/formatters.dart';
import '../models/user_profile.dart';
import '../providers/auth_provider.dart';
import '../providers/feed_provider.dart';
import '../theme/odyx_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/state_views.dart';

class MatchesExplorerScreen extends StatefulWidget {
  const MatchesExplorerScreen({super.key});

  @override
  State<MatchesExplorerScreen> createState() => _MatchesExplorerScreenState();
}

class _MatchesExplorerScreenState extends State<MatchesExplorerScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<FeedProvider>().loadMatches();
    });
  }

  @override
  Widget build(BuildContext context) {
    final feed = context.watch<FeedProvider>();
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text('${feed.activeBookmakerInfo.shortName} Fixtures'),
          actions: [
            IconButton(
              onPressed: feed.isLoadingMatches ? null : feed.loadMatches,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
          bottom: TabBar(
            tabs: [
              Tab(text: 'Live (${feed.liveMatches.length})'),
              Tab(text: 'Upcoming (${feed.upcomingMatches.length})'),
            ],
          ),
        ),
        body: feed.isLoadingMatches
            ? const Padding(
                padding: EdgeInsets.all(16),
                child: TicketSkeletonList(itemCount: 3),
              )
            : feed.matchesError != null
                ? Padding(
                    padding: const EdgeInsets.all(16),
                    child: OdyxErrorState(
                      message: feed.matchesError!,
                      onRetry: feed.loadMatches,
                    ),
                  )
                : TabBarView(
                    children: [
                      _MatchesList(
                        matches: feed.liveMatches,
                        emptyTitle: 'No Live Matches Right Now',
                      ),
                      _MatchesList(
                        matches: feed.upcomingMatches,
                        emptyTitle: 'No Upcoming Matches Listed',
                      ),
                    ],
                  ),
      ),
    );
  }
}

class _MatchesList extends StatelessWidget {
  const _MatchesList({
    required this.matches,
    required this.emptyTitle,
  });

  final List<MatchSummaryItem> matches;
  final String emptyTitle;

  @override
  Widget build(BuildContext context) {
    if (matches.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: OdyxEmptyState(
            icon: Icons.sports_soccer_rounded,
            title: emptyTitle,
            subtitle: 'Pull or tap refresh to check the latest feed.',
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: matches.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final m = matches[index];
        return GlassCard(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      [
                        if (m.country.isNotEmpty) m.country,
                        if (m.leagueName.isNotEmpty) m.leagueName,
                      ].join(' • '),
                      style: Theme.of(context).textTheme.labelSmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: (m.isLive
                              ? OdyxColors.liveAmber
                              : OdyxColors.accentCyan)
                          .withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      m.isLive
                          ? (m.playedSeconds ?? 'LIVE')
                          : OdyxFormatters.formatEpochMsCompact(
                              m.estimateStartTime,
                            ),
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: m.isLive
                            ? OdyxColors.liveAmber
                            : OdyxColors.accentCyan,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${m.homeTeam} vs ${m.awayTeam}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  if (m.score != null && m.score!.isNotEmpty)
                    Text(
                      m.score!,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: OdyxColors.wonEmerald,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class BookingToolsScreen extends StatefulWidget {
  const BookingToolsScreen({super.key});

  @override
  State<BookingToolsScreen> createState() => _BookingToolsScreenState();
}

class _BookingToolsScreenState extends State<BookingToolsScreen> {
  final TextEditingController _verifyCtrl = TextEditingController();
  final TextEditingController _transferCtrl = TextEditingController();

  bool _verifying = false;
  VerifiedBookingCode? _verifiedResult;
  String? _verifyError;

  String _direction = 'SPORTYBET_TO_BETPAWA';
  bool _transferring = false;
  Map<String, dynamic>? _transferPreview;
  Map<String, dynamic>? _transferConfirmResult;
  String? _transferError;

  @override
  void dispose() {
    _verifyCtrl.dispose();
    _transferCtrl.dispose();
    super.dispose();
  }

  Future<void> _verifyCode() async {
    final code = _verifyCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _verifying = true;
      _verifyError = null;
      _verifiedResult = null;
    });
    try {
      final res = await context.read<FeedProvider>().verifyBookingCode(code);
      if (!mounted) return;
      setState(() => _verifiedResult = res);
    } catch (e) {
      if (!mounted) return;
      setState(() => _verifyError = e.toString());
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  Future<void> _previewTransfer() async {
    final code = _transferCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _transferring = true;
      _transferError = null;
      _transferPreview = null;
      _transferConfirmResult = null;
    });
    try {
      final token = await context.read<AuthProvider>().getIdToken();
      if (!mounted) return;
      final res = await context.read<FeedProvider>().previewTransfer(
            direction: _direction,
            bookingCode: code,
            bearerToken: token,
          );
      if (!mounted) return;
      setState(() => _transferPreview = res);
    } catch (e) {
      if (!mounted) return;
      setState(() => _transferError = e.toString());
    } finally {
      if (mounted) setState(() => _transferring = false);
    }
  }

  Future<void> _confirmTransfer() async {
    final preview = _transferPreview;
    if (preview == null) return;
    final matched = ((preview['matchedSelections'] as List<dynamic>?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
    if (matched.isEmpty) return;

    setState(() {
      _transferring = true;
      _transferError = null;
    });
    try {
      final token = await context.read<AuthProvider>().getIdToken();
      if (!mounted) return;
      final res = await context.read<FeedProvider>().confirmTransfer(
            bearerToken: token,
            payload: {
              'transferId': preview['transferId'],
              'direction': _direction,
              'originalCode': preview['originalCode'],
              'originalSelectionCount': preview['originalSelectionCount'] ?? 0,
              'originalCombinedOdds': preview['originalCombinedOdds'] ?? 1.0,
              'confirmedSelections': matched,
            },
          );
      if (!mounted) return;
      setState(() => _transferConfirmResult = res);
    } catch (e) {
      if (!mounted) return;
      setState(() => _transferError = e.toString());
    } finally {
      if (mounted) setState(() => _transferring = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final feed = context.watch<FeedProvider>();
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Slip Tools & Transfer')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          // Section 1: Booking Code Verifier
          Text(
            'Verify ${feed.activeBookmakerInfo.shortName} Code',
            style: textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _verifyCtrl,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(
                    labelText: 'Booking Code',
                    hintText: 'Enter code to verify live selections',
                  ),
                ),
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: _verifying ? null : _verifyCode,
                  icon: _verifying
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.verified_outlined, size: 18),
                  label: const Text('Verify Booking Code'),
                ),
                if (_verifyError != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    _verifyError!,
                    style: textTheme.bodySmall?.copyWith(
                      color: OdyxColors.lostRose,
                    ),
                  ),
                ],
                if (_verifiedResult != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Code ${_verifiedResult!.shareCode} • ${_verifiedResult!.selectionCount} legs • Odds ${OdyxFormatters.formatOdds(_verifiedResult!.combinedOdds)}',
                    style: textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: OdyxColors.wonEmerald,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 22),

          // Section 2: Cross-Bookmaker Bet Transfer
          Text(
            'Cross-Bookmaker Bet Transfer',
            style: textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                      value: 'SPORTYBET_TO_BETPAWA',
                      label: Text('SportyBet → betPawa'),
                    ),
                    ButtonSegment(
                      value: 'BETPAWA_TO_SPORTYBET',
                      label: Text('betPawa → SportyBet'),
                    ),
                  ],
                  selected: {_direction},
                  onSelectionChanged: (set) {
                    if (set.isNotEmpty) {
                      setState(() {
                        _direction = set.first;
                        _transferPreview = null;
                        _transferConfirmResult = null;
                      });
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _transferCtrl,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(
                    labelText: 'Source Booking Code',
                    hintText: 'Paste source code to convert',
                  ),
                ),
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: _transferring ? null : _previewTransfer,
                  icon: _transferring
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.swap_horiz_rounded, size: 18),
                  label: const Text('Preview Transfer'),
                ),
                if (_transferError != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    _transferError!,
                    style: textTheme.bodySmall?.copyWith(
                      color: OdyxColors.lostRose,
                    ),
                  ),
                ],
                if (_transferPreview != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Matched ${(_transferPreview!['matchedSelections'] as List<dynamic>? ?? const []).length} of ${_transferPreview!['originalSelectionCount'] ?? 0} selections',
                    style: textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if ((_transferPreview!['matchedSelections'] as List<dynamic>? ??
                          const [])
                      .isNotEmpty)
                    FilledButton.tonalIcon(
                      onPressed: _transferring ? null : _confirmTransfer,
                      icon: const Icon(Icons.check_circle_outline_rounded),
                      label: const Text('Generate Target Booking Code'),
                    ),
                ],
                if (_transferConfirmResult != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: OdyxColors.wonEmerald.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Target Code: ${_transferConfirmResult!['newBookingCode'] ?? _transferConfirmResult!['shareCode'] ?? 'Generated'}',
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w800,
                              color: OdyxColors.wonEmerald,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () async {
                            final code = (_transferConfirmResult![
                                        'newBookingCode'] ??
                                    _transferConfirmResult!['shareCode'] ??
                                    '')
                                .toString();
                            if (code.isEmpty) return;
                            await Clipboard.setData(ClipboardData(text: code));
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Copied $code')),
                            );
                          },
                          icon: const Icon(Icons.copy_rounded),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class AdminControlScreen extends StatefulWidget {
  const AdminControlScreen({super.key});

  @override
  State<AdminControlScreen> createState() => _AdminControlScreenState();
}

class _AdminControlScreenState extends State<AdminControlScreen> {
  bool _loading = true;
  bool _busyAction = false;
  Map<String, dynamic>? _state;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadState();
  }

  Future<void> _loadState() async {
    final token = await context.read<AuthProvider>().getIdToken();
    if (token == null || !mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await context.read<FeedProvider>().getAdminFactoryState(token);
      if (!mounted) return;
      setState(() => _state = data);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _runAction(
    String label,
    Future<Map<String, dynamic>> Function(String token) action,
  ) async {
    final token = await context.read<AuthProvider>().getIdToken();
    if (token == null || !mounted) return;
    setState(() => _busyAction = true);
    try {
      await action(token);
      await _loadState();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$label completed.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$label failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _busyAction = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final feed = context.watch<FeedProvider>();
    if (!auth.isAdmin) {
      return Scaffold(
        appBar: AppBar(title: const Text('Admin Control')),
        body: const Padding(
          padding: EdgeInsets.all(16),
          child: OdyxErrorState(
            message: 'Administrator verification required.',
          ),
        ),
      );
    }

    final logs =
        ((_state?['logs'] as List<dynamic>?) ?? const []).take(12).toList();
    final config = _state?['config'] as Map<String, dynamic>?;
    final enabled = config?['enabled'] == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Control Center'),
        actions: [
          IconButton(
            onPressed: _loading ? null : _loadState,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _loading
          ? const Padding(
              padding: EdgeInsets.all(16),
              child: TicketSkeletonList(itemCount: 2),
            )
          : _error != null
              ? Padding(
                  padding: const EdgeInsets.all(16),
                  child: OdyxErrorState(
                    message: _error!,
                    onRetry: _loadState,
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                  children: [
                    GlassCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Factory & Settlement Actions (${feed.activeBookmakerInfo.shortName})',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Automation is currently ${enabled ? 'ACTIVE' : 'PAUSED'}.',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: [
                              FilledButton.icon(
                                onPressed: _busyAction
                                    ? null
                                    : () => _runAction(
                                          'Daily Factory Run',
                                          feed.runFactoryNow,
                                        ),
                                icon: const Icon(Icons.play_arrow_rounded),
                                label: const Text('Generate Feed Now'),
                              ),
                              FilledButton.tonalIcon(
                                onPressed: _busyAction
                                    ? null
                                    : () => _runAction(
                                          'Result Settlement Check',
                                          feed.trackResultsNow,
                                        ),
                                icon: const Icon(Icons.fact_check_rounded),
                                label: const Text('Track Results'),
                              ),
                              OutlinedButton.icon(
                                onPressed: _busyAction
                                    ? null
                                    : () => _runAction(
                                          'Retry Booking Codes',
                                          feed.retryBookingCodesNow,
                                        ),
                                icon: const Icon(Icons.qr_code_rounded),
                                label: const Text('Retry Codes'),
                              ),
                              OutlinedButton.icon(
                                onPressed: _busyAction
                                    ? null
                                    : () => _runAction(
                                          'Toggle Automation',
                                          (t) => feed.toggleAutomation(
                                            enabled ? 'pause' : 'resume',
                                            t,
                                          ),
                                        ),
                                icon: Icon(
                                  enabled
                                      ? Icons.pause_rounded
                                      : Icons.play_circle_outline_rounded,
                                ),
                                label: Text(
                                  enabled
                                      ? 'Pause Automation'
                                      : 'Resume Automation',
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'Recent Execution Logs',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    ...logs.whereType<Map<String, dynamic>>().map((log) {
                      final status = (log['status'] ?? '').toString();
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: GlassCard(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      (log['actionType'] ?? 'JOB').toString(),
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                    Text(
                                      (log['summary'] ?? '').toString(),
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                status,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: status == 'FAILED'
                                      ? OdyxColors.lostRose
                                      : OdyxColors.wonEmerald,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
    );
  }
}
