import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';
import '../core/constants/odyx_constants.dart';
import '../core/errors/app_exception.dart';
import '../models/analytics.dart';
import '../models/bookmaker.dart';
import '../models/ticket.dart';
import '../models/user_profile.dart';
import '../repositories/odyx_repository.dart';
import '../services/firestore_service.dart';
import '../services/odyx_api_service.dart';

enum FeedCycleScope {
  latestCycle('Current Cycle'),
  allHistory('All History');

  const FeedCycleScope(this.label);
  final String label;
}

enum TicketSortOrder {
  newest('Newest First'),
  highestOdds('Highest Odds'),
  lowestOdds('Lowest Odds');

  const TicketSortOrder(this.label);
  final String label;
}

class FeedProvider extends ChangeNotifier {
  FeedProvider({
    required FirestoreService firestoreService,
    required OdyxApiService apiService,
    required ApiConfig apiConfig,
  })  : _firestoreService = firestoreService,
        _apiService = apiService,
        _apiConfig = apiConfig;

  final FirestoreService _firestoreService;
  final OdyxApiService _apiService;
  final ApiConfig _apiConfig;

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  StreamSubscription<List<Map<String, dynamic>>>? _ticketDocsSub;
  StreamSubscription<List<Map<String, dynamic>>>? _updateDocsSub;
  StreamSubscription<Map<BookmakerId, BookmakerFeedState>>? _feedStateSub;
  StreamSubscription<List<GenerationCycle>>? _cyclesSub;
  Timer? _periodicRefreshTimer;

  List<Map<String, dynamic>> _firestoreTicketDocs = const [];
  List<Map<String, dynamic>> _firestoreUpdateDocs = const [];
  List<DailyTicket> _firestoreMappedTickets = const [];
  final Map<BookmakerId, List<DailyTicket>> _apiTicketsByBookmaker = {
    BookmakerId.sportybetTz: const [],
    BookmakerId.betpawaTz: const [],
  };
  Map<BookmakerId, BookmakerFeedState> _feedStates = {
    BookmakerId.sportybetTz: BookmakerFeedState.empty(BookmakerId.sportybetTz),
    BookmakerId.betpawaTz: BookmakerFeedState.empty(BookmakerId.betpawaTz),
  };
  List<GenerationCycle> _feedCycles = const [];
  final Map<BookmakerId, PerformanceAnalyticsSummary?> _analyticsByBookmaker = {};

  BookmakerId _activeBookmaker = BookmakerId.sportybetTz;
  FeedSection? _selectedSection;
  TicketStatus? _selectedStatus;
  FeedCycleScope _cycleScope = FeedCycleScope.latestCycle;
  TicketSortOrder _sortOrder = TicketSortOrder.newest;
  String _searchQuery = '';

  bool _isOffline = false;
  bool _isInitialLoading = true;
  bool _isRefreshing = false;
  bool? _apiHealthy;
  String? _apiError;
  DateTime? _lastSyncedAt;

  // Tools & matches cache
  List<MatchSummaryItem> _liveMatches = const [];
  List<MatchSummaryItem> _upcomingMatches = const [];
  bool _isLoadingMatches = false;
  String? _matchesError;

  BookmakerId get activeBookmaker => _activeBookmaker;
  BookmakerInfo get activeBookmakerInfo =>
      OdyxConstants.bookmakers[_activeBookmaker] ??
      OdyxConstants.bookmakers[BookmakerId.sportybetTz]!;

  FeedSection? get selectedSection => _selectedSection;
  TicketStatus? get selectedStatus => _selectedStatus;
  FeedCycleScope get cycleScope => _cycleScope;
  TicketSortOrder get sortOrder => _sortOrder;
  String get searchQuery => _searchQuery;

  bool get isOffline => _isOffline;
  bool get isInitialLoading => _isInitialLoading;
  bool get isRefreshing => _isRefreshing;
  bool? get apiHealthy => _apiHealthy;
  String? get apiError => _apiError;
  DateTime? get lastSyncedAt => _lastSyncedAt;

  List<MatchSummaryItem> get liveMatches => _liveMatches;
  List<MatchSummaryItem> get upcomingMatches => _upcomingMatches;
  bool get isLoadingMatches => _isLoadingMatches;
  String? get matchesError => _matchesError;

  List<DailyTicket> get allBookmakerTickets {
    final fbForBookmaker = _firestoreMappedTickets
        .where((t) => t.bookmakerId == _activeBookmaker)
        .toList();
    final apiForBookmaker =
        _apiTicketsByBookmaker[_activeBookmaker] ?? const <DailyTicket>[];
    return OdyxFeedMerger.mergeImmutableFeeds(
      firebaseTickets: fbForBookmaker,
      apiTickets: apiForBookmaker,
    );
  }

  BookmakerFeedState get currentFeedState =>
      _feedStates[_activeBookmaker] ??
      BookmakerFeedState.empty(_activeBookmaker);

  List<GenerationCycle> get currentBookmakerCycles => _feedCycles
      .where((c) => c.bookmakerId == _activeBookmaker)
      .toList();

  GenerationCycle? get latestCycle {
    final activeId = currentFeedState.activeCycleId;
    if (activeId != null && activeId.isNotEmpty) {
      for (final cycle in currentBookmakerCycles) {
        if (cycle.cycleId == activeId) return cycle;
      }
    }
    return currentBookmakerCycles.isNotEmpty
        ? currentBookmakerCycles.first
        : null;
  }

  List<DailyTicket> get currentCycleTickets {
    final all = allBookmakerTickets;
    final activeCycle = currentFeedState.activeCycleId;
    if (activeCycle != null && activeCycle.isNotEmpty) {
      final matching = all.where((t) => t.cycleId == activeCycle).toList();
      if (matching.isNotEmpty) return matching;
    }
    if (all.isEmpty) return const [];
    final latestDateKey = all.first.generatedDateKey;
    return all.where((t) => t.generatedDateKey == latestDateKey).toList();
  }

  List<DailyTicket> get dailyFeedTickets {
    var list = _cycleScope == FeedCycleScope.latestCycle
        ? currentCycleTickets
        : allBookmakerTickets;

    if (_selectedSection != null) {
      list = list.where((t) => t.feedSection == _selectedSection).toList();
    }

    if (_selectedStatus != null) {
      list = list.where((t) {
        if (_selectedStatus == TicketStatus.live) {
          return t.status == TicketStatus.live ||
              t.status == TicketStatus.partiallySettled;
        }
        return t.status == _selectedStatus;
      }).toList();
    }

    final q = _searchQuery.trim().toLowerCase();
    if (q.isNotEmpty) {
      list = list.where((t) {
        if (t.internalTicketId.toLowerCase().contains(q)) return true;
        if (t.categoryLabel.toLowerCase().contains(q)) return true;
        if ((t.shareCode ?? '').toLowerCase().contains(q)) return true;
        return t.selections.any((s) =>
            s.homeTeam.toLowerCase().contains(q) ||
            s.awayTeam.toLowerCase().contains(q) ||
            s.leagueName.toLowerCase().contains(q) ||
            s.marketName.toLowerCase().contains(q) ||
            s.outcomeDesc.toLowerCase().contains(q));
      }).toList();
    }

    final sorted = List<DailyTicket>.from(list);
    switch (_sortOrder) {
      case TicketSortOrder.newest:
        sorted.sort((a, b) => b.generatedAt.compareTo(a.generatedAt));
        break;
      case TicketSortOrder.highestOdds:
        sorted.sort(
            (a, b) => b.effectiveCombinedOdds.compareTo(a.effectiveCombinedOdds));
        break;
      case TicketSortOrder.lowestOdds:
        sorted.sort(
            (a, b) => a.effectiveCombinedOdds.compareTo(b.effectiveCombinedOdds));
        break;
    }
    return sorted;
  }

  Map<String, List<DailyTicket>> get archivedHistoryByDate {
    final grouped = <String, List<DailyTicket>>{};
    for (final ticket in allBookmakerTickets) {
      final key = ticket.generatedDateKey.isNotEmpty
          ? ticket.generatedDateKey
          : 'Recent';
      grouped.putIfAbsent(key, () => <DailyTicket>[]).add(ticket);
    }
    return grouped;
  }

  int get totalTicketsCount => allBookmakerTickets.length;

  int get wonCount =>
      allBookmakerTickets.where((t) => t.status == TicketStatus.won).length;

  int get lostCount =>
      allBookmakerTickets.where((t) => t.status == TicketStatus.lost).length;

  int get activeMatchesCount => allBookmakerTickets
      .where((t) =>
          t.status == TicketStatus.live ||
          t.status == TicketStatus.partiallySettled ||
          t.status == TicketStatus.pending)
      .length;

  double? get winRatePct {
    final summary = _analyticsByBookmaker[_activeBookmaker];
    if (summary?.winRatePct != null) return summary!.winRatePct;
    final decided = wonCount + lostCount;
    if (decided == 0) return null;
    return (wonCount / decided) * 100.0;
  }

  PerformanceAnalyticsSummary? get currentAnalytics =>
      _analyticsByBookmaker[_activeBookmaker];

  String get cycleStatusLabel {
    final state = currentFeedState;
    if (state.unverifiedMatchesCount > 0 ||
        state.verificationFailuresCount > 0) {
      return 'Results being updated';
    }
    if (state.generationLocked || state.unfinishedMatchesCount > 0) {
      return 'Waiting for all matches to finish';
    }
    if (currentCycleTickets.isEmpty) {
      return 'New picks pending';
    }
    return 'All active fixtures settled or live';
  }

  Future<void> initialize() async {
    await _loadSavedBookmaker();
    await _initConnectivity();
    _bindFirestoreStreams();
    await refreshFeed(silent: true);

    _periodicRefreshTimer?.cancel();
    _periodicRefreshTimer = Timer.periodic(
      const Duration(seconds: 60),
      (_) => refreshFeed(silent: true),
    );
  }

  Future<void> _loadSavedBookmaker() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(OdyxConstants.prefPreferredBookmaker);
      if (saved != null && saved.isNotEmpty) {
        _activeBookmaker = BookmakerId.fromRaw(saved);
      }
    } catch (_) {
      // Default to SportyBet Tanzania
    }
  }

  Future<void> _initConnectivity() async {
    try {
      final results = await Connectivity().checkConnectivity();
      _isOffline = results.every((r) => r == ConnectivityResult.none);
    } catch (_) {
      _isOffline = false;
    }

    _connectivitySub?.cancel();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final offline = results.every((r) => r == ConnectivityResult.none);
      if (_isOffline != offline) {
        _isOffline = offline;
        notifyListeners();
        if (!offline) {
          refreshFeed(silent: true);
        }
      }
    });
  }

  void _bindFirestoreStreams() {
    _ticketDocsSub?.cancel();
    _ticketDocsSub = _firestoreService.streamPublicTicketDocs().listen(
      (docs) {
        _firestoreTicketDocs = docs;
        _rebuildFirestoreTickets();
      },
      onError: (_) {
        _isInitialLoading = false;
        notifyListeners();
      },
    );

    _updateDocsSub?.cancel();
    _updateDocsSub = _firestoreService.streamPublicTicketUpdateDocs().listen(
      (docs) {
        _firestoreUpdateDocs = docs;
        _rebuildFirestoreTickets();
      },
      onError: (_) {},
    );

    _feedStateSub?.cancel();
    _feedStateSub = _firestoreService.streamBookmakerFeedStates().listen(
      (states) {
        _feedStates = states;
        notifyListeners();
      },
      onError: (_) {},
    );

    _cyclesSub?.cancel();
    _cyclesSub = _firestoreService.streamFeedCycles().listen(
      (cycles) {
        _feedCycles = cycles;
        notifyListeners();
      },
      onError: (_) {},
    );
  }

  void _rebuildFirestoreTickets() {
    _firestoreMappedTickets = OdyxFeedMerger.mapFirestoreDocs(
      ticketDocs: _firestoreTicketDocs,
      updateDocs: _firestoreUpdateDocs,
    );
    _isInitialLoading = false;
    notifyListeners();
  }

  Future<void> setPreferredBookmaker(
    BookmakerId bookmaker, {
    Future<void> Function(BookmakerId)? onSyncRemote,
  }) async {
    if (_activeBookmaker != bookmaker) {
      _activeBookmaker = bookmaker;
      _selectedSection = null;
      _selectedStatus = null;
      _liveMatches = const [];
      _upcomingMatches = const [];
      notifyListeners();

      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(
          OdyxConstants.prefPreferredBookmaker,
          bookmaker.apiValue,
        );
      } catch (_) {
        // Non-fatal
      }

      if (onSyncRemote != null) {
        await onSyncRemote(bookmaker);
      }

      await refreshFeed(silent: true);
    }
  }

  Future<void> applyRemoteBookmakerPreference(BookmakerId? bookmaker) async {
    if (bookmaker == null || bookmaker == _activeBookmaker) return;
    _activeBookmaker = bookmaker;
    _selectedSection = null;
    _selectedStatus = null;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        OdyxConstants.prefPreferredBookmaker,
        bookmaker.apiValue,
      );
    } catch (_) {
      // Non-fatal
    }
    await refreshFeed(silent: true);
  }

  void setSectionFilter(FeedSection? section) {
    _selectedSection = section;
    notifyListeners();
  }

  void setStatusFilter(TicketStatus? status) {
    _selectedStatus = status;
    notifyListeners();
  }

  void setCycleScope(FeedCycleScope scope) {
    _cycleScope = scope;
    notifyListeners();
  }

  void setSortOrder(TicketSortOrder order) {
    _sortOrder = order;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void clearFilters() {
    _selectedSection = null;
    _selectedStatus = null;
    _cycleScope = FeedCycleScope.latestCycle;
    _sortOrder = TicketSortOrder.newest;
    _searchQuery = '';
    notifyListeners();
  }

  Future<void> refreshFeed({bool silent = false}) async {
    if (!_apiConfig.isConfigured || _isOffline) {
      _isInitialLoading = false;
      notifyListeners();
      return;
    }

    if (!silent) {
      _isRefreshing = true;
      _apiError = null;
      notifyListeners();
    }

    final targetBookmaker = _activeBookmaker;
    try {
      final results = await Future.wait<dynamic>([
        _apiService.listTickets(targetBookmaker),
        _apiService.getSchedulerStatus(targetBookmaker),
        _apiService.getPerformanceAnalytics(targetBookmaker),
      ]);

      final tickets = results[0] as List<DailyTicket>;
      final scheduler = results[1] as SchedulerFeedSnapshot;
      final analytics = results[2] as PerformanceAnalyticsSummary;

      _apiTicketsByBookmaker[targetBookmaker] = tickets;
      if (scheduler.feedStates.isNotEmpty) {
        _feedStates = {
          ..._feedStates,
          ...scheduler.feedStates,
        };
      }
      if (scheduler.feedCycles.isNotEmpty) {
        _feedCycles = scheduler.feedCycles;
      }
      _analyticsByBookmaker[targetBookmaker] = analytics;
      _apiHealthy = true;
      _apiError = null;
      _lastSyncedAt = DateTime.now();
    } on AppException catch (e) {
      _apiError = e.message;
      _apiHealthy = false;
    } catch (e) {
      _apiError = 'Unable to sync with ODYX server: $e';
      _apiHealthy = false;
    } finally {
      _isRefreshing = false;
      _isInitialLoading = false;
      notifyListeners();
    }
  }

  Future<bool> checkApiHealth() async {
    if (!_apiConfig.isConfigured) {
      _apiHealthy = false;
      notifyListeners();
      return false;
    }
    try {
      final ok = await _apiService.checkHealth();
      _apiHealthy = ok;
      if (ok) _apiError = null;
      notifyListeners();
      return ok;
    } catch (e) {
      _apiHealthy = false;
      _apiError = e is AppException ? e.message : e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<DailyTicket?> fetchTicketDetail(String internalTicketId) async {
    for (final existing in allBookmakerTickets) {
      if (existing.internalTicketId == internalTicketId) {
        if (_apiConfig.isConfigured && !_isOffline) {
          try {
            final fresh = await _apiService.getTicketById(internalTicketId);
            final merged = OdyxFeedMerger.mergeImmutableFeeds(
              firebaseTickets: [existing],
              apiTickets: [fresh],
            );
            return merged.isNotEmpty ? merged.first : existing;
          } catch (_) {
            return existing;
          }
        }
        return existing;
      }
    }

    if (_apiConfig.isConfigured && !_isOffline) {
      try {
        return await _apiService.getTicketById(internalTicketId);
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  Future<void> loadMatches() async {
    if (!_apiConfig.isConfigured) {
      _matchesError = 'API_BASE_URL is not configured.';
      notifyListeners();
      return;
    }
    _isLoadingMatches = true;
    _matchesError = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _apiService.getLiveMatches(_activeBookmaker),
        _apiService.getUpcomingMatches(_activeBookmaker),
      ]);
      _liveMatches = results[0];
      _upcomingMatches = results[1];
    } on AppException catch (e) {
      _matchesError = e.message;
    } catch (e) {
      _matchesError = 'Unable to load fixtures: $e';
    } finally {
      _isLoadingMatches = false;
      notifyListeners();
    }
  }

  Future<VerifiedBookingCode> verifyBookingCode(String code) {
    return _apiService.verifyBookingCode(
      code: code,
      bookmaker: _activeBookmaker,
    );
  }

  Future<Map<String, dynamic>> previewTransfer({
    required String direction,
    required String bookingCode,
    String? bearerToken,
  }) {
    return _apiService.previewTransfer(
      direction: direction,
      bookingCode: bookingCode,
      bearerToken: bearerToken,
    );
  }

  Future<Map<String, dynamic>> confirmTransfer({
    required Map<String, dynamic> payload,
    String? bearerToken,
  }) {
    return _apiService.confirmTransfer(
      payload: payload,
      bearerToken: bearerToken,
    );
  }

  // Admin Operations
  Future<Map<String, dynamic>> getAdminFactoryState(String token) {
    return _apiService.getAdminFactoryState(token);
  }

  Future<Map<String, dynamic>> runFactoryNow(String token) async {
    final res = await _apiService.runDailyFactoryNow(
      bookmaker: _activeBookmaker,
      token: token,
    );
    await refreshFeed();
    return res;
  }

  Future<Map<String, dynamic>> trackResultsNow(String token) async {
    final res = await _apiService.trackTicketsResults(
      bookmaker: _activeBookmaker,
      token: token,
    );
    await refreshFeed();
    return res;
  }

  Future<Map<String, dynamic>> retryBookingCodesNow(String token) async {
    final res = await _apiService.retryBookingCodes(token);
    await refreshFeed();
    return res;
  }

  Future<Map<String, dynamic>> toggleAutomation(String mode, String token) {
    return _apiService.toggleFactoryAutomation(mode: mode, token: token);
  }

  Future<Map<String, dynamic>> generateTicketBookingCode({
    required String internalTicketId,
    required String token,
  }) async {
    final res = await _apiService.createTicketBookingCode(
      internalTicketId: internalTicketId,
      token: token,
    );
    await refreshFeed();
    return res;
  }

  Future<void> deleteTicket({
    required String internalTicketId,
    required String token,
  }) async {
    await _apiService.deleteTicket(
      internalTicketId: internalTicketId,
      token: token,
    );
    final current = List<DailyTicket>.from(
      _apiTicketsByBookmaker[_activeBookmaker] ?? const [],
    )..removeWhere((t) => t.internalTicketId == internalTicketId);
    _apiTicketsByBookmaker[_activeBookmaker] = current;
    _firestoreMappedTickets = List<DailyTicket>.from(_firestoreMappedTickets)
      ..removeWhere((t) => t.internalTicketId == internalTicketId);
    notifyListeners();
  }

  @override
  void dispose() {
    _periodicRefreshTimer?.cancel();
    _connectivitySub?.cancel();
    _ticketDocsSub?.cancel();
    _updateDocsSub?.cancel();
    _feedStateSub?.cancel();
    _cyclesSub?.cancel();
    super.dispose();
  }
}
