import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/api_config.dart';
import '../models/ticket.dart';
import '../providers/auth_provider.dart';
import '../providers/feed_provider.dart';
import '../theme/odyx_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/state_views.dart';
import '../widgets/status_badge.dart';
import '../widgets/ticket_card.dart';
import 'ticket_details_screen.dart';

class DailyFeedScreen extends StatefulWidget {
  const DailyFeedScreen({super.key});

  @override
  State<DailyFeedScreen> createState() => _DailyFeedScreenState();
}

class _DailyFeedScreenState extends State<DailyFeedScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final feed = context.watch<FeedProvider>();
    final auth = context.watch<AuthProvider>();
    final apiConfig = context.read<ApiConfig>();
    final textTheme = Theme.of(context).textTheme;
    final tickets = feed.dailyFeedTickets;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'DAILY PICKS',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.1,
              ),
            ),
            Text(
              feed.activeBookmakerInfo.name,
              style: textTheme.labelSmall?.copyWith(
                color: OdyxColors.accentBlue,
              ),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<TicketSortOrder>(
            tooltip: 'Sort Tickets',
            initialValue: feed.sortOrder,
            onSelected: feed.setSortOrder,
            icon: const Icon(Icons.sort_rounded),
            itemBuilder: (context) => TicketSortOrder.values
                .map(
                  (order) => PopupMenuItem<TicketSortOrder>(
                    value: order,
                    child: Text(order.label),
                  ),
                )
                .toList(),
          ),
          IconButton(
            tooltip: 'Refresh Feed',
            onPressed: feed.isRefreshing ? null : () => feed.refreshFeed(),
            icon: feed.isRefreshing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => feed.refreshFeed(),
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    OfflineBanner(isOffline: feed.isOffline),
                    ApiConfigBanner(apiConfig: apiConfig),

                    // 5 Compact KPI Stat Cards
                    SizedBox(
                      height: 74,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          _StatChipCard(
                            label: 'Cycle Picks',
                            value: '${feed.currentCycleTickets.length}',
                            color: OdyxColors.accentBlue,
                          ),
                          const SizedBox(width: 10),
                          _StatChipCard(
                            label: 'Won',
                            value: '${feed.wonCount}',
                            color: OdyxColors.wonEmerald,
                          ),
                          const SizedBox(width: 10),
                          _StatChipCard(
                            label: 'Lost',
                            value: '${feed.lostCount}',
                            color: OdyxColors.lostRose,
                          ),
                          const SizedBox(width: 10),
                          _StatChipCard(
                            label: 'Active',
                            value: '${feed.activeMatchesCount}',
                            color: OdyxColors.liveAmber,
                          ),
                          const SizedBox(width: 10),
                          _StatChipCard(
                            label: 'Win Rate',
                            value: feed.winRatePct != null
                                ? '${feed.winRatePct!.toStringAsFixed(0)}%'
                                : '—',
                            color: OdyxColors.accentCyan,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Cycle Generation Lock / Result Status Banner
                    CycleStatusBanner(
                      feedState: feed.currentFeedState,
                      statusLabel: feed.cycleStatusLabel,
                      ticketCount: feed.currentCycleTickets.length,
                    ),
                    const SizedBox(height: 12),

                    // Search & Scope Row
                    TextField(
                      controller: _searchController,
                      onChanged: feed.setSearchQuery,
                      decoration: InputDecoration(
                        hintText: 'Search team, league, odds, or share code...',
                        prefixIcon: const Icon(Icons.search_rounded, size: 20),
                        suffixIcon: feed.searchQuery.isNotEmpty
                            ? IconButton(
                                onPressed: () {
                                  _searchController.clear();
                                  feed.setSearchQuery('');
                                },
                                icon: const Icon(Icons.close_rounded, size: 18),
                              )
                            : null,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Cycle Scope Toggle
                    SegmentedButton<FeedCycleScope>(
                      segments: FeedCycleScope.values
                          .map(
                            (scope) => ButtonSegment<FeedCycleScope>(
                              value: scope,
                              label: Text(scope.label),
                            ),
                          )
                          .toList(),
                      selected: {feed.cycleScope},
                      onSelectionChanged: (set) {
                        if (set.isNotEmpty) feed.setCycleScope(set.first);
                      },
                    ),
                    const SizedBox(height: 10),

                    // Section Filters
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          ChoiceChip(
                            label: const Text('All Sections'),
                            selected: feed.selectedSection == null,
                            onSelected: (_) => feed.setSectionFilter(null),
                          ),
                          const SizedBox(width: 8),
                          ...FeedSection.values.map(
                            (sec) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(sec.displayLabel),
                                selected: feed.selectedSection == sec,
                                onSelected: (_) => feed.setSectionFilter(sec),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Status Filters
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          FilterChip(
                            label: const Text('All Status'),
                            selected: feed.selectedStatus == null,
                            onSelected: (_) => feed.setStatusFilter(null),
                          ),
                          const SizedBox(width: 8),
                          ...[
                            TicketStatus.pending,
                            TicketStatus.live,
                            TicketStatus.won,
                            TicketStatus.lost,
                          ].map(
                            (st) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                label: Text(st.displayLabel),
                                selected: feed.selectedStatus == st,
                                onSelected: (_) => feed.setStatusFilter(
                                  feed.selectedStatus == st ? null : st,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),

            if (feed.isInitialLoading && tickets.isEmpty)
              const SliverPadding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverToBoxAdapter(child: TicketSkeletonList()),
              )
            else if (feed.apiError != null && tickets.isEmpty)
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverToBoxAdapter(
                  child: OdyxErrorState(
                    message: feed.apiError!,
                    onRetry: () => feed.refreshFeed(),
                  ),
                ),
              )
            else if (tickets.isEmpty)
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverToBoxAdapter(
                  child: OdyxEmptyState(
                    icon: Icons.filter_list_off_rounded,
                    title: 'No Matching Tickets Found',
                    subtitle: feed.searchQuery.isNotEmpty ||
                            feed.selectedSection != null ||
                            feed.selectedStatus != null
                        ? 'Try clearing your active search or filters.'
                        : 'New picks for ${feed.activeBookmakerInfo.name} will appear here as soon as the cycle publishes.',
                    actionLabel: feed.searchQuery.isNotEmpty ||
                            feed.selectedSection != null ||
                            feed.selectedStatus != null
                        ? 'Clear Filters'
                        : 'Refresh Feed',
                    onAction: () {
                      if (feed.searchQuery.isNotEmpty ||
                          feed.selectedSection != null ||
                          feed.selectedStatus != null) {
                        _searchController.clear();
                        feed.clearFilters();
                      } else {
                        feed.refreshFeed();
                      }
                    },
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                sliver: SliverLayoutBuilder(
                  builder: (context, constraints) {
                    final crossAxisCount =
                        constraints.crossAxisExtent >= 760 ? 2 : 1;
                    if (crossAxisCount == 1) {
                      return SliverList.separated(
                        itemCount: tickets.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) => _buildTicketItem(
                          context,
                          tickets[index],
                          auth,
                        ),
                      );
                    }
                    return SliverGrid.builder(
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        mainAxisExtent: 340,
                      ),
                      itemCount: tickets.length,
                      itemBuilder: (context, index) => _buildTicketItem(
                        context,
                        tickets[index],
                        auth,
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTicketItem(
    BuildContext context,
    DailyTicket ticket,
    AuthProvider auth,
  ) {
    return TicketCard(
      ticket: ticket,
      isBookmarked: auth.isBookmarked(ticket.internalTicketId),
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => TicketDetailsScreen(initialTicket: ticket),
          ),
        );
      },
      onToggleBookmark: () async {
        final ok = await auth.toggleBookmark(ticket);
        if (!context.mounted) return;
        if (!ok && auth.errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(auth.errorMessage!)),
          );
        }
      },
    );
  }
}

class _StatChipCard extends StatelessWidget {
  const _StatChipCard({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 108,
      child: GlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        borderRadius: 14,
        borderColor: color.withValues(alpha: 0.30),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontSize: 10.5,
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w900,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
