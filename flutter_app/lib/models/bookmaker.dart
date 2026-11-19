enum BookmakerId {
  sportybetTz('SPORTYBET_TZ'),
  betpawaTz('BETPAWA_TZ');

  const BookmakerId(this.apiValue);
  final String apiValue;

  static BookmakerId fromRaw(dynamic raw) {
    final clean = (raw ?? '').toString().trim().toUpperCase();
    if (clean == 'BETPAWA_TZ' || clean == 'BETPAWA') {
      return BookmakerId.betpawaTz;
    }
    return BookmakerId.sportybetTz;
  }
}

class BookmakerInfo {
  const BookmakerInfo({
    required this.id,
    required this.name,
    required this.shortName,
    required this.country,
    required this.websiteUrl,
    required this.tagline,
    required this.highlights,
  });

  final BookmakerId id;
  final String name;
  final String shortName;
  final String country;
  final String websiteUrl;
  final String tagline;
  final List<String> highlights;
}
