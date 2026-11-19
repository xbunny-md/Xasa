import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

import '../config/firebase_options.dart';
import '../core/errors/app_exception.dart';
import '../models/bookmaker.dart';
import '../models/ticket.dart';
import '../models/user_profile.dart';

class FirestoreService {
  FirestoreService({FirebaseFirestore? firestore})
      : _db = firestore ??
            FirebaseFirestore.instanceFor(
              app: Firebase.app(),
              databaseId: OdyxFirebaseOptions.firestoreDatabaseId,
            );

  final FirebaseFirestore _db;

  Future<bool> testConnectivity() async {
    try {
      await _db
          .collection('test')
          .doc('connection')
          .get(const GetOptions(source: Source.server));
      return true;
    } catch (_) {
      return false;
    }
  }

  Stream<List<Map<String, dynamic>>> streamPublicTicketDocs() {
    return _db
        .collection('publicTickets')
        .where('isPublic', isEqualTo: true)
        .limit(400)
        .snapshots()
        .map((snap) => snap.docs.map((d) => {'id': d.id, ...d.data()}).toList());
  }

  Stream<List<Map<String, dynamic>>> streamPublicTicketUpdateDocs() {
    return _db
        .collection('publicTicketUpdates')
        .where('isPublic', isEqualTo: true)
        .limit(400)
        .snapshots()
        .map((snap) => snap.docs.map((d) => {'id': d.id, ...d.data()}).toList());
  }

  Stream<Map<BookmakerId, BookmakerFeedState>> streamBookmakerFeedStates() {
    return _db
        .collection('bookmakerFeedStates')
        .where('isPublic', isEqualTo: true)
        .limit(10)
        .snapshots()
        .map((snap) {
      final result = <BookmakerId, BookmakerFeedState>{
        BookmakerId.sportybetTz: BookmakerFeedState.empty(BookmakerId.sportybetTz),
        BookmakerId.betpawaTz: BookmakerFeedState.empty(BookmakerId.betpawaTz),
      };
      for (final doc in snap.docs) {
        final data = {'id': doc.id, ...doc.data()};
        final parsed = BookmakerFeedState.fromJson(data);
        result[parsed.bookmakerId] = parsed;
      }
      return result;
    });
  }

  Stream<List<GenerationCycle>> streamFeedCycles() {
    return _db
        .collection('feedCycles')
        .where('isPublic', isEqualTo: true)
        .limit(80)
        .snapshots()
        .map((snap) {
      return snap.docs
          .map((d) => GenerationCycle.fromJson({'id': d.id, ...d.data()}))
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    });
  }

  Stream<bool> streamAdminDocExists(String uid) {
    return _db
        .collection('admins')
        .doc(uid)
        .snapshots()
        .map((snap) => snap.exists && snap.data()?['role'] == 'ADMIN');
  }

  Stream<UserProfile?> streamUserProfile(String uid) {
    return _db.collection('users').doc(uid).snapshots().map((snap) {
      if (!snap.exists || snap.data() == null) return null;
      return UserProfile.fromJson(snap.data()!);
    });
  }

  Stream<Set<String>> streamFavoriteTicketIds(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .collection('favoriteTickets')
        .where('userId', isEqualTo: uid)
        .limit(120)
        .snapshots()
        .map((snap) {
      return snap.docs
          .map((d) => (d.data()['internalTicketId'] ?? d.id).toString())
          .toSet();
    });
  }

  Future<void> ensureUserProfile({
    required String uid,
    required String? displayName,
    required String? email,
  }) async {
    try {
      final ref = _db.collection('users').doc(uid);
      final snap = await ref.get();
      if (!snap.exists) {
        final cleanName =
            (displayName ?? '').trim().isNotEmpty ? displayName!.trim() : 'Analyst';
        final cleanEmail =
            (email ?? '').trim().isNotEmpty ? email!.trim() : 'user@example.com';
        await ref.set({
          'uid': uid,
          'displayName': cleanName.substring(0, cleanName.length.clamp(1, 120)),
          'email': cleanEmail.substring(0, cleanEmail.length.clamp(3, 254)),
          'defaultMinOdds': 1.01,
          'defaultMaxOdds': 1.25,
          'defaultStakeTzs': 10000,
          'autoScanIntervalSec': 0,
          'themePreference': 'dark',
          'preferredBookmaker': 'SPORTYBET_TZ',
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      throw FirestoreDataException('Unable to initialize user profile: $e');
    }
  }

  Future<void> updateUserPreferences(
    String uid, {
    String? themePreference,
    BookmakerId? preferredBookmaker,
  }) async {
    final payload = <String, dynamic>{
      'updatedAt': FieldValue.serverTimestamp(),
    };
    if (themePreference == 'dark' || themePreference == 'light') {
      payload['themePreference'] = themePreference;
    }
    if (preferredBookmaker != null) {
      payload['preferredBookmaker'] = preferredBookmaker.apiValue;
    }
    try {
      await _db.collection('users').doc(uid).update(payload);
    } catch (_) {
      // Non-blocking if user doc not yet created or offline
    }
  }

  Future<void> updateUserSettings(
    String uid, {
    required String displayName,
    required double defaultMinOdds,
    required double defaultMaxOdds,
    required double defaultStakeTzs,
    required int autoScanIntervalSec,
  }) async {
    final minOdds = defaultMinOdds.clamp(1.01, 100.0);
    final maxOdds = defaultMaxOdds.clamp(minOdds, 1000.0);
    final stake = defaultStakeTzs.clamp(0.0, 100000000.0);
    final interval = autoScanIntervalSec.clamp(0, 3600);

    try {
      await _db.collection('users').doc(uid).update({
        'displayName': displayName.trim().isEmpty ? 'Analyst' : displayName.trim(),
        'defaultMinOdds': minOdds,
        'defaultMaxOdds': maxOdds,
        'defaultStakeTzs': stake,
        'autoScanIntervalSec': interval,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      throw FirestoreDataException('Unable to save profile settings: $e');
    }
  }

  Future<void> saveFavoriteTicket(String uid, DailyTicket ticket) async {
    final safeId =
        ticket.internalTicketId.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
    try {
      await _db
          .collection('users')
          .doc(uid)
          .collection('favoriteTickets')
          .doc(safeId)
          .set({
        'userId': uid,
        'internalTicketId': safeId,
        'categoryLabel': ticket.categoryLabel.isNotEmpty
            ? ticket.categoryLabel
            : 'Daily Pick',
        'combinedOdds': ticket.actualCombinedOdds.clamp(1.0, 1000000.0),
        'selectionCount': ticket.selectionCount.clamp(1, 30),
        'generatedDateKey': ticket.generatedDateKey.isNotEmpty
            ? ticket.generatedDateKey
            : '2026-01-01',
        'createdAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      throw FirestoreDataException('Unable to bookmark ticket: $e');
    }
  }

  Future<void> deleteFavoriteTicket(String uid, String internalTicketId) async {
    final safeId =
        internalTicketId.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
    try {
      await _db
          .collection('users')
          .doc(uid)
          .collection('favoriteTickets')
          .doc(safeId)
          .delete();
    } catch (e) {
      throw FirestoreDataException('Unable to remove bookmark: $e');
    }
  }
}
