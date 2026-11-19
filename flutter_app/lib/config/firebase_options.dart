import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class OdyxFirebaseOptions {
  OdyxFirebaseOptions._();

  static const String projectId = String.fromEnvironment(
    'FIREBASE_PROJECT_ID',
    defaultValue: 'gen-lang-client-0092843012',
  );

  static const String apiKey = String.fromEnvironment(
    'FIREBASE_API_KEY',
    defaultValue: 'AIzaSyAIWdgp07l0GMRb1wKkKeN9uN27EhzRfkg',
  );

  static const String messagingSenderId = String.fromEnvironment(
    'FIREBASE_MESSAGING_SENDER_ID',
    defaultValue: '950121605631',
  );

  static const String storageBucket = String.fromEnvironment(
    'FIREBASE_STORAGE_BUCKET',
    defaultValue: 'gen-lang-client-0092843012.firebasestorage.app',
  );

  static const String authDomain = String.fromEnvironment(
    'FIREBASE_AUTH_DOMAIN',
    defaultValue: 'gen-lang-client-0092843012.firebaseapp.com',
  );

  static const String androidAppId = String.fromEnvironment(
    'FIREBASE_ANDROID_APP_ID',
    defaultValue: '1:950121605631:android:79a5e741ef28611f041fca',
  );

  static const String webAppId = String.fromEnvironment(
    'FIREBASE_WEB_APP_ID',
    defaultValue: '1:950121605631:web:79a5e741ef28611f041fca',
  );

  static const String firestoreDatabaseId = String.fromEnvironment(
    'FIREBASE_DATABASE_ID',
    defaultValue: 'ai-studio-remixsportybetod-c683f60e-2134-4acf-acfa-6e6e253f4657',
  );

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      default:
        return android;
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: apiKey,
    appId: androidAppId,
    messagingSenderId: messagingSenderId,
    projectId: projectId,
    storageBucket: storageBucket,
  );

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: apiKey,
    appId: webAppId,
    messagingSenderId: messagingSenderId,
    projectId: projectId,
    authDomain: authDomain,
    storageBucket: storageBucket,
  );
}
