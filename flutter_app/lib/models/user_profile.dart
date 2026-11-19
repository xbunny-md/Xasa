import 'bookmaker.dart';

class UserProfile {
  const UserProfile({
    required this.uid,
    required this.displayName,
    required this.email,
    required this.defaultMinOdds,
    required this.defaultMaxOdds,
    required this.defaultStakeTzs,
    required this.autoScanIntervalSec,
    this.themePreference,
    this.preferredBookmaker,
  });

  final String uid;
  final String displayName;
  final String email;
  final double defaultMinOdds;
  final double defaultMaxOdds;
  final double defaultStakeTzs;
  final int autoScanIntervalSec;
  final String? themePreference;
  final BookmakerId? preferredBookmaker;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      uid: (json['uid'] ?? '').toString(),
      displayName: (json['displayName'] ?? 'Analyst').toString(),
      email: (json['email'] ?? '').toString(),
      defaultMinOdds: (json['defaultMinOdds'] as num?)?.toDouble() ?? 1.01,
      defaultMaxOdds: (json['defaultMaxOdds'] as num?)?.toDouble() ?? 1.25,
      defaultStakeTzs: (json['defaultStakeTzs'] as num?)?.toDouble() ?? 10000,
      autoScanIntervalSec:
          (json['autoScanIntervalSec'] as num?)?.toInt() ?? 0,
      themePreference: json['themePreference']?.toString(),
      preferredBookmaker: json['preferredBookmaker'] != null
          ? BookmakerId.fromRaw(json['preferredBookmaker'])
          : null,
    );
  }
}

class AuthSessionInfo {
  const AuthSessionInfo({
    required this.authenticated,
    required this.uid,
    required this.email,
    required this.displayName,
    required this.emailVerified,
    required this.isAdmin,
    required this.role,
    required this.disabled,
  });

  final bool authenticated;
  final String uid;
  final String email;
  final String displayName;
  final bool emailVerified;
  final bool isAdmin;
  final String role;
  final bool disabled;

  factory AuthSessionInfo.fromJson(Map<String, dynamic> json) {
    return AuthSessionInfo(
      authenticated: json['authenticated'] == true,
      uid: (json['uid'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      displayName: (json['displayName'] ?? '').toString(),
      emailVerified: json['emailVerified'] == true,
      isAdmin: json['isAdmin'] == true,
      role: (json['role'] ?? 'USER').toString(),
      disabled: json['disabled'] == true,
    );
  }
}

class MatchSummaryItem {
  const MatchSummaryItem({
    required this.eventId,
    required this.homeTeam,
    required this.awayTeam,
    required this.leagueName,
    required this.country,
    required this.estimateStartTime,
    required this.matchStatus,
    required this.isLive,
    this.score,
    this.playedSeconds,
    required this.bookmakerId,
    this.sportName,
  });

  final String eventId;
  final String homeTeam;
  final String awayTeam;
  final String leagueName;
  final String country;
  final int estimateStartTime;
  final String matchStatus;
  final bool isLive;
  final String? score;
  final String? playedSeconds;
  final BookmakerId bookmakerId;
  final String? sportName;

  factory MatchSummaryItem.fromJson(Map<String, dynamic> json) {
    return MatchSummaryItem(
      eventId: (json['eventId'] ?? '').toString(),
      homeTeam: (json['homeTeam'] ?? '').toString(),
      awayTeam: (json['awayTeam'] ?? '').toString(),
      leagueName: (json['leagueName'] ?? '').toString(),
      country: (json['country'] ?? '').toString(),
      estimateStartTime: (json['estimateStartTime'] as num?)?.toInt() ?? 0,
      matchStatus: (json['matchStatus'] ?? 'Scheduled').toString(),
      isLive: json['isLive'] == true,
      score: json['score']?.toString(),
      playedSeconds: json['playedSeconds']?.toString(),
      bookmakerId: BookmakerId.fromRaw(json['bookmakerId']),
      sportName: json['sportName']?.toString(),
    );
  }
}

class VerifiedBookingCode {
  const VerifiedBookingCode({
    required this.bookmakerId,
    required this.shareCode,
    required this.shareUrl,
    required this.selectionCount,
    required this.combinedOdds,
    required this.verified,
    required this.selections,
  });

  final BookmakerId bookmakerId;
  final String shareCode;
  final String shareUrl;
  final int selectionCount;
  final double combinedOdds;
  final bool verified;
  final List<Map<String, dynamic>> selections;

  factory VerifiedBookingCode.fromJson(Map<String, dynamic> json) {
    final sels = ((json['selections'] as List<dynamic>?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
    return VerifiedBookingCode(
      bookmakerId: BookmakerId.fromRaw(json['bookmakerId']),
      shareCode: (json['shareCode'] ?? '').toString(),
      shareUrl: (json['shareUrl'] ?? '').toString(),
      selectionCount: (json['selectionCount'] as num?)?.toInt() ?? sels.length,
      combinedOdds: (json['combinedOdds'] as num?)?.toDouble() ?? 1.0,
      verified: json['verified'] == true,
      selections: sels,
    );
  }
}
