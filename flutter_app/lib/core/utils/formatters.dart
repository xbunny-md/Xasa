import 'package:intl/intl.dart';

class OdyxFormatters {
  OdyxFormatters._();

  static final DateFormat _compactDateTime = DateFormat('dd MMM, HH:mm');
  static final DateFormat _timeOnly = DateFormat('HH:mm');
  static final DateFormat _dateKeyFormat = DateFormat('yyyy-MM-dd');
  static final NumberFormat _tzsFormat = NumberFormat('#,##0', 'en_US');

  /// East Africa Time (Africa/Dar_es_Salaam, UTC+3)
  static String todayDateKeyEAT() {
    final utcNow = DateTime.now().toUtc();
    final eat = utcNow.add(const Duration(hours: 3));
    return _dateKeyFormat.format(eat);
  }

  static String formatOdds(double odds) => odds.toStringAsFixed(2);

  static String formatTzs(num amount) => 'TZS ${_tzsFormat.format(amount)}';

  static String formatIsoCompact(String? iso) {
    if (iso == null || iso.trim().isEmpty) return '—';
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return iso;
    return _compactDateTime.format(parsed.toLocal());
  }

  static String formatEpochMsCompact(int epochMs) {
    if (epochMs <= 0) return '—';
    final dt = DateTime.fromMillisecondsSinceEpoch(epochMs).toLocal();
    return _compactDateTime.format(dt);
  }

  static String formatKickoffSpan(int startMs, int endMs) {
    if (startMs <= 0) return '—';
    final start = DateTime.fromMillisecondsSinceEpoch(startMs).toLocal();
    if (endMs <= 0 || startMs == endMs) {
      return _compactDateTime.format(start);
    }
    final end = DateTime.fromMillisecondsSinceEpoch(endMs).toLocal();
    final sameDay = start.year == end.year &&
        start.month == end.month &&
        start.day == end.day;
    if (sameDay) {
      return '${_compactDateTime.format(start)}–${_timeOnly.format(end)}';
    }
    return '${_compactDateTime.format(start)} – ${_compactDateTime.format(end)}';
  }
}
