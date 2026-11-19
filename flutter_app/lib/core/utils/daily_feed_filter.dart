import '../../models/ticket.dart';

class DailyFeedFilter {
  DailyFeedFilter._();

  static const Set<String> disallowedMarketIds = {
    '1', // SportyBet 1X2
    '11', // SportyBet Draw No Bet
    '60', // SportyBet 1st Half 1X2
    '186', // SportyBet Winner
    '202', // SportyBet Set Winner
    '219', // SportyBet Winner incl. OT
    '235', // SportyBet 1st Quarter 1X2
    '302', // SportyBet Quarter DNB
    '3743', // betPawa 1X2
    '4703', // betPawa Draw No Bet
  };

  static final List<RegExp> _disallowedMarketPatterns = [
    RegExp(r'\b1\s*x\s*2\b', caseSensitive: false),
    RegExp(r'\bwinner\b', caseSensitive: false),
    RegExp(r'draw\s*no\s*bet', caseSensitive: false),
    RegExp(r'\b3\s*-?\s*way\b', caseSensitive: false),
    RegExp(r'\bfull\s*time\s*result\b', caseSensitive: false),
  ];

  static const Set<String> _disallowedOutcomeExact = {
    '1',
    'x',
    '2',
    'home',
    'away',
    'draw',
    '12',
    '1/2',
    'home or away',
    'home/away',
    'home team or away team',
  };

  static bool isDisallowedMarket(String? marketId, String? marketName) {
    final cleanId = (marketId ?? '').trim();
    if (cleanId.isNotEmpty && disallowedMarketIds.contains(cleanId)) {
      return true;
    }

    final cleanName = (marketName ?? '').trim();
    if (cleanName.isEmpty) return false;
    return _disallowedMarketPatterns.any((re) => re.hasMatch(cleanName));
  }

  static bool isDisallowedSelection(TicketSelection selection) {
    if (isDisallowedMarket(selection.marketId, selection.marketName)) {
      return true;
    }

    if (selection.marketId.trim() == '10' && selection.outcomeId.trim() == '10') {
      return true;
    }

    final cleanOutcome = selection.outcomeDesc
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'\s+'), ' ');
    if (cleanOutcome.isEmpty) return false;
    if (_disallowedOutcomeExact.contains(cleanOutcome)) return true;
    if (cleanOutcome.contains('home or away') ||
        cleanOutcome.contains('home/away')) {
      return true;
    }
    return false;
  }

  static bool isTicketAllowed(DailyTicket ticket) {
    if (ticket.selections.isEmpty) return false;
    return ticket.selections.every((sel) => !isDisallowedSelection(sel));
  }
}
