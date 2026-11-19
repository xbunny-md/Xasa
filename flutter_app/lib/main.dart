import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app.dart';
import 'config/api_config.dart';
import 'config/firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: OdyxFirebaseOptions.currentPlatform,
  );

  final apiConfig = ApiConfig();
  runApp(OdyxApp(apiConfig: apiConfig));
}
