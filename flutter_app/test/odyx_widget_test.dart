import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:odyx/config/api_config.dart';
import 'package:odyx/models/bookmaker.dart';
import 'package:odyx/models/ticket.dart';
import 'package:odyx/theme/odyx_theme.dart';
import 'package:odyx/widgets/odyx_brand_mark.dart';
import 'package:odyx/widgets/state_views.dart';
import 'package:odyx/widgets/status_badge.dart';
import 'package:odyx/widgets/ticket_card.dart';

void main() {
  testWidgets('TicketCard renders combined odds, booking code, and teams', (
    WidgetTester tester,
  ) async {
    const ticket = DailyTicket(
      internalTicketId: 'SB-DAY-001',
      bookmakerId: BookmakerId.sportybetTz,
      bookmakerName: 'SportyBet Tanzania',
      feedSection: FeedSection.upcoming,
      signature: 'sig_1',
      sourceType: 'DAILY_FACTORY',
      categoryId: 'cat_2_3',
      categoryLabel: '2.00-3.00',
      targetOdds: 2.5,
      actualCombinedOdds: 2.48,
      selectionCount: 2,
      selections: [
        TicketSelection(
          selectionKey: 's1',
          eventId: 'e1',
          homeTeam: 'Arsenal',
          awayTeam: 'Chelsea',
          leagueId: 'epl',
          leagueName: 'Premier League',
          country: 'England',
          estimateStartTime: 1790000000000,
          matchStatus: 'Not Started',
          isLive: false,
          marketId: '18',
          marketName: 'Total Goals',
          specifier: '',
          outcomeId: '12',
          outcomeDesc: 'Over 1.5',
          odds: 1.40,
          bookmakerId: BookmakerId.sportybetTz,
        ),
      ],
      kickoffStartMs: 1790000000000,
      kickoffEndMs: 1790003600000,
      dataSource: 'SportyBet TZ',
      generatedAt: '2026-11-19T06:00:00.000Z',
      generatedDateKey: '2026-11-19',
      status: TicketStatus.won,
      effectiveCombinedOdds: 2.48,
      settledMatchCount: 2,
      totalMatchCount: 2,
      unfinishedMatchCount: 0,
      selectionSettlements: [],
      shareCode: 'ODX889',
      shareCodeVerified: true,
      bookingCodeStatus: BookingCodeStatus.generated,
    );

    var tapped = false;
    await tester.pumpWidget(
      MaterialApp(
        theme: OdyxTheme.dark(),
        home: Scaffold(
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: TicketCard(
              ticket: ticket,
              isBookmarked: false,
              onTap: () => tapped = true,
              onToggleBookmark: () {},
            ),
          ),
        ),
      ),
    );

    expect(find.text('2.48'), findsOneWidget);
    expect(find.text('ODX889'), findsOneWidget);
    expect(find.text('Arsenal vs Chelsea'), findsOneWidget);
    expect(find.text('WON'), findsOneWidget);

    await tester.tap(find.text('View Slip'));
    await tester.pump();
    expect(tapped, isTrue);
  });

  testWidgets('CycleStatusBanner and ApiConfigBanner show user-friendly text', (
    WidgetTester tester,
  ) async {
    final missingConfig = ApiConfig(overrideBaseUrl: '');
    const feedState = BookmakerFeedState(
      bookmakerId: BookmakerId.betpawaTz,
      bookmakerName: 'betPawa Tanzania',
      generationLocked: true,
      lockReason: 'Waiting for unfinished matches',
      totalTicketsInCycle: 4,
      settledTicketsInCycle: 1,
      unsettledTicketsCount: 3,
      totalMatchesInCycle: 8,
      finishedMatchesCount: 3,
      unfinishedMatchesCount: 5,
      unverifiedMatchesCount: 0,
      verificationFailuresCount: 0,
      updatedAt: '2026-11-19T08:00:00.000Z',
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: OdyxTheme.light(),
        home: Scaffold(
          body: Column(
            children: [
              const OdyxBrandHeader(),
              ApiConfigBanner(apiConfig: missingConfig),
              const CycleStatusBanner(
                feedState: feedState,
                statusLabel: 'Waiting for all matches to finish',
                ticketCount: 4,
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('ODYX'), findsOneWidget);
    expect(find.text('Backend API URL Not Configured'), findsOneWidget);
    expect(find.text('Waiting for all matches to finish'), findsOneWidget);
  });
}
