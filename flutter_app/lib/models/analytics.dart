class PerformanceBreakdownRow {
  const PerformanceBreakdownRow({
    required this.label,
    required this.total,
    required this.won,
    required this.lost,
    required this.voided,
    required this.pending,
    this.winRatePct,
  });

  final String label;
  final int total;
  final int won;
  final int lost;
  final int voided;
  final int pending;
  final double? winRatePct;

  factory PerformanceBreakdownRow.fromJson(Map<String, dynamic> json) {
    return PerformanceBreakdownRow(
      label: (json['label'] ?? '').toString(),
      total: (json['total'] as num?)?.toInt() ?? 0,
      won: (json['won'] as num?)?.toInt() ?? 0,
      lost: (json['lost'] as num?)?.toInt() ?? 0,
      voided: (json['voided'] as num?)?.toInt() ?? 0,
      pending: (json['pending'] as num?)?.toInt() ?? 0,
      winRatePct: (json['winRatePct'] as num?)?.toDouble(),
    );
  }
}

class PerformanceAnalyticsSummary {
  const PerformanceAnalyticsSummary({
    required this.totalGenerated,
    required this.generatedToday,
    required this.dailyTarget,
    required this.totalSettled,
    required this.wonCount,
    required this.lostCount,
    required this.voidCount,
    required this.pendingOrLiveCount,
    required this.validSharingCodes,
    this.winRatePct,
    this.lastScanningAt,
    this.lastSettlementAt,
    required this.byCategory,
  });

  final int totalGenerated;
  final int generatedToday;
  final int dailyTarget;
  final int totalSettled;
  final int wonCount;
  final int lostCount;
  final int voidCount;
  final int pendingOrLiveCount;
  final int validSharingCodes;
  final double? winRatePct;
  final String? lastScanningAt;
  final String? lastSettlementAt;
  final List<PerformanceBreakdownRow> byCategory;

  factory PerformanceAnalyticsSummary.fromJson(Map<String, dynamic> json) {
    final categories = ((json['byCategory'] as List<dynamic>?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(PerformanceBreakdownRow.fromJson)
        .toList();

    return PerformanceAnalyticsSummary(
      totalGenerated: (json['totalGenerated'] as num?)?.toInt() ?? 0,
      generatedToday: (json['generatedToday'] as num?)?.toInt() ?? 0,
      dailyTarget: (json['dailyTarget'] as num?)?.toInt() ?? 55,
      totalSettled: (json['totalSettled'] as num?)?.toInt() ?? 0,
      wonCount: (json['wonCount'] as num?)?.toInt() ?? 0,
      lostCount: (json['lostCount'] as num?)?.toInt() ?? 0,
      voidCount: (json['voidCount'] as num?)?.toInt() ?? 0,
      pendingOrLiveCount: (json['pendingOrLiveCount'] as num?)?.toInt() ?? 0,
      validSharingCodes: (json['validSharingCodes'] as num?)?.toInt() ?? 0,
      winRatePct: (json['winRatePct'] as num?)?.toDouble(),
      lastScanningAt: json['lastScanningAt']?.toString(),
      lastSettlementAt: json['lastSettlementAt']?.toString(),
      byCategory: categories,
    );
  }
}
