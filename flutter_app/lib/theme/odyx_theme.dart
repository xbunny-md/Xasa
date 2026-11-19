import 'package:flutter/material.dart';
import 'odyx_colors.dart';

class OdyxTheme {
  OdyxTheme._();

  static ThemeData dark() {
    const colorScheme = ColorScheme.dark(
      primary: OdyxColors.accentBlue,
      secondary: OdyxColors.accentCyan,
      surface: OdyxColors.darkSurface,
      error: OdyxColors.lostRose,
      onPrimary: Colors.white,
      onSurface: OdyxColors.darkTextPrimary,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: OdyxColors.darkCanvas,
      cardColor: OdyxColors.darkSurface,
      dividerColor: OdyxColors.darkBorder,
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xE6060B16),
        foregroundColor: OdyxColors.darkTextPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      textTheme: _textTheme(
        primary: OdyxColors.darkTextPrimary,
        secondary: OdyxColors.darkTextSecondary,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF090F1D),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: OdyxColors.darkBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: OdyxColors.darkBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: OdyxColors.accentBlue, width: 1.4),
        ),
        hintStyle: const TextStyle(
          color: Color(0xFF64748B),
          fontSize: 13,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xEB0A101E),
        indicatorColor: OdyxColors.accentBlue.withValues(alpha: 0.18),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected
                ? OdyxColors.darkTextPrimary
                : OdyxColors.darkTextSecondary,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 22,
            color: selected
                ? OdyxColors.accentBlue
                : OdyxColors.darkTextSecondary,
          );
        }),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: OdyxColors.darkSurfaceElevated,
        contentTextStyle: const TextStyle(color: OdyxColors.darkTextPrimary),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  static ThemeData light() {
    const colorScheme = ColorScheme.light(
      primary: OdyxColors.accentBlue,
      secondary: OdyxColors.accentCyan,
      surface: OdyxColors.lightSurface,
      error: OdyxColors.lostRose,
      onPrimary: Colors.white,
      onSurface: OdyxColors.lightTextPrimary,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: OdyxColors.lightCanvas,
      cardColor: OdyxColors.lightSurface,
      dividerColor: OdyxColors.lightBorder,
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xF2FFFFFF),
        foregroundColor: OdyxColors.lightTextPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      textTheme: _textTheme(
        primary: OdyxColors.lightTextPrimary,
        secondary: OdyxColors.lightTextSecondary,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: OdyxColors.lightSurfaceSubtle,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: OdyxColors.lightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: OdyxColors.lightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: OdyxColors.accentBlue, width: 1.4),
        ),
        hintStyle: const TextStyle(
          color: Color(0xFF94A3B8),
          fontSize: 13,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: OdyxColors.accentBlue.withValues(alpha: 0.12),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected
                ? OdyxColors.lightTextPrimary
                : OdyxColors.lightTextSecondary,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 22,
            color: selected
                ? OdyxColors.accentBlue
                : OdyxColors.lightTextSecondary,
          );
        }),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: OdyxColors.lightTextPrimary,
        contentTextStyle: const TextStyle(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  static TextTheme _textTheme({
    required Color primary,
    required Color secondary,
  }) {
    return TextTheme(
      headlineMedium: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
        color: primary,
      ),
      titleLarge: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
        color: primary,
      ),
      titleMedium: TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: primary,
      ),
      bodyMedium: TextStyle(
        fontSize: 13.5,
        height: 1.45,
        color: primary,
      ),
      bodySmall: TextStyle(
        fontSize: 12,
        height: 1.4,
        color: secondary,
      ),
      labelSmall: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: secondary,
      ),
    );
  }
}
