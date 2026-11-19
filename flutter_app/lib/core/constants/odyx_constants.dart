import '../../models/bookmaker.dart';

class OdyxConstants {
  OdyxConstants._();

  static const String appName = 'ODYX';
  static const String appTagline = 'Smart Betting Intelligence';
  static const String timezoneName = 'Africa/Dar_es_Salaam';

  static const Set<String> bootstrappedAdminEmails = {
    'jkambi00@gmail.com',
    'xbotmanager@gmail.com',
  };

  static const String prefThemeMode = 'odyx_theme_mode';
  static const String prefPreferredBookmaker = 'odyx_preferred_bookmaker';

  static const Map<BookmakerId, BookmakerInfo> bookmakers = {
    BookmakerId.sportybetTz: BookmakerInfo(
      id: BookmakerId.sportybetTz,
      name: 'SportyBet Tanzania',
      shortName: 'SportyBet TZ',
      country: 'Tanzania',
      websiteUrl: 'https://www.sportybet.com/tz/m/',
      tagline: 'Upcoming football, live matches & multi-sport accumulators',
      highlights: ['Official Share Codes', 'Live & Upcoming Football'],
    ),
    BookmakerId.betpawaTz: BookmakerInfo(
      id: BookmakerId.betpawaTz,
      name: 'betPawa Tanzania',
      shortName: 'betPawa TZ',
      country: 'Tanzania',
      websiteUrl: 'https://www.betpawa.co.tz/bets',
      tagline: 'Dedicated betPawa Tanzania fixtures, odds & booking numbers',
      highlights: ['Native Booking Numbers', 'Independent Feed History'],
    ),
  };
}
