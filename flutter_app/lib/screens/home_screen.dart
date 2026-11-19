import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/api_config.dart';
import '../core/utils/formatters.dart';
import '../providers/auth_provider.dart';
import '../providers/feed_provider.dart';
import '../theme/odyx_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/odyx_brand_mark.dart';
import '../widgets/state_views.dart';
import 'auth_screen.dart';
import 'tools_screens.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.onNavigateToTab,
  });

  final ValueChanged<int> onNavigateToTab;

  @override
  Widget build(BuildContext context) {
    final feed = context.watch<FeedProvider>();
    final auth = context.watch<AuthProvider>();
    final apiConfig = context.read<ApiConfig>();
    final textTheme = Theme.of(context).textTheme;
    final analytics = feed.currentAnalytics;

    return Scaffold(
      appBar: AppBar(
        title: const OdyxBrandHeader(compact: true),
        actions: [
          IconButton(
            tooltip: 'Refresh Intelligence',
            onPressed: feed.isRefreshing ? null : () => feed.refreshFeed(),
            icon: feed.isRefreshing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh_rounded),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: IconButton(
              tooltip: auth.isSignedIn ? 'Account Settings' : 'Sign In',
              onPressed: () {
                if (auth.isSignedIn) {
                  onNavigateToTab(3);
                } else {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const AuthScreen(),
                    ),
                  );
                }
              },
              icon: Icon(
                auth.isSignedIn
                    ? Icons.verified_user_rounded
                    : Icons.login_rounded,
                color: auth.isSignedIn ? OdyxColors.wonEmerald : null,
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => feed.refreshFeed(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            OfflineBanner(isOffline: feed.isOffline),
            ApiConfigBanner(apiConfig: apiConfig),

            // Hero Intelligence Card
            GlassCard(
              accentGlowColor: OdyxColors.accentBlue,
              borderColor: OdyxColors.accentBlue.withValues(alpha: 0.35),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: OdyxColors.accentBlue.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          feed.activeBookmakerInfo.name.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                            color: OdyxColors.accentBlue,
                          ),
                        ),
                      ),
                      const Spacer(),
                      if (feed.lastSyncedAt != null)
                        Text(
                          'Synced ${OdyxFormatters.formatIsoCompact(feed.lastSyncedAt!.toIso8601String())}',
                          style: textTheme.labelSmall,
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Welcome back, ${auth.displayName}',
                    style: textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    feed.activeBookmakerInfo.tagline,
                    style: textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      FilledButton.icon(
                        onPressed: () => onNavigateToTab(1),
                        icon: const Icon(Icons.bolt_rounded, size: 18),
                        label: const Text('Open Daily Feed'),
                      ),
                      OutlinedButton.icon(
                        onPressed: () => onNavigateToTab(2),
                        icon: const Icon(Icons.history_rounded, size: 18),
                        label: const Text('View History'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // KPI Summary Grid
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.55,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _KpiTile(
                  label: 'Total Tickets',
                  value: '${feed.totalTicketsCount}',
                  subtitle: '${feed.currentCycleTickets.length} in latest cycle',
                  color: OdyxColors.accentBlue,
                  icon: Icons.confirmation_number_rounded,
                ),
                _KpiTile(
                  label: 'Win Rate',
                  value: feed.winRatePct != null
                      ? '${feed.winRatePct!.toStringAsFixed(1)}%'
                      : '—',
                  subtitle: '${feed.wonCount} Won • ${feed.lostCount} Lost',
                  color: OdyxColors.wonEmerald,
                  icon: Icons.trending_up_rounded,
                ),
                _KpiTile(
                  label: 'Live & Pending',
                  value: '${feed.activeMatchesCount}',
                  subtitle: feed.cycleStatusLabel,
                  color: OdyxColors.liveAmber,
                  icon: Icons.sports_soccer_rounded,
                ),
                _KpiTile(
                  label: 'Verified Codes',
                  value: '${analytics?.validSharingCodes ?? 0}',
                  subtitle: 'Ready for one-tap copy',
                  color: OdyxColors.accentCyan,
                  icon: Icons.qr_code_2_rounded,
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Tools & Market Intelligence Section
            Text(
              'Market Intelligence Tools',
              style: textTheme.titleMedium,
            ),
            const SizedBox(height: 10),
            _ToolActionTile(
              icon: Icons.live_tv_rounded,
              color: OdyxColors.liveAmber,
              title: 'Live & Upcoming Fixtures',
              subtitle:
                  'Inspect real-time scores and upcoming ${feed.activeBookmakerInfo.shortName} matches',
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const MatchesExplorerScreen(),
                  ),
                );
              },
            ),
            const SizedBox(height: 10),
            _ToolActionTile(
              icon: Icons.swap_horiz_rounded,
              color: OdyxColors.accentCyan,
              title: 'Verify Code & Bet Transfer',
              subtitle:
                  'Verify booking codes or convert slips between SportyBet TZ & betPawa TZ',
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const BookingToolsScreen(),
                  ),
                );
              },
            ),
            if (auth.isAdmin) ...[
              const SizedBox(height: 10),
              _ToolActionTile(
                icon: Icons.admin_panel_settings_rounded,
                color: OdyxColors.wonEmerald,
                title: 'Admin Control Center',
                subtitle:
                    'Trigger factory runs, settle tickets, and manage scheduler jobs',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const AdminControlScreen(),
                    ),
                  );
                },
              ),
            ],

            if (analytics != null && analytics.byCategory.isNotEmpty) ...[
              const SizedBox(height: 22),
              Text(
                'Category Performance',
                style: textTheme.titleMedium,
              ),
              const SizedBox(height: 10),
              GlassCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  children: analytics.byCategory.take(6).map((row) {
                    final rate = row.winRatePct;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  row.label,
                                  style: textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  '${row.won}W / ${row.lost}L / ${row.pending}P • ${row.total} total',
                                  style: textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          Text(
                            rate != null ? '${rate.toStringAsFixed(0)}%' : '—',
                            style: textTheme.titleMedium?.copyWith(
                              color: rate != null && rate >= 60
                                  ? OdyxColors.wonEmerald
                                  : OdyxColors.accentBlue,
                              fontFeatures: const [
                                FontFeature.tabularFigures(),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _KpiTile extends StatelessWidget {
  const _KpiTile({
    required this.label,
    required this.value,
    required this.subtitle,
    required this.color,
    required this.icon,
  });

  final String label;
  final String value;
  final String subtitle;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return GlassCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, size: 17, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: textTheme.labelSmall,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          Text(
            value,
            style: textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          Text(
            subtitle,
            style: textTheme.bodySmall?.copyWith(fontSize: 11),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _ToolActionTile extends StatelessWidget {
  const _ToolActionTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}
