import '../core/utils/daily_feed_filter.dart';
import '../models/ticket.dart';

class OdyxFeedMerger {
  OdyxFeedMerger._();

  static List<DailyTicket> mapFirestoreDocs({
    required List<Map<String, dynamic>> ticketDocs,
    required List<Map<String, dynamic>> updateDocs,
  }) {
    final updateMap = <String, Map<String, dynamic>>{};
    for (final upd in updateDocs) {
      final key = (upd['internalTicketId'] ?? upd['id'] ?? '').toString();
      if (key.isNotEmpty) {
        updateMap[key] = upd;
      }
    }

    return ticketDocs.map((docItem) {
      final ticketId =
          (docItem['internalTicketId'] ?? docItem['id'] ?? '').toString();
      return DailyTicket.fromFirestoreDocs(docItem, updateMap[ticketId]);
    }).toList();
  }

  /// Preserves permanent Firestore WON/LOST/VOID ticket integrity while merging
  /// fresher settlement / booking-code updates from the backend API.
  static List<DailyTicket> mergeImmutableFeeds({
    required List<DailyTicket> firebaseTickets,
    required List<DailyTicket> apiTickets,
  }) {
    final merged = <String, DailyTicket>{};

    for (final fb in firebaseTickets) {
      if (fb.internalTicketId.isNotEmpty) {
        merged[fb.internalTicketId] = fb;
      }
    }

    for (final api in apiTickets) {
      if (api.internalTicketId.isEmpty) continue;
      final existing = merged[api.internalTicketId];
      if (existing == null) {
        merged[api.internalTicketId] = api;
        continue;
      }

      // WON and VOID outcomes are permanently locked
      if (existing.status == TicketStatus.won ||
          existing.status == TicketStatus.voided) {
        continue;
      }

      // LOST tickets lock status & odds, while allowing remaining legs to finish settling
      if (existing.status == TicketStatus.lost) {
        final existingSettledCount = existing.selectionSettlements
            .where((s) => s.status.isTerminal)
            .length;
        final apiSettledCount =
            api.selectionSettlements.where((s) => s.status.isTerminal).length;
        if (apiSettledCount > existingSettledCount) {
          merged[api.internalTicketId] = existing.copyWith(
            selectionSettlements: api.selectionSettlements,
            settledMatchCount: api.settledMatchCount,
            totalMatchCount: api.totalMatchCount,
            unfinishedMatchCount: api.unfinishedMatchCount,
            lastCheckedAt: api.lastCheckedAt,
          );
        }
        continue;
      }

      final shouldApplyUpdate = api.status.isTerminal ||
          (api.shareCode != null && existing.shareCode == null) ||
          api.status != existing.status ||
          api.settledMatchCount != existing.settledMatchCount ||
          api.selectionSettlements.length >
              existing.selectionSettlements.length;

      if (shouldApplyUpdate) {
        merged[api.internalTicketId] = existing.copyWith(
          status: api.status,
          effectiveCombinedOdds: api.effectiveCombinedOdds,
          settledMatchCount: api.settledMatchCount,
          totalMatchCount: api.totalMatchCount,
          unfinishedMatchCount: api.unfinishedMatchCount,
          shareCode: api.shareCode ?? existing.shareCode,
          shareUrl: api.shareUrl ?? existing.shareUrl,
          shareCodeVerified:
              api.shareCodeVerified || existing.shareCodeVerified,
          bookingCodeStatus: (api.shareCode ?? existing.shareCode) != null
              ? BookingCodeStatus.generated
              : api.bookingCodeStatus,
          bookingCodeError: api.bookingCodeError ?? existing.bookingCodeError,
          selectionSettlements: api.selectionSettlements.isNotEmpty
              ? api.selectionSettlements
              : existing.selectionSettlements,
          settledAt: api.settledAt ?? existing.settledAt,
          lastCheckedAt: api.lastCheckedAt ?? existing.lastCheckedAt,
        );
      }
    }

    final result = merged.values
        .where(DailyFeedFilter.isTicketAllowed)
        .toList()
      ..sort((a, b) => b.generatedAt.compareTo(a.generatedAt));

    return result;
  }
}
