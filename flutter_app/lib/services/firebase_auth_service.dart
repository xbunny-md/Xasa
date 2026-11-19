import 'package:firebase_auth/firebase_auth.dart';
import '../core/errors/app_exception.dart';

class FirebaseAuthService {
  FirebaseAuthService({FirebaseAuth? auth})
      : _auth = auth ?? FirebaseAuth.instance;

  final FirebaseAuth _auth;

  User? get currentUser => _auth.currentUser;

  Stream<User?> authStateChanges() => _auth.authStateChanges();

  Future<UserCredential> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      throw AppAuthException(mapAuthError(e), code: e.code);
    }
  }

  Future<UserCredential> signUpWithEmail({
    required String email,
    required String password,
    required String displayName,
  }) async {
    try {
      final cred = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      final cleanName = displayName.trim().isNotEmpty
          ? displayName.trim()
          : email.split('@').first;
      await cred.user?.updateDisplayName(cleanName);
      try {
        await cred.user?.sendEmailVerification();
      } catch (_) {
        // Verification email failure does not abort signup
      }
      return cred;
    } on FirebaseAuthException catch (e) {
      throw AppAuthException(mapAuthError(e), code: e.code);
    }
  }

  Future<void> sendPasswordReset(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (e) {
      throw AppAuthException(mapAuthError(e), code: e.code);
    }
  }

  Future<void> resendVerificationEmail() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Sign in first to resend the verification email.');
    }
    try {
      await user.sendEmailVerification();
    } on FirebaseAuthException catch (e) {
      throw AppAuthException(mapAuthError(e), code: e.code);
    }
  }

  Future<bool> reloadAndCheckVerified() async {
    final user = _auth.currentUser;
    if (user == null) return false;
    await user.reload();
    return _auth.currentUser?.emailVerified ?? false;
  }

  Future<void> updateDisplayName(String displayName) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Sign in required.');
    }
    await user.updateDisplayName(displayName.trim());
    await user.reload();
  }

  Future<String?> getIdToken({bool forceRefresh = false}) async {
    final user = _auth.currentUser;
    if (user == null) return null;
    try {
      return await user.getIdToken(forceRefresh);
    } catch (_) {
      return null;
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }

  static String mapAuthError(FirebaseAuthException e) {
    switch (e.code) {
      case 'email-already-in-use':
        return 'An account with this email already exists. Try signing in or resetting your password.';
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'weak-password':
        return 'Password must be at least 6 characters long.';
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
        return 'Invalid email or password. Double-check your credentials or reset your password.';
      case 'too-many-requests':
        return 'Too many attempts. Please wait a few minutes before trying again.';
      case 'user-disabled':
        return 'This account has been disabled.';
      case 'network-request-failed':
        return 'Network error while reaching authentication services. Check your connection.';
      case 'requires-recent-login':
        return 'Please sign in again to complete this security change.';
      default:
        return e.message ?? 'Authentication failed. Please try again.';
    }
  }
}
