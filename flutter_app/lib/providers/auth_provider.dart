import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../config/api_config.dart';
import '../core/constants/odyx_constants.dart';
import '../core/errors/app_exception.dart';
import '../models/bookmaker.dart';
import '../models/ticket.dart';
import '../models/user_profile.dart';
import '../services/firebase_auth_service.dart';
import '../services/firestore_service.dart';
import '../services/odyx_api_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider({
    required FirebaseAuthService authService,
    required FirestoreService firestoreService,
    required OdyxApiService apiService,
    required ApiConfig apiConfig,
  })  : _authService = authService,
        _firestoreService = firestoreService,
        _apiService = apiService,
        _apiConfig = apiConfig;

  final FirebaseAuthService _authService;
  final FirestoreService _firestoreService;
  final OdyxApiService _apiService;
  final ApiConfig _apiConfig;

  StreamSubscription<User?>? _authSub;
  StreamSubscription<bool>? _adminSub;
  StreamSubscription<UserProfile?>? _profileSub;
  StreamSubscription<Set<String>>? _favoritesSub;

  User? _firebaseUser;
  UserProfile? _userProfile;
  AuthSessionInfo? _sessionInfo;
  bool _adminDocExists = false;
  Set<String> _favoriteTicketIds = <String>{};

  bool _isInitializing = true;
  bool _isSubmitting = false;
  String? _errorMessage;
  String? _infoMessage;

  void Function(UserProfile profile)? onProfileSynced;

  User? get firebaseUser => _firebaseUser;
  UserProfile? get userProfile => _userProfile;
  AuthSessionInfo? get sessionInfo => _sessionInfo;
  Set<String> get favoriteTicketIds => _favoriteTicketIds;

  bool get isInitializing => _isInitializing;
  bool get isSubmitting => _isSubmitting;
  String? get errorMessage => _errorMessage;
  String? get infoMessage => _infoMessage;

  bool get isSignedIn => _firebaseUser != null;
  bool get isEmailVerified => _firebaseUser?.emailVerified == true;

  bool get isAdmin {
    if (!isSignedIn || !isEmailVerified) return false;
    final email = (_firebaseUser?.email ?? '').trim().toLowerCase();
    return _sessionInfo?.isAdmin == true ||
        _adminDocExists ||
        OdyxConstants.bootstrappedAdminEmails.contains(email);
  }

  String get displayName {
    final profileName = (_userProfile?.displayName ?? '').trim();
    if (profileName.isNotEmpty) return profileName;
    final authName = (_firebaseUser?.displayName ?? '').trim();
    if (authName.isNotEmpty) return authName;
    final email = _firebaseUser?.email ?? '';
    if (email.contains('@')) return email.split('@').first;
    return 'Guest Analyst';
  }

  void initialize() {
    _authSub?.cancel();
    _authSub = _authService.authStateChanges().listen(_handleAuthStateChange);
  }

  Future<void> _handleAuthStateChange(User? user) async {
    _firebaseUser = user;
    await _cancelUserStreams();

    if (user == null) {
      _userProfile = null;
      _sessionInfo = null;
      _adminDocExists = false;
      _favoriteTicketIds = <String>{};
      _isInitializing = false;
      notifyListeners();
      return;
    }

    _isInitializing = false;
    notifyListeners();

    if (user.emailVerified) {
      await _bindVerifiedUserData(user);
    }
    await refreshBackendSession();
  }

  Future<void> _bindVerifiedUserData(User user) async {
    try {
      await _firestoreService.ensureUserProfile(
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
      );
    } catch (_) {
      // Non-blocking if offline
    }

    _adminSub = _firestoreService.streamAdminDocExists(user.uid).listen(
      (exists) {
        if (_adminDocExists != exists) {
          _adminDocExists = exists;
          notifyListeners();
        }
      },
      onError: (_) {},
    );

    _profileSub = _firestoreService.streamUserProfile(user.uid).listen(
      (profile) {
        _userProfile = profile;
        if (profile != null) {
          onProfileSynced?.call(profile);
        }
        notifyListeners();
      },
      onError: (_) {},
    );

    _favoritesSub = _firestoreService.streamFavoriteTicketIds(user.uid).listen(
      (ids) {
        _favoriteTicketIds = ids;
        notifyListeners();
      },
      onError: (_) {},
    );
  }

  Future<void> refreshBackendSession() async {
    final user = _firebaseUser;
    if (user == null || !_apiConfig.isConfigured) return;
    try {
      final token = await user.getIdToken();
      if (token == null || token.isEmpty) return;
      final session = await _apiService.getAuthSession(token);
      if (session.disabled) {
        _errorMessage =
            'Your account has been disabled by an administrator.';
        await _authService.signOut();
        return;
      }
      _sessionInfo = session;
      notifyListeners();
    } catch (_) {
      // Allow offline / Firebase-only operation without crashing session
    }
  }

  Future<bool> signIn({
    required String email,
    required String password,
  }) async {
    _clearMessages();
    _setSubmitting(true);
    try {
      final cred = await _authService.signInWithEmail(
        email: email,
        password: password,
      );
      if (_apiConfig.isConfigured) {
        final token = await cred.user?.getIdToken();
        unawaited(_apiService.recordAuthAudit(
          event: 'LOGIN',
          bearerToken: token,
          email: cred.user?.email,
          details: 'Android app sign-in',
        ));
      }
      return true;
    } on AppException catch (e) {
      _errorMessage = e.message;
      return false;
    } catch (e) {
      _errorMessage = 'Unable to sign in: $e';
      return false;
    } finally {
      _setSubmitting(false);
    }
  }

  Future<bool> signUp({
    required String email,
    required String password,
    required String displayName,
  }) async {
    _clearMessages();
    _setSubmitting(true);
    try {
      final cred = await _authService.signUpWithEmail(
        email: email,
        password: password,
        displayName: displayName,
      );
      if (_apiConfig.isConfigured) {
        final token = await cred.user?.getIdToken();
        unawaited(_apiService.recordAuthAudit(
          event: 'SIGNUP',
          bearerToken: token,
          email: cred.user?.email,
          details: 'Android app registration',
        ));
      }
      _infoMessage =
          'Account created! Check your inbox to verify your email address.';
      return true;
    } on AppException catch (e) {
      _errorMessage = e.message;
      return false;
    } catch (e) {
      _errorMessage = 'Unable to create account: $e';
      return false;
    } finally {
      _setSubmitting(false);
    }
  }

  Future<bool> sendPasswordReset(String email) async {
    _clearMessages();
    _setSubmitting(true);
    try {
      await _authService.sendPasswordReset(email);
      _infoMessage =
          'Password reset link sent to ${email.trim()}. Check your inbox and spam folder.';
      return true;
    } on AppException catch (e) {
      _errorMessage = e.message;
      return false;
    } catch (e) {
      _errorMessage = 'Unable to send reset email: $e';
      return false;
    } finally {
      _setSubmitting(false);
    }
  }

  Future<void> resendVerificationEmail() async {
    _clearMessages();
    _setSubmitting(true);
    try {
      await _authService.resendVerificationEmail();
      _infoMessage = 'Verification email sent. Check your inbox.';
    } on AppException catch (e) {
      _errorMessage = e.message;
    } finally {
      _setSubmitting(false);
    }
  }

  Future<bool> reloadVerificationStatus() async {
    _clearMessages();
    _setSubmitting(true);
    try {
      final verified = await _authService.reloadAndCheckVerified();
      _firebaseUser = _authService.currentUser;
      if (verified && _firebaseUser != null) {
        await _bindVerifiedUserData(_firebaseUser!);
        await refreshBackendSession();
        _infoMessage = 'Email verified! Your profile is now synced.';
      } else {
        _errorMessage =
            'Email is not verified yet. Open the link in your inbox, then tap refresh.';
      }
      return verified;
    } catch (e) {
      _errorMessage = 'Could not verify status: $e';
      return false;
    } finally {
      _setSubmitting(false);
    }
  }

  Future<void> signOut() async {
    _clearMessages();
    await _authService.signOut();
  }

  Future<String?> getIdToken({bool forceRefresh = false}) {
    return _authService.getIdToken(forceRefresh: forceRefresh);
  }

  Future<void> syncPreferences({
    String? themePreference,
    BookmakerId? preferredBookmaker,
  }) async {
    final user = _firebaseUser;
    if (user == null || !user.emailVerified) return;
    await _firestoreService.updateUserPreferences(
      user.uid,
      themePreference: themePreference,
      preferredBookmaker: preferredBookmaker,
    );
  }

  Future<bool> updateProfileSettings({
    required String displayName,
    required double defaultMinOdds,
    required double defaultMaxOdds,
    required double defaultStakeTzs,
    required int autoScanIntervalSec,
  }) async {
    final user = _firebaseUser;
    if (user == null || !user.emailVerified) {
      _errorMessage = 'Verify your email address to save cloud profile settings.';
      notifyListeners();
      return false;
    }
    _clearMessages();
    _setSubmitting(true);
    try {
      await _authService.updateDisplayName(displayName);
      await _firestoreService.updateUserSettings(
        user.uid,
        displayName: displayName,
        defaultMinOdds: defaultMinOdds,
        defaultMaxOdds: defaultMaxOdds,
        defaultStakeTzs: defaultStakeTzs,
        autoScanIntervalSec: autoScanIntervalSec,
      );
      _infoMessage = 'Profile preferences updated.';
      return true;
    } on AppException catch (e) {
      _errorMessage = e.message;
      return false;
    } catch (e) {
      _errorMessage = 'Failed to update settings: $e';
      return false;
    } finally {
      _setSubmitting(false);
    }
  }

  bool isBookmarked(String internalTicketId) {
    final safeId = internalTicketId.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
    return _favoriteTicketIds.contains(internalTicketId) ||
        _favoriteTicketIds.contains(safeId);
  }

  Future<bool> toggleBookmark(DailyTicket ticket) async {
    final user = _firebaseUser;
    if (user == null || !user.emailVerified) {
      _errorMessage = 'Sign in with a verified account to bookmark tickets.';
      notifyListeners();
      return false;
    }
    try {
      if (isBookmarked(ticket.internalTicketId)) {
        await _firestoreService.deleteFavoriteTicket(
          user.uid,
          ticket.internalTicketId,
        );
      } else {
        await _firestoreService.saveFavoriteTicket(user.uid, ticket);
      }
      return true;
    } on AppException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    }
  }

  void clearMessages() {
    _clearMessages();
    notifyListeners();
  }

  void _clearMessages() {
    _errorMessage = null;
    _infoMessage = null;
  }

  void _setSubmitting(bool value) {
    _isSubmitting = value;
    notifyListeners();
  }

  Future<void> _cancelUserStreams() async {
    await _adminSub?.cancel();
    await _profileSub?.cancel();
    await _favoritesSub?.cancel();
    _adminSub = null;
    _profileSub = null;
    _favoritesSub = null;
  }

  @override
  void dispose() {
    _authSub?.cancel();
    unawaited(_cancelUserStreams());
    super.dispose();
  }
}
