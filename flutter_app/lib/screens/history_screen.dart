import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/ticket.dart';
import '../providers/auth_provider.dart';
import '../providers/feed_provider.dart';
import '../theme/odyx_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/state_views.dart';
import '../widgets/ticket_card.dart';
import 'auth_screen.dart';
import 'ticket_details_screen.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final feed = context.watch<FeedProvider>();
    final auth = context.watch<AuthProvider>();

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'HISTORY & SAVED',
                style: TextStyle(
                  fontSize: 16.5,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                ),
              ),
              Text(
                feed.activeBookmakerInfo.name,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: OdyxColors.accentBlue,
                    ),
              ),
            ],
          ),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Permanent Cycles'),
              Tab(text: 'Bookmarked'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _PermanentHistoryTab(feed: feed, auth: auth),
            _BookmarkedTab(feed: feed, auth: auth),
          ],
        ),
      ),
    );
  }
}

class _PermanentHistoryTab extends StatelessWidget {
  const _PermanentHistoryTab({
    required this.feed,
    required this.auth,
  });

  final FeedProvider feed;
  final AuthProvider auth;

  @override
  Widget build(BuildContext context) {
    final grouped = feed.archivedHistoryByDate;
    final cycles = feed.currentBookmakerCycles;

    if (grouped.isEmpty && cycles.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => feed.refreshFeed(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            OdyxEmptyState(
              icon: Icons.history_toggle_off_rounded,
              title: 'No Historical Cycles Yet',
              subtitle:
                  'Permanent ${feed.activeBookmakerInfo.name} tickets and settled cycles will be archived here.',
              actionLabel: 'Refresh History',
              onAction: () => feed.refreshFeed(),
            ),
          ],
        ),
      );
    }

    final dateKeys = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

    return RefreshIndicator(
      onRefresh: () => feed.refreshFeed(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
        children: [
          if (cycles.isNotEmpty) ...[
            Text(
              'Generation Cycles',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 102,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: cycles.take(12).length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, index) {
                  final c = cycles[index];
                  return SizedBox(
                    width: 190,
                    child: GlassCard(
                      padding: const EdgeInsets.all(12),
                      borderRadius: 14,
                      borderColor: c.isSettled
                          ? OdyxColors.wonEmerald.withValues(alpha: 0.32)
                          : OdyxColors.liveAmber.withValues(alpha: 0.35),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  c.dateKey,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(fontWeight: FontWeight.w800),
                                ),
                              ),
                              Text(
                                c.status,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: c.isSettled
                                      ? OdyxColors.wonEmerald
                                      : OdyxColors.liveAmber,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            '${c.ticketCount} tickets • ${c.finishedMatches}/${c.totalMatches} matches',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          Text(
                            '${c.wonTickets} Won • ${c.lostTickets} Lost • ${c.voidTickets} Void',
                            style: Theme.of(context).textTheme.labelSmall,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 18),
          ],
          ...dateKeys.map((dateKey) {
            final dayTickets = grouped[dateKey] ?? const <DailyTicket>[];
            final won =
                dayTickets.where((t) => t.status == TicketStatus.won).length;
            final lost =
                dayTickets.where((t) => t.status == TicketStatus.lost).length;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Text(
                        dateKey,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const Spacer(),
                      Text(
                        '${dayTickets.length} slips • ${won}W / ${lost}L',
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                    ],
                  ),
                ),
                ...dayTickets.map(
                  (ticket) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: TicketCard(
                      ticket: ticket,
                      isBookmarked: auth.isBookmarked(ticket.internalTicketId),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                TicketDetailsScreen(initialTicket: ticket),
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
                    ),
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }
}

class _BookmarkedTab extends StatelessWidget {
  const _BookmarkedTab({
    required this.feed,
    required this.auth,
  });

  final FeedProvider feed;
  final AuthProvider auth;

  @override
  Widget build(BuildContext context) {
    if (!auth.isSignedIn) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: OdyxEmptyState(
            icon: Icons.bookmark_added_rounded,
            title: 'Sign In to Sync Bookmarks',
            subtitle:
                'Save your favorite tickets across Android and web with a verified ODYX account.',
            actionLabel: 'Sign In',
            onAction: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const AuthScreen()),
              );
            },
          ),
        ),
      );
    }

    final savedTickets = feed.allBookmakerTickets
        .where((t) => auth.isBookmarked(t.internalTicketId))
        .toList();

    if (savedTickets.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: OdyxEmptyState(
            icon: Icons.bookmark_border_rounded,
            title: 'No Bookmarked Tickets',
            subtitle:
                'Tap the bookmark icon on any ${feed.activeBookmakerInfo.shortName} slip to save it here.',
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
      itemCount: savedTickets.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final ticket = savedTickets[index];
        return TicketCard(
          ticket: ticket,
          isBookmarked: true,
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => TicketDetailsScreen(initialTicket: ticket),
              ),
            );
          },
          onToggleBookmark: () => auth.toggleBookmark(ticket),
        );
      },
    );
  }
}
