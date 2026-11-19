import 'package:flutter_test/flutter_test.dart';
import 'package:odyx/core/utils/daily_feed_filter.dart';
import 'package:odyx/models/bookmaker.dart';
import 'package:odyx/models/ticket.dart';
import 'package:odyx/repositories/odyx_repository.dart';

DailyTicket _sampleTicket({
  required String id,
  BookmakerId bookmaker = BookmakerId.sportybetTz,
  TicketStatus status = TicketStatus.pending,
  String marketId = '18',
  String marketName = 'Over/Under',
  String outcomeDesc = 'Over 1.5',
  String? shareCode,
  int settledCount = 0,
}) {
  return DailyTicket(
    internalTicketId: id,
    bookmakerId: bookmaker,
    bookmakerName: bookmaker == BookmakerId.betpawaTz
        ? 'betPawa Tanzania'
        : 'SportyBet Tanzania',
    feedSection: FeedSection.upcoming,
    signature: id,
    sourceType: 'DAILY_FACTORY',
    categoryId: 'cat_2_3',
    categoryLabel: '2.00-3.00',
    targetOdds: 2.4,
    actualCombinedOdds: 2.35,
    selectionCount: 2,
    selections: [
      TicketSelection(
        selectionKey: '${id}_sel_1',
        eventId: 'ev_1',
        homeTeam: 'Simba SC',
        awayTeam: 'Young Africans',
        leagueId: 'lg_tz',
        leagueName: 'Tanzania Premier League',
        country: 'Tanzania',
        estimateStartTime: 1790000000000,
        matchStatus: 'Not Started',
        isLive: false,
        marketId: marketId,
        marketName: marketName,
        specifier: '',
        outcomeId: '12',
        outcomeDesc: outcomeDesc,
        odds: 1.55,
        bookmakerId: bookmaker,
      ),
    ],
    kickoffStartMs: 1790000000000,
    kickoffEndMs: 1790003600000,
    dataSource: 'SportyBet TZ',
    generatedAt: '2026-11-19T06:00:00.000Z',
    generatedDateKey: '2026-11-19',
    status: status,
    effectiveCombinedOdds: 2.35,
    settledMatchCount: settledCount,
    totalMatchCount: 2,
    unfinishedMatchCount: 2 - settledCount,
    selectionSettlements: const [],
    shareCode: shareCode,
    shareCodeVerified: shareCode != null,
    bookingCodeStatus: shareCode != null
        ? BookingCodeStatus.generated
        : BookingCodeStatus.notRequested,
  );
}

void main() {
  group('DailyFeedFilter', () {
    test('blocks disallowed 1X2 and Draw No Bet markets', () {
      final disallowed = _sampleTicket(
        id: 't1',
        marketId: '1',
        marketName: '1X2',
        outcomeDesc: 'Home',
      );
      expect(DailyFeedFilter.isTicketAllowed(disallowed), isFalse);

      final dnb = _sampleTicket(
        id: 't2',
        marketId: '11',
        marketName: 'Draw No Bet',
        outcomeDesc: 'Away',
      );
      expect(DailyFeedFilter.isTicketAllowed(dnb), isFalse);
    });

    test('allows Over/Under and Goal markets', () {
      final allowed = _sampleTicket(
        id: 't3',
        marketId: '18',
        marketName: 'Total Goals',
        outcomeDesc: 'Over 1.5',
      );
      expect(DailyFeedFilter.isTicketAllowed(allowed), isTrue);
    });
  });

  group('OdyxFeedMerger', () {
    test('preserves permanent WON status even if API returns PENDING', () {
      final fbWon = _sampleTicket(
        id: 'SB-100',
        status: TicketStatus.won,
        shareCode: 'ABC123',
        settledCount: 2,
      );
      final apiPending = _sampleTicket(
        id: 'SB-100',
        status: TicketStatus.pending,
        settledCount: 0,
      );

      final merged = OdyxFeedMerger.mergeImmutableFeeds(
        firebaseTickets: [fbWon],
        apiTickets: [apiPending],
      );

      expect(merged.length, 1);
      expect(merged.first.status, TicketStatus.won);
      expect(merged.first.shareCode, 'ABC123');
    });

    test('applies newly resolved WON status and booking code to PENDING slip', () {
      final fbPending = _sampleTicket(
        id: 'BP-200',
        bookmaker: BookmakerId.betpawaTz,
        status: TicketStatus.pending,
      );
      final apiWon = _sampleTicket(
        id: 'BP-200',
        bookmaker: BookmakerId.betpawaTz,
        status: TicketStatus.won,
        shareCode: 'BP9912',
        settledCount: 2,
      );

      final merged = OdyxFeedMerger.mergeImmutableFeeds(
        firebaseTickets: [fbPending],
        apiTickets: [apiWon],
      );

      expect(merged.length, 1);
      expect(merged.first.status, TicketStatus.won);
      expect(merged.first.shareCode, 'BP9912');
      expect(merged.first.bookmakerId, BookmakerId.betpawaTz);
    });
  });
}
