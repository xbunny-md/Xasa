import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/constants/odyx_constants.dart';

class ThemeProvider extends ChangeNotifier {
  ThemeProvider({ThemeMode initialMode = ThemeMode.dark})
      : _themeMode = initialMode;

  ThemeMode _themeMode;

  ThemeMode get themeMode => _themeMode;
  bool get isDark => _themeMode == ThemeMode.dark;
  String get preferenceString => isDark ? 'dark' : 'light';

  Future<void> loadSavedTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(OdyxConstants.prefThemeMode);
      if (saved == 'light') {
        _themeMode = ThemeMode.light;
        notifyListeners();
      } else if (saved == 'dark') {
        _themeMode = ThemeMode.dark;
        notifyListeners();
      }
    } catch (_) {
      // Fallback safely to dark mode
    }
  }

  Future<void> setThemeMode(
    ThemeMode mode, {
    Future<void> Function(String themePreference)? onSyncRemote,
  }) async {
    if (_themeMode == mode) return;
    _themeMode = mode;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        OdyxConstants.prefThemeMode,
        mode == ThemeMode.light ? 'light' : 'dark',
      );
    } catch (_) {
      // Ignore storage failures
    }

    if (onSyncRemote != null) {
      await onSyncRemote(mode == ThemeMode.light ? 'light' : 'dark');
    }
  }

  Future<void> applyRemotePreference(String? remotePreference) async {
    if (remotePreference == null) return;
    if (remotePreference != 'dark' && remotePreference != 'light') return;
    final desired =
        remotePreference == 'light' ? ThemeMode.light : ThemeMode.dark;
    if (_themeMode == desired) return;
    _themeMode = desired;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(OdyxConstants.prefThemeMode, remotePreference);
    } catch (_) {
      // Non-fatal
    }
  }
}
