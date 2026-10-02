import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

/// Tema Fabrikası (Açık ve Karanlık Mod)
ThemeData _buildTheme({required bool isDark}) {
  final colorScheme = ColorScheme(
    brightness: isDark ? Brightness.dark : Brightness.light,
    primary: isDark ? const Color(0xFFFFB693) : const Color(0xFFFF6B00),
    onPrimary: isDark ? const Color(0xFF561F00) : Colors.white,
    primaryContainer: const Color(0xFFFF6B00),
    onPrimaryContainer: Colors.white,
    secondary: isDark ? const Color(0xFF4EDEA3) : const Color(0xFF059669),
    onSecondary: Colors.white,
    secondaryContainer: isDark ? const Color(0xFF00A572) : const Color(0xFF10B981),
    onSecondaryContainer: Colors.white,
    tertiary: isDark ? const Color(0xFF7BD0FF) : const Color(0xFF0284C7),
    onTertiary: Colors.white,
    tertiaryContainer: isDark ? const Color(0xFF00A4DD) : const Color(0xFF0EA5E9),
    onTertiaryContainer: Colors.white,
    error: isDark ? const Color(0xFFFFB4AB) : const Color(0xFFDC2626),
    onError: Colors.white,
    errorContainer: isDark ? const Color(0xFF93000A) : const Color(0xFFFEE2E2),
    onErrorContainer: isDark ? const Color(0xFFFFDAD6) : const Color(0xFF991B1B),
    surface: isDark ? const Color(0xFF0B1326) : Colors.white,
    onSurface: isDark ? const Color(0xFFDAE2FD) : const Color(0xFF0F172A),
    onSurfaceVariant: isDark ? const Color(0xFFE2BFB0) : const Color(0xFF64748B),
    outline: isDark ? const Color(0xFFA98A7D) : const Color(0xFFE2E8F0),
    outlineVariant: isDark ? const Color(0xFF5A4136) : const Color(0xFFCBD5E1),
    inverseSurface: isDark ? const Color(0xFFDAE2FD) : const Color(0xFF0F172A),
    onInverseSurface: isDark ? const Color(0xFF283044) : const Color(0xFFF8FAFC),
    inversePrimary: isDark ? const Color(0xFFA04100) : const Color(0xFFFFB693),
    surfaceTint: const Color(0xFFFF6B00),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: isDark ? Brightness.dark : Brightness.light,
    scaffoldBackgroundColor:
        isDark ? const Color(0xFF0B1326) : const Color(0xFFF8FAFC),
    colorScheme: colorScheme,
    textTheme: GoogleFonts.interTextTheme(
      TextTheme(
        bodyMedium: TextStyle(color: colorScheme.onSurface),
      ),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: isDark ? const Color(0xFF0B1326) : Colors.white,
      foregroundColor: isDark ? const Color(0xFFDAE2FD) : const Color(0xFF0F172A),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      systemOverlayStyle: SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness:
            isDark ? Brightness.light : Brightness.dark,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark ? const Color(0xFF171F33) : const Color(0xFFF1F5F9),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: isDark ? Colors.transparent : const Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: isDark ? Colors.transparent : const Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFFF6B00), width: 2),
      ),
      hintStyle: GoogleFonts.inter(
        color: isDark
            ? const Color(0xFFE2BFB0).withValues(alpha: 0.4)
            : const Color(0xFF94A3B8),
        fontSize: 16,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
    ),
    cardColor: isDark ? const Color(0xFF131B2E) : Colors.white,
    dividerColor: isDark ? const Color(0xFF222A3D) : const Color(0xFFE2E8F0),
  );
}

/// Göz yormayan modern beyaz açık tema (Varsayılan)
final ThemeData lightAppTheme = _buildTheme(isDark: false);

/// Gece sürüşü için karanlık tema
final ThemeData darkAppTheme = _buildTheme(isDark: true);

/// Standart varsayılan tema (Açık Beyaz)
final ThemeData appTheme = lightAppTheme;
