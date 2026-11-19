import '../models/analytics.dart';
import '../models/bookmaker.dart';
import '../models/ticket.dart';
import '../models/user_profile.dart';
import 'api_client.dart';

class SchedulerFeedSnapshot {
  const SchedulerFeedSnapshot({
    required this.feedStates,
    required this.feedCycles,
  });

  final Map<BookmakerId, BookmakerFeedState> feedStates;
  final List<GenerationCycle> feedCycles;
}

class OdyxApiService {
  OdyxApiService(this._client);

  final OdyxHttpClient _client;

  Future<bool> checkHealth() async {
    final json = await _client.getJson('/api/health');
    return json['ok'] == true;
  }

  Future<AuthSessionInfo> getAuthSession(String bearerToken) async {
    final json = await _client.getJson(
      '/api/auth/session',
      bearerToken: bearerToken,
    );
    return AuthSessionInfo.fromJson(json);
  }

  Future<void> recordAuthAudit({
    required String event,
    String? bearerToken,
    String? email,
    String? details,
  }) async {
    try {
      await _client.postJson(
        '/api/auth/audit',
        bearerToken: bearerToken,
        body: {
          'event': event,
          if (email != null && email.isNotEmpty) 'email': email,
          if (details != null && details.isNotEmpty) 'details': details,
        },
      );
    } catch (_) {
      // Non-blocking audit log
    }
  }

  Future<List<DailyTicket>> listTickets(BookmakerId bookmaker) async {
    final json = await _client.getJson(
      '/api/tickets',
      queryParameters: {'bookmaker': bookmaker.apiValue},
    );
    final rawList = (json['tickets'] as List<dynamic>?) ?? const [];
    return rawList
        .whereType<Map<String, dynamic>>()
        .map(DailyTicket.fromApiJson)
        .toList();
  }

  Future<DailyTicket> getTicketById(String internalTicketId) async {
    final json = await _client.getJson(
      '/api/tickets/${Uri.encodeComponent(internalTicketId)}',
    );
    final raw = json['ticket'];
    if (raw is! Map<String, dynamic>) {
      throw const FormatException('Ticket payload missing.');
    }
    return DailyTicket.fromApiJson(raw);
  }

  Future<PerformanceAnalyticsSummary> getPerformanceAnalytics(
    BookmakerId bookmaker,
  ) async {
    final json = await _client.getJson(
      '/api/analytics/performance',
      queryParameters: {'bookmaker': bookmaker.apiValue},
    );
    return PerformanceAnalyticsSummary.fromJson(json);
  }

  Future<SchedulerFeedSnapshot> getSchedulerStatus(BookmakerId bookmaker) async {
    final json = await _client.getJson(
      '/api/scheduler/status',
      queryParameters: {'bookmaker': bookmaker.apiValue},
    );

    final states = <BookmakerId, BookmakerFeedState>{
      BookmakerId.sportybetTz: BookmakerFeedState.empty(BookmakerId.sportybetTz),
      BookmakerId.betpawaTz: BookmakerFeedState.empty(BookmakerId.betpawaTz),
    };

    final rawStates = json['feedStates'];
    if (rawStates is Map<String, dynamic>) {
      for (final entry in rawStates.entries) {
        if (entry.value is Map<String, dynamic>) {
          final parsed = BookmakerFeedState.fromJson(
            entry.value as Map<String, dynamic>,
          );
          states[parsed.bookmakerId] = parsed;
        }
      }
    }

    final rawCycles = (json['feedCycles'] as List<dynamic>?) ?? const [];
    final cycles = rawCycles
        .whereType<Map<String, dynamic>>()
        .map(GenerationCycle.fromJson)
        .toList();

    return SchedulerFeedSnapshot(feedStates: states, feedCycles: cycles);
  }

  Future<List<MatchSummaryItem>> getLiveMatches(BookmakerId bookmaker) async {
    final json = await _client.getJson(
      '/api/matches/live',
      queryParameters: {'bookmaker': bookmaker.apiValue},
    );
    final raw = (json['matches'] as List<dynamic>?) ?? const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(MatchSummaryItem.fromJson)
        .toList();
  }

  Future<List<MatchSummaryItem>> getUpcomingMatches(
    BookmakerId bookmaker, {
    int pageNum = 1,
    int pageSize = 40,
  }) async {
    final json = await _client.getJson(
      '/api/matches/upcoming',
      queryParameters: {
        'bookmaker': bookmaker.apiValue,
        'pageNum': '$pageNum',
        'pageSize': '$pageSize',
      },
    );
    final raw = (json['matches'] as List<dynamic>?) ?? const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(MatchSummaryItem.fromJson)
        .toList();
  }

  Future<VerifiedBookingCode> verifyBookingCode({
    required String code,
    required BookmakerId bookmaker,
  }) async {
    final json = await _client.getJson(
      '/api/booking-codes/verify/${Uri.encodeComponent(code.trim())}',
      queryParameters: {'bookmaker': bookmaker.apiValue},
    );
    return VerifiedBookingCode.fromJson(json);
  }

  // Admin endpoints (strictly protected on backend via Firebase ID Token)
  Future<Map<String, dynamic>> getAdminFactoryState(String token) {
    return _client.getJson('/api/factory/config', bearerToken: token);
  }

  Future<Map<String, dynamic>> toggleFactoryAutomation({
    required String mode,
    required String token,
  }) {
    return _client.postJson(
      '/api/factory/toggle',
      body: {'mode': mode},
      bearerToken: token,
    );
  }

  Future<Map<String, dynamic>> runDailyFactoryNow({
    required BookmakerId bookmaker,
    required String token,
  }) {
    return _client.postJson(
      '/api/factory/run',
      body: {'bookmaker': bookmaker.apiValue},
      bearerToken: token,
    );
  }

  Future<Map<String, dynamic>> trackTicketsResults({
    required BookmakerId bookmaker,
    required String token,
    List<String>? ticketIds,
  }) {
    return _client.postJson(
      '/api/tickets/track-results',
      body: {
        'bookmaker': bookmaker.apiValue,
        if (ticketIds != null && ticketIds.isNotEmpty) 'ticketIds': ticketIds,
      },
      bearerToken: token,
    );
  }

  Future<Map<String, dynamic>> retryBookingCodes(String token) {
    return _client.postJson(
      '/api/tickets/retry-booking-codes',
      body: <String, dynamic>{},
      bearerToken: token,
    );
  }

  Future<void> deleteTicket({
    required String internalTicketId,
    required String token,
  }) async {
    await _client.deleteJson(
      '/api/tickets/${Uri.encodeComponent(internalTicketId)}',
      bearerToken: token,
    );
  }

  Future<Map<String, dynamic>> createTicketBookingCode({
    required String internalTicketId,
    required String token,
  }) {
    return _client.postJson(
      '/api/tickets/${Uri.encodeComponent(internalTicketId)}/booking-code',
      body: <String, dynamic>{},
      bearerToken: token,
    );
  }

  Future<Map<String, dynamic>> previewTransfer({
    required String direction,
    required String bookingCode,
    String? bearerToken,
  }) {
    return _client.postJson(
      '/api/transfer/preview',
      bearerToken: bearerToken,
      body: {
        'direction': direction,
        'bookingCode': bookingCode.trim(),
      },
    );
  }

  Future<Map<String, dynamic>> confirmTransfer({
    required Map<String, dynamic> payload,
    String? bearerToken,
  }) {
    return _client.postJson(
      '/api/transfer/confirm',
      bearerToken: bearerToken,
      body: payload,
    );
  }
}
