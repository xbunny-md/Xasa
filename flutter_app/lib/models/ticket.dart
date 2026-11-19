import 'package:cloud_firestore/cloud_firestore.dart';
import 'bookmaker.dart';

enum TicketStatus {
  pending('PENDING'),
  live('LIVE'),
  won('WON'),
  lost('LOST'),
  voided('VOID'),
  partiallySettled('PARTIALLY_SETTLED'),
  unverified('UNVERIFIED');

  const TicketStatus(this.apiValue);
  final String apiValue;

  bool get isTerminal =>
      this == TicketStatus.won ||
      this == TicketStatus.lost ||
      this == TicketStatus.voided;

  String get displayLabel {
    switch (this) {
      case TicketStatus.won:
        return 'WON';
      case TicketStatus.lost:
        return 'LOST';
      case TicketStatus.voided:
        return 'VOID';
      case TicketStatus.live:
        return 'LIVE';
      case TicketStatus.partiallySettled:
        return 'IN PROGRESS';
      case TicketStatus.unverified:
        return 'UPDATING';
      case TicketStatus.pending:
        return 'PENDING';
    }
  }

  static TicketStatus fromRaw(dynamic raw) {
    final v = (raw ?? '').toString().trim().toUpperCase();
    switch (v) {
      case 'WON':
        return TicketStatus.won;
      case 'LOST':
        return TicketStatus.lost;
      case 'VOID':
        return TicketStatus.voided;
      case 'LIVE':
        return TicketStatus.live;
      case 'PARTIALLY_SETTLED':
        return TicketStatus.partiallySettled;
      case 'UNVERIFIED':
        return TicketStatus.unverified;
      default:
        return TicketStatus.pending;
    }
  }
}

enum SelectionSettlementStatus {
  upcoming('UPCOMING'),
  pending('PENDING'),
  live('LIVE'),
  won('WON'),
  lost('LOST'),
  voided('VOID'),
  postponed('POSTPONED'),
  suspended('SUSPENDED'),
  unverified('UNVERIFIED');

  const SelectionSettlementStatus(this.apiValue);
  final String apiValue;

  bool get isTerminal =>
      this == SelectionSettlementStatus.won ||
      this == SelectionSettlementStatus.lost ||
      this == SelectionSettlementStatus.voided;

  static SelectionSettlementStatus fromRaw(dynamic raw) {
    final v = (raw ?? '').toString().trim().toUpperCase();
    switch (v) {
      case 'WON':
        return SelectionSettlementStatus.won;
      case 'LOST':
        return SelectionSettlementStatus.lost;
      case 'VOID':
        return SelectionSettlementStatus.voided;
      case 'LIVE':
        return SelectionSettlementStatus.live;
      case 'POSTPONED':
        return SelectionSettlementStatus.postponed;
      case 'SUSPENDED':
        return SelectionSettlementStatus.suspended;
      case 'UNVERIFIED':
        return SelectionSettlementStatus.unverified;
      case 'UPCOMING':
        return SelectionSettlementStatus.upcoming;
      default:
        return SelectionSettlementStatus.pending;
    }
  }
}

enum FeedSection {
  upcoming('UPCOMING'),
  liveFootball('LIVE_FOOTBALL'),
  otherSports('OTHER_SPORTS');

  const FeedSection(this.apiValue);
  final String apiValue;

  String get displayLabel {
    switch (this) {
      case FeedSection.liveFootball:
        return 'Live Football';
      case FeedSection.otherSports:
        return 'Other Games';
      case FeedSection.upcoming:
        return 'Upcoming';
    }
  }

  static FeedSection fromRaw(dynamic raw) {
    final v = (raw ?? '').toString().trim().toUpperCase();
    if (v == 'LIVE_FOOTBALL') return FeedSection.liveFootball;
    if (v == 'OTHER_SPORTS') return FeedSection.otherSports;
    return FeedSection.upcoming;
  }
}

enum BookingCodeStatus {
  generated('GENERATED'),
  failed('FAILED'),
  notRequested('NOT_REQUESTED');

  const BookingCodeStatus(this.apiValue);
  final String apiValue;

  static BookingCodeStatus fromRaw(dynamic raw) {
    final v = (raw ?? '').toString().trim().toUpperCase();
    if (v == 'GENERATED') return BookingCodeStatus.generated;
    if (v == 'FAILED') return BookingCodeStatus.failed;
    return BookingCodeStatus.notRequested;
  }
}

String parseTimestampToIso(dynamic value, {String fallback = ''}) {
  if (value == null) return fallback;
  if (value is String) return value;
  if (value is Timestamp) return value.toDate().toUtc().toIso8601String();
  if (value is DateTime) return value.toUtc().toIso8601String();
  return fallback;
}

double _toDouble(dynamic v, [double fallback = 0.0]) {
  if (v is num) return v.toDouble();
  return double.tryParse((v ?? '').toString()) ?? fallback;
}

int _toInt(dynamic v, [int fallback = 0]) {
  if (v is num) return v.toInt();
  return int.tryParse((v ?? '').toString()) ?? fallback;
}

class TicketSelection {
  const TicketSelection({
    required this.selectionKey,
    required this.eventId,
    required this.homeTeam,
    required this.awayTeam,
    required this.leagueId,
    required this.leagueName,
    required this.country,
    required this.estimateStartTime,
    required this.matchStatus,
    required this.isLive,
    required this.marketId,
    required this.marketName,
    required this.specifier,
    required this.outcomeId,
    required this.outcomeDesc,
    required this.odds,
    required this.bookmakerId,
    this.sportId,
    this.sportName,
  });

  final String selectionKey;
  final String eventId;
  final String homeTeam;
  final String awayTeam;
  final String leagueId;
  final String leagueName;
  final String country;
  final int estimateStartTime;
  final String matchStatus;
  final bool isLive;
  final String marketId;
  final String marketName;
  final String specifier;
  final String outcomeId;
  final String outcomeDesc;
  final double odds;
  final BookmakerId bookmakerId;
  final String? sportId;
  final String? sportName;

  factory TicketSelection.fromJson(Map<String, dynamic> json) {
    return TicketSelection(
      selectionKey: (json['selectionKey'] ?? '').toString(),
      eventId: (json['eventId'] ?? '').toString(),
      homeTeam: (json['homeTeam'] ?? 'Home').toString(),
      awayTeam: (json['awayTeam'] ?? 'Away').toString(),
      leagueId: (json['leagueId'] ?? '').toString(),
      leagueName: (json['leagueName'] ?? '').toString(),
      country: (json['country'] ?? '').toString(),
      estimateStartTime: _toInt(json['estimateStartTime']),
      matchStatus: (json['matchStatus'] ?? 'Scheduled').toString(),
      isLive: json['isLive'] == true,
      marketId: (json['marketId'] ?? '').toString(),
      marketName: (json['marketName'] ?? '').toString(),
      specifier: (json['specifier'] ?? '').toString(),
      outcomeId: (json['outcomeId'] ?? '').toString(),
      outcomeDesc: (json['outcomeDesc'] ?? '').toString(),
      odds: _toDouble(json['odds'], 1.0),
      bookmakerId: BookmakerId.fromRaw(json['bookmakerId']),
      sportId: json['sportId']?.toString(),
      sportName: json['sportName']?.toString(),
    );
  }
}

class SelectionSettlement {
  const SelectionSettlement({
    required this.selectionKey,
    required this.eventId,
    required this.status,
    required this.officialMatchStatus,
    this.score,
    this.playedSeconds,
    this.currentOdds,
    this.oddsChanged = false,
    required this.reason,
    required this.checkedAt,
  });

  final String selectionKey;
  final String eventId;
  final SelectionSettlementStatus status;
  final String officialMatchStatus;
  final String? score;
  final String? playedSeconds;
  final double? currentOdds;
  final bool oddsChanged;
  final String reason;
  final String checkedAt;

  factory SelectionSettlement.fromJson(Map<String, dynamic> json) {
    return SelectionSettlement(
      selectionKey: (json['selectionKey'] ?? '').toString(),
      eventId: (json['eventId'] ?? '').toString(),
      status: SelectionSettlementStatus.fromRaw(json['status']),
      officialMatchStatus: (json['officialMatchStatus'] ?? '').toString(),
      score: json['score']?.toString().isNotEmpty == true
          ? json['score'].toString()
          : null,
      playedSeconds: json['playedSeconds']?.toString().isNotEmpty == true
          ? json['playedSeconds'].toString()
          : null,
      currentOdds:
          json['currentOdds'] is num ? (json['currentOdds'] as num).toDouble() : null,
      oddsChanged: json['oddsChanged'] == true,
      reason: (json['reason'] ?? '').toString(),
      checkedAt: parseTimestampToIso(json['checkedAt']),
    );
  }
}

class DailyTicket {
  const DailyTicket({
    required this.internalTicketId,
    required this.bookmakerId,
    required this.bookmakerName,
    this.cycleId,
    required this.feedSection,
    this.sportId,
    this.sportName,
    this.replacedTicketId,
    required this.signature,
    required this.sourceType,
    required this.categoryId,
    required this.categoryLabel,
    required this.targetOdds,
    required this.actualCombinedOdds,
    required this.selectionCount,
    required this.selections,
    required this.kickoffStartMs,
    required this.kickoffEndMs,
    required this.dataSource,
    required this.generatedAt,
    required this.generatedDateKey,
    required this.status,
    required this.effectiveCombinedOdds,
    required this.settledMatchCount,
    required this.totalMatchCount,
    required this.unfinishedMatchCount,
    required this.selectionSettlements,
    this.shareCode,
    this.shareUrl,
    required this.shareCodeVerified,
    required this.bookingCodeStatus,
    this.bookingCodeError,
    this.settledAt,
    this.lastCheckedAt,
  });

  final String internalTicketId;
  final BookmakerId bookmakerId;
  final String bookmakerName;
  final String? cycleId;
  final FeedSection feedSection;
  final String? sportId;
  final String? sportName;
  final String? replacedTicketId;
  final String signature;
  final String sourceType;
  final String categoryId;
  final String categoryLabel;
  final double targetOdds;
  final double actualCombinedOdds;
  final int selectionCount;
  final List<TicketSelection> selections;
  final int kickoffStartMs;
  final int kickoffEndMs;
  final String dataSource;
  final String generatedAt;
  final String generatedDateKey;
  final TicketStatus status;
  final double effectiveCombinedOdds;
  final int settledMatchCount;
  final int totalMatchCount;
  final int unfinishedMatchCount;
  final List<SelectionSettlement> selectionSettlements;
  final String? shareCode;
  final String? shareUrl;
  final bool shareCodeVerified;
  final BookingCodeStatus bookingCodeStatus;
  final String? bookingCodeError;
  final String? settledAt;
  final String? lastCheckedAt;

  String get sectionLabel {
    if (feedSection == FeedSection.otherSports &&
        sportName != null &&
        sportName!.trim().isNotEmpty) {
      return sportName!;
    }
    return feedSection.displayLabel;
  }

  double get settlementProgress {
    final total = totalMatchCount > 0 ? totalMatchCount : selections.length;
    if (total <= 0) return 0;
    return (settledMatchCount / total).clamp(0.0, 1.0);
  }

  DailyTicket copyWith({
    TicketStatus? status,
    double? effectiveCombinedOdds,
    int? settledMatchCount,
    int? totalMatchCount,
    int? unfinishedMatchCount,
    List<SelectionSettlement>? selectionSettlements,
    String? shareCode,
    String? shareUrl,
    bool? shareCodeVerified,
    BookingCodeStatus? bookingCodeStatus,
    String? bookingCodeError,
    String? settledAt,
    String? lastCheckedAt,
  }) {
    return DailyTicket(
      internalTicketId: internalTicketId,
      bookmakerId: bookmakerId,
      bookmakerName: bookmakerName,
      cycleId: cycleId,
      feedSection: feedSection,
      sportId: sportId,
      sportName: sportName,
      replacedTicketId: replacedTicketId,
      signature: signature,
      sourceType: sourceType,
      categoryId: categoryId,
      categoryLabel: categoryLabel,
      targetOdds: targetOdds,
      actualCombinedOdds: actualCombinedOdds,
      selectionCount: selectionCount,
      selections: selections,
      kickoffStartMs: kickoffStartMs,
      kickoffEndMs: kickoffEndMs,
      dataSource: dataSource,
      generatedAt: generatedAt,
      generatedDateKey: generatedDateKey,
      status: status ?? this.status,
      effectiveCombinedOdds:
          effectiveCombinedOdds ?? this.effectiveCombinedOdds,
      settledMatchCount: settledMatchCount ?? this.settledMatchCount,
      totalMatchCount: totalMatchCount ?? this.totalMatchCount,
      unfinishedMatchCount: unfinishedMatchCount ?? this.unfinishedMatchCount,
      selectionSettlements: selectionSettlements ?? this.selectionSettlements,
      shareCode: shareCode ?? this.shareCode,
      shareUrl: shareUrl ?? this.shareUrl,
      shareCodeVerified: shareCodeVerified ?? this.shareCodeVerified,
      bookingCodeStatus: bookingCodeStatus ?? this.bookingCodeStatus,
      bookingCodeError: bookingCodeError ?? this.bookingCodeError,
      settledAt: settledAt ?? this.settledAt,
      lastCheckedAt: lastCheckedAt ?? this.lastCheckedAt,
    );
  }

  factory DailyTicket.fromApiJson(Map<String, dynamic> json) {
    final bk = BookmakerId.fromRaw(json['bookmakerId']);
    final rawSelections = (json['selections'] as List<dynamic>?) ?? const [];
    final selections = rawSelections
        .whereType<Map<String, dynamic>>()
        .map(TicketSelection.fromJson)
        .toList();

    final rawSettlements =
        (json['selectionSettlements'] as List<dynamic>?) ?? const [];
    final settlements = rawSettlements
        .whereType<Map<String, dynamic>>()
        .map(SelectionSettlement.fromJson)
        .toList();

    final total = _toInt(json['totalMatchCount'], selections.length);
    final settled = _toInt(
      json['settledMatchCount'],
      settlements.where((s) => s.status.isTerminal).length,
    );
    final unfinished = _toInt(
      json['unfinishedMatchCount'],
      (total - settled).clamp(0, 100),
    );
    final actualOdds = _toDouble(json['actualCombinedOdds'], 1.0);
    final rawShareCode = json['shareCode']?.toString().trim();

    return DailyTicket(
      internalTicketId: (json['internalTicketId'] ?? '').toString(),
      bookmakerId: bk,
      bookmakerName: (json['bookmakerName'] ??
              (bk == BookmakerId.betpawaTz
                  ? 'betPawa Tanzania'
                  : 'SportyBet Tanzania'))
          .toString(),
      cycleId: json['cycleId']?.toString(),
      feedSection: FeedSection.fromRaw(json['feedSection']),
      sportId: json['sportId']?.toString(),
      sportName: json['sportName']?.toString(),
      replacedTicketId: json['replacedTicketId']?.toString(),
      signature: (json['signature'] ?? '').toString(),
      sourceType: (json['sourceType'] ?? 'DAILY_FACTORY').toString(),
      categoryId: (json['categoryId'] ?? '').toString(),
      categoryLabel: (json['categoryLabel'] ?? '2.00-3.00').toString(),
      targetOdds: _toDouble(json['targetOdds'], actualOdds),
      actualCombinedOdds: actualOdds,
      selectionCount: _toInt(json['selectionCount'], selections.length),
      selections: selections,
      kickoffStartMs: _toInt(json['kickoffStartMs']),
      kickoffEndMs: _toInt(json['kickoffEndMs']),
      dataSource: (json['dataSource'] ?? '').toString(),
      generatedAt: parseTimestampToIso(json['generatedAt']),
      generatedDateKey: (json['generatedDateKey'] ?? '').toString(),
      status: TicketStatus.fromRaw(json['status']),
      effectiveCombinedOdds:
          _toDouble(json['effectiveCombinedOdds'], actualOdds),
      settledMatchCount: settled,
      totalMatchCount: total > 0 ? total : selections.length,
      unfinishedMatchCount: unfinished,
      selectionSettlements: settlements,
      shareCode: (rawShareCode != null && rawShareCode.isNotEmpty)
          ? rawShareCode
          : null,
      shareUrl: json['shareUrl']?.toString().trim().isNotEmpty == true
          ? json['shareUrl'].toString().trim()
          : null,
      shareCodeVerified: json['shareCodeVerified'] == true,
      bookingCodeStatus: BookingCodeStatus.fromRaw(json['bookingCodeStatus']),
      bookingCodeError:
          json['bookingCodeError']?.toString().trim().isNotEmpty == true
              ? json['bookingCodeError'].toString().trim()
              : null,
      settledAt: json['settledAt']?.toString().trim().isNotEmpty == true
          ? json['settledAt'].toString().trim()
          : null,
      lastCheckedAt: parseTimestampToIso(json['lastCheckedAt']).isNotEmpty
          ? parseTimestampToIso(json['lastCheckedAt'])
          : null,
    );
  }

  factory DailyTicket.fromFirestoreDocs(
    Map<String, dynamic> ticketDoc,
    Map<String, dynamic>? updateDoc,
  ) {
    final ticketId = (ticketDoc['internalTicketId'] ?? '').toString();
    final bk = BookmakerId.fromRaw(ticketDoc['bookmakerId']);
    final rawSelections =
        (ticketDoc['originalSelections'] as List<dynamic>?) ?? const [];
    final selections = rawSelections
        .whereType<Map<String, dynamic>>()
        .map(TicketSelection.fromJson)
        .toList();

    final rawSettlements =
        (updateDoc?['selectionSettlements'] as List<dynamic>?) ?? const [];
    final settlements = rawSettlements
        .whereType<Map<String, dynamic>>()
        .map(SelectionSettlement.fromJson)
        .toList();

    final dateKey = (ticketDoc['generatedDateKey'] ?? '2026-01-01').toString();
    final createdAtIso =
        parseTimestampToIso(ticketDoc['createdAt'], fallback: '${dateKey}T00:00:00.000Z');
    final updatedAtIso =
        parseTimestampToIso(updateDoc?['updatedAt'], fallback: createdAtIso);

    final actualOdds = _toDouble(ticketDoc['actualCombinedOdds'], 1.0);
    final total = _toInt(updateDoc?['totalMatchCount'], selections.length);
    final settled = _toInt(
      updateDoc?['settledMatchCount'],
      settlements.where((s) => s.status.isTerminal).length,
    );
    final unfinished = _toInt(
      updateDoc?['unfinishedMatchCount'],
      (total - settled).clamp(0, 100),
    );
    final rawCode = updateDoc?['shareCode']?.toString().trim();

    return DailyTicket(
      internalTicketId: ticketId,
      bookmakerId: bk,
      bookmakerName: bk == BookmakerId.betpawaTz
          ? 'betPawa Tanzania'
          : 'SportyBet Tanzania',
      cycleId: (ticketDoc['cycleId'] ?? updateDoc?['cycleId'])?.toString(),
      feedSection: FeedSection.fromRaw(ticketDoc['feedSection']),
      sportId: ticketDoc['sportId']?.toString(),
      sportName: ticketDoc['sportName']?.toString(),
      replacedTicketId: ticketDoc['replacedTicketId']?.toString(),
      signature: (ticketDoc['signature'] ?? ticketId).toString(),
      sourceType: (ticketDoc['sourceType'] ?? 'DAILY_FACTORY').toString(),
      categoryId: (ticketDoc['categoryId'] ?? '').toString(),
      categoryLabel: (ticketDoc['categoryLabel'] ?? '2.00-3.00').toString(),
      targetOdds: _toDouble(ticketDoc['targetOdds'], actualOdds),
      actualCombinedOdds: actualOdds,
      selectionCount: _toInt(ticketDoc['selectionCount'], selections.length),
      selections: selections,
      kickoffStartMs: _toInt(ticketDoc['kickoffStartMs']),
      kickoffEndMs: _toInt(ticketDoc['kickoffEndMs']),
      dataSource: (ticketDoc['dataSource'] ??
              (bk == BookmakerId.betpawaTz ? 'betPawa TZ' : 'SportyBet TZ'))
          .toString(),
      generatedAt: createdAtIso,
      generatedDateKey: dateKey,
      status: TicketStatus.fromRaw(updateDoc?['status']),
      effectiveCombinedOdds:
          _toDouble(updateDoc?['effectiveCombinedOdds'], actualOdds),
      settledMatchCount: settled,
      totalMatchCount: total > 0 ? total : selections.length,
      unfinishedMatchCount: unfinished,
      selectionSettlements: settlements,
      shareCode: (rawCode != null && rawCode.isNotEmpty) ? rawCode : null,
      shareUrl: updateDoc?['shareUrl']?.toString().trim().isNotEmpty == true
          ? updateDoc!['shareUrl'].toString().trim()
          : null,
      shareCodeVerified: updateDoc?['shareCodeVerified'] == true,
      bookingCodeStatus:
          BookingCodeStatus.fromRaw(updateDoc?['bookingCodeStatus']),
      bookingCodeError:
          updateDoc?['bookingCodeError']?.toString().trim().isNotEmpty == true
              ? updateDoc!['bookingCodeError'].toString().trim()
              : null,
      settledAt: updateDoc?['settledAt']?.toString().trim().isNotEmpty == true
          ? updateDoc!['settledAt'].toString().trim()
          : null,
      lastCheckedAt: updatedAtIso.isNotEmpty ? updatedAtIso : null,
    );
  }
}

class BookmakerFeedState {
  const BookmakerFeedState({
    required this.bookmakerId,
    required this.bookmakerName,
    this.activeCycleId,
    required this.generationLocked,
    required this.lockReason,
    required this.totalTicketsInCycle,
    required this.settledTicketsInCycle,
    required this.unsettledTicketsCount,
    required this.totalMatchesInCycle,
    required this.finishedMatchesCount,
    required this.unfinishedMatchesCount,
    required this.unverifiedMatchesCount,
    required this.verificationFailuresCount,
    this.lastGenerationAt,
    this.lastResultCheckAt,
    this.lastUnlockedAt,
    required this.updatedAt,
  });

  final BookmakerId bookmakerId;
  final String bookmakerName;
  final String? activeCycleId;
  final bool generationLocked;
  final String lockReason;
  final int totalTicketsInCycle;
  final int settledTicketsInCycle;
  final int unsettledTicketsCount;
  final int totalMatchesInCycle;
  final int finishedMatchesCount;
  final int unfinishedMatchesCount;
  final int unverifiedMatchesCount;
  final int verificationFailuresCount;
  final String? lastGenerationAt;
  final String? lastResultCheckAt;
  final String? lastUnlockedAt;
  final String updatedAt;

  factory BookmakerFeedState.empty(BookmakerId id) {
    return BookmakerFeedState(
      bookmakerId: id,
      bookmakerName:
          id == BookmakerId.betpawaTz ? 'betPawa Tanzania' : 'SportyBet Tanzania',
      generationLocked: false,
      lockReason: '',
      totalTicketsInCycle: 0,
      settledTicketsInCycle: 0,
      unsettledTicketsCount: 0,
      totalMatchesInCycle: 0,
      finishedMatchesCount: 0,
      unfinishedMatchesCount: 0,
      unverifiedMatchesCount: 0,
      verificationFailuresCount: 0,
      updatedAt: DateTime.fromMillisecondsSinceEpoch(0).toUtc().toIso8601String(),
    );
  }

  factory BookmakerFeedState.fromJson(Map<String, dynamic> json) {
    final bk = BookmakerId.fromRaw(json['bookmakerId']);
    return BookmakerFeedState(
      bookmakerId: bk,
      bookmakerName: (json['bookmakerName'] ??
              (bk == BookmakerId.betpawaTz
                  ? 'betPawa Tanzania'
                  : 'SportyBet Tanzania'))
          .toString(),
      activeCycleId: json['activeCycleId']?.toString().isNotEmpty == true
          ? json['activeCycleId'].toString()
          : null,
      generationLocked: json['generationLocked'] == true,
      lockReason: (json['lockReason'] ?? '').toString(),
      totalTicketsInCycle: _toInt(json['totalTicketsInCycle']),
      settledTicketsInCycle: _toInt(json['settledTicketsInCycle']),
      unsettledTicketsCount: _toInt(json['unsettledTicketsCount']),
      totalMatchesInCycle: _toInt(json['totalMatchesInCycle']),
      finishedMatchesCount: _toInt(json['finishedMatchesCount']),
      unfinishedMatchesCount: _toInt(json['unfinishedMatchesCount']),
      unverifiedMatchesCount: _toInt(json['unverifiedMatchesCount']),
      verificationFailuresCount: _toInt(json['verificationFailuresCount']),
      lastGenerationAt: json['lastGenerationAt']?.toString().isNotEmpty == true
          ? json['lastGenerationAt'].toString()
          : null,
      lastResultCheckAt: json['lastResultCheckAt']?.toString().isNotEmpty == true
          ? json['lastResultCheckAt'].toString()
          : null,
      lastUnlockedAt: json['lastUnlockedAt']?.toString().isNotEmpty == true
          ? json['lastUnlockedAt'].toString()
          : null,
      updatedAt: parseTimestampToIso(json['updatedAt'],
          fallback: DateTime.fromMillisecondsSinceEpoch(0).toUtc().toIso8601String()),
    );
  }
}

class GenerationCycle {
  const GenerationCycle({
    required this.cycleId,
    required this.bookmakerId,
    required this.dateKey,
    required this.status,
    required this.generationLocked,
    required this.ticketIds,
    required this.ticketCount,
    required this.totalMatches,
    required this.finishedMatches,
    required this.unfinishedMatches,
    required this.wonTickets,
    required this.lostTickets,
    required this.voidTickets,
    required this.createdAt,
    required this.updatedAt,
    this.settledAt,
  });

  final String cycleId;
  final BookmakerId bookmakerId;
  final String dateKey;
  final String status; // ACTIVE | SETTLED
  final bool generationLocked;
  final List<String> ticketIds;
  final int ticketCount;
  final int totalMatches;
  final int finishedMatches;
  final int unfinishedMatches;
  final int wonTickets;
  final int lostTickets;
  final int voidTickets;
  final String createdAt;
  final String updatedAt;
  final String? settledAt;

  bool get isSettled => status.toUpperCase() == 'SETTLED';

  factory GenerationCycle.fromJson(Map<String, dynamic> json) {
    final ids = ((json['ticketIds'] as List<dynamic>?) ?? const [])
        .map((e) => e.toString())
        .toList();
    return GenerationCycle(
      cycleId: (json['cycleId'] ?? '').toString(),
      bookmakerId: BookmakerId.fromRaw(json['bookmakerId']),
      dateKey: (json['dateKey'] ?? '').toString(),
      status: (json['status'] ?? 'ACTIVE').toString().toUpperCase(),
      generationLocked: json['generationLocked'] == true,
      ticketIds: ids,
      ticketCount: _toInt(json['ticketCount'], ids.length),
      totalMatches: _toInt(json['totalMatches']),
      finishedMatches: _toInt(json['finishedMatches']),
      unfinishedMatches: _toInt(json['unfinishedMatches']),
      wonTickets: _toInt(json['wonTickets']),
      lostTickets: _toInt(json['lostTickets']),
      voidTickets: _toInt(json['voidTickets']),
      createdAt: parseTimestampToIso(json['createdAt']),
      updatedAt: parseTimestampToIso(json['updatedAt']),
      settledAt: json['settledAt']?.toString().isNotEmpty == true
          ? json['settledAt'].toString()
          : null,
    );
  }
}
