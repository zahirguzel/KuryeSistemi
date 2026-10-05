import 'package:flutter/material.dart';

/// KuryeSistemi Açık (Beyaz - Göz Yormayan) Renk Paleti (Varsayılan)
/// Tüm widget'lar const olarak bu sınıftan faydalanır.
abstract final class AppLightColors {
  // ─── Background / Surface (Açık Beyaz Tema) ───────────────────────────────
  static const Color background           = Color(0xFFF8FAFC); // Slate 50 (Ferah Arka Plan)
  static const Color surface              = Colors.white;
  static const Color surfaceDim           = Color(0xFFF1F5F9); // Slate 100
  static const Color surfaceBright        = Colors.white;
  static const Color surfaceContainerLowest = Colors.white;
  static const Color surfaceContainerLow  = Colors.white;
  static const Color surfaceContainer     = Color(0xFFF1F5F9); // Slate 100
  static const Color surfaceContainerHigh = Color(0xFFE2E8F0); // Slate 200
  static const Color surfaceContainerHighest = Color(0xFFCBD5E1); // Slate 300
  static const Color surfaceVariant       = Color(0xFFE2E8F0);
  static const Color inverseSurface       = Color(0xFF0F172A);
  static const Color inverseOnSurface     = Color(0xFFF8FAFC);
  static const Color surfaceTint          = Color(0xFFFF6B00);

  // ─── On-Surface (Koyu Slate Metinler) ─────────────────────────────────────
  static const Color onSurface            = Color(0xFF0F172A); // Slate 900 (Keskin, Okunaklı)
  static const Color onSurfaceVariant     = Color(0xFF64748B); // Slate 500
  static const Color onBackground         = Color(0xFF0F172A);

  // ─── Primary (Kurye Turuncu / Marka Rengi) ──────────────────────────────
  static const Color primary              = Color(0xFFFF6B00);
  static const Color primaryFixed         = Color(0xFFFFDBCC);
  static const Color primaryFixedDim      = Color(0xFFFFB693);
  static const Color primaryContainer     = Color(0xFFFF6B00);
  static const Color onPrimary            = Colors.white;
  static const Color onPrimaryFixed       = Color(0xFF351000);
  static const Color onPrimaryFixedVariant = Color(0xFF7A3000);
  static const Color onPrimaryContainer   = Colors.white;
  static const Color inversePrimary       = Color(0xFFFFB693);

  // ─── Secondary (Canlı Zümrüt Yeşili) ─────────────────────────────────────
  static const Color secondary            = Color(0xFF059669); // Emerald 600
  static const Color secondaryFixed       = Color(0xFF6FFBBE);
  static const Color secondaryFixedDim    = Color(0xFF4EDEA3);
  static const Color secondaryContainer   = Color(0xFF10B981);
  static const Color onSecondary          = Colors.white;
  static const Color onSecondaryFixed     = Color(0xFF002113);
  static const Color onSecondaryFixedVariant = Color(0xFF005236);
  static const Color onSecondaryContainer = Colors.white;

  // ─── Tertiary (Sistem & Mavi Vurgular) ────────────────────────────────────
  static const Color tertiary             = Color(0xFF0284C7); // Sky 600
  static const Color tertiaryFixed        = Color(0xFFC4E7FF);
  static const Color tertiaryFixedDim     = Color(0xFF7BD0FF);
  static const Color tertiaryContainer    = Color(0xFF0EA5E9);
  static const Color onTertiary           = Colors.white;
  static const Color onTertiaryFixed      = Color(0xFF001E2C);
  static const Color onTertiaryFixedVariant = Color(0xFF004C69);
  static const Color onTertiaryContainer  = Colors.white;

  // ─── Error (Hata / İptal Kırmızı) ─────────────────────────────────────────
  static const Color error                = Color(0xFFDC2626); // Red 600
  static const Color errorContainer       = Color(0xFFFEE2E2); // Red 100
  static const Color onError              = Colors.white;
  static const Color onErrorContainer     = Color(0xFF991B1B);

  // ─── Outline & Kenarlıklar ───────────────────────────────────────────────
  static const Color outline              = Color(0xFFE2E8F0); // Slate 200
  static const Color outlineVariant       = Color(0xFFCBD5E1); // Slate 300
}

/// Tema duyarlı renk erişimi. Widget'lar `AppColors.x` ile okur; aktif palet [isDark] bayrağına göre seçilir.
/// Bayrak MaterialApp seviyesinde (main.dart) tema değişince güncellenir ve ağaç yeniden çizilir.
abstract final class AppColors {
  /// Karanlık palet aktif mi?
  static bool isDark = false;

  static Color get background => isDark ? AppDarkColors.background : AppLightColors.background;
  static Color get surface => isDark ? AppDarkColors.surface : AppLightColors.surface;
  static Color get surfaceDim => isDark ? AppDarkColors.surfaceDim : AppLightColors.surfaceDim;
  static Color get surfaceBright => isDark ? AppDarkColors.surfaceBright : AppLightColors.surfaceBright;
  static Color get surfaceContainerLowest => isDark ? AppDarkColors.surfaceContainerLowest : AppLightColors.surfaceContainerLowest;
  static Color get surfaceContainerLow => isDark ? AppDarkColors.surfaceContainerLow : AppLightColors.surfaceContainerLow;
  static Color get surfaceContainer => isDark ? AppDarkColors.surfaceContainer : AppLightColors.surfaceContainer;
  static Color get surfaceContainerHigh => isDark ? AppDarkColors.surfaceContainerHigh : AppLightColors.surfaceContainerHigh;
  static Color get surfaceContainerHighest => isDark ? AppDarkColors.surfaceContainerHighest : AppLightColors.surfaceContainerHighest;
  static Color get surfaceVariant => isDark ? AppDarkColors.surfaceVariant : AppLightColors.surfaceVariant;
  static Color get inverseSurface => isDark ? AppDarkColors.inverseSurface : AppLightColors.inverseSurface;
  static Color get inverseOnSurface => isDark ? AppDarkColors.inverseOnSurface : AppLightColors.inverseOnSurface;
  static Color get surfaceTint => isDark ? AppDarkColors.surfaceTint : AppLightColors.surfaceTint;
  static Color get onSurface => isDark ? AppDarkColors.onSurface : AppLightColors.onSurface;
  static Color get onSurfaceVariant => isDark ? AppDarkColors.onSurfaceVariant : AppLightColors.onSurfaceVariant;
  static Color get onBackground => isDark ? AppDarkColors.onBackground : AppLightColors.onBackground;
  static Color get primary => isDark ? AppDarkColors.primary : AppLightColors.primary;
  static Color get primaryFixed => isDark ? AppDarkColors.primaryFixed : AppLightColors.primaryFixed;
  static Color get primaryFixedDim => isDark ? AppDarkColors.primaryFixedDim : AppLightColors.primaryFixedDim;
  static Color get primaryContainer => isDark ? AppDarkColors.primaryContainer : AppLightColors.primaryContainer;
  static Color get onPrimary => isDark ? AppDarkColors.onPrimary : AppLightColors.onPrimary;
  static Color get onPrimaryFixed => isDark ? AppDarkColors.onPrimaryFixed : AppLightColors.onPrimaryFixed;
  static Color get onPrimaryFixedVariant => isDark ? AppDarkColors.onPrimaryFixedVariant : AppLightColors.onPrimaryFixedVariant;
  static Color get onPrimaryContainer => isDark ? AppDarkColors.onPrimaryContainer : AppLightColors.onPrimaryContainer;
  static Color get inversePrimary => isDark ? AppDarkColors.inversePrimary : AppLightColors.inversePrimary;
  static Color get secondary => isDark ? AppDarkColors.secondary : AppLightColors.secondary;
  static Color get secondaryFixed => isDark ? AppDarkColors.secondaryFixed : AppLightColors.secondaryFixed;
  static Color get secondaryFixedDim => isDark ? AppDarkColors.secondaryFixedDim : AppLightColors.secondaryFixedDim;
  static Color get secondaryContainer => isDark ? AppDarkColors.secondaryContainer : AppLightColors.secondaryContainer;
  static Color get onSecondary => isDark ? AppDarkColors.onSecondary : AppLightColors.onSecondary;
  static Color get onSecondaryFixed => isDark ? AppDarkColors.onSecondaryFixed : AppLightColors.onSecondaryFixed;
  static Color get onSecondaryFixedVariant => isDark ? AppDarkColors.onSecondaryFixedVariant : AppLightColors.onSecondaryFixedVariant;
  static Color get onSecondaryContainer => isDark ? AppDarkColors.onSecondaryContainer : AppLightColors.onSecondaryContainer;
  static Color get tertiary => isDark ? AppDarkColors.tertiary : AppLightColors.tertiary;
  static Color get tertiaryFixed => isDark ? AppDarkColors.tertiaryFixed : AppLightColors.tertiaryFixed;
  static Color get tertiaryFixedDim => isDark ? AppDarkColors.tertiaryFixedDim : AppLightColors.tertiaryFixedDim;
  static Color get tertiaryContainer => isDark ? AppDarkColors.tertiaryContainer : AppLightColors.tertiaryContainer;
  static Color get onTertiary => isDark ? AppDarkColors.onTertiary : AppLightColors.onTertiary;
  static Color get onTertiaryFixed => isDark ? AppDarkColors.onTertiaryFixed : AppLightColors.onTertiaryFixed;
  static Color get onTertiaryFixedVariant => isDark ? AppDarkColors.onTertiaryFixedVariant : AppLightColors.onTertiaryFixedVariant;
  static Color get onTertiaryContainer => isDark ? AppDarkColors.onTertiaryContainer : AppLightColors.onTertiaryContainer;
  static Color get error => isDark ? AppDarkColors.error : AppLightColors.error;
  static Color get errorContainer => isDark ? AppDarkColors.errorContainer : AppLightColors.errorContainer;
  static Color get onError => isDark ? AppDarkColors.onError : AppLightColors.onError;
  static Color get onErrorContainer => isDark ? AppDarkColors.onErrorContainer : AppLightColors.onErrorContainer;
  static Color get outline => isDark ? AppDarkColors.outline : AppLightColors.outline;
  static Color get outlineVariant => isDark ? AppDarkColors.outlineVariant : AppLightColors.outlineVariant;
}

/// KuryeSistemi Gece / Karanlık Mod Paleti (Dark Mode)
abstract final class AppDarkColors {
  static const Color background           = Color(0xFF0B1326);
  static const Color surface              = Color(0xFF0B1326);
  static const Color surfaceDim           = Color(0xFF0B1326);
  static const Color surfaceBright        = Color(0xFF31394D);
  static const Color surfaceContainerLowest = Color(0xFF060E20);
  static const Color surfaceContainerLow  = Color(0xFF131B2E);
  static const Color surfaceContainer     = Color(0xFF171F33);
  static const Color surfaceContainerHigh = Color(0xFF222A3D);
  static const Color surfaceContainerHighest = Color(0xFF2D3449);
  static const Color surfaceVariant       = Color(0xFF2D3449);
  static const Color inverseSurface       = Color(0xFFDAE2FD);
  static const Color inverseOnSurface     = Color(0xFF283044);
  static const Color surfaceTint          = Color(0xFFFFB693);

  static const Color onSurface            = Color(0xFFDAE2FD);
  static const Color onSurfaceVariant     = Color(0xFFE2BFB0);
  static const Color onBackground         = Color(0xFFDAE2FD);

  static const Color primary              = Color(0xFFFFB693);
  static const Color primaryFixed         = Color(0xFFFFDBCC);
  static const Color primaryFixedDim      = Color(0xFFFFB693);
  static const Color primaryContainer     = Color(0xFFFF6B00);
  static const Color onPrimary            = Color(0xFF561F00);
  static const Color onPrimaryFixed       = Color(0xFF351000);
  static const Color onPrimaryFixedVariant = Color(0xFF7A3000);
  static const Color onPrimaryContainer   = Color(0xFF572000);
  static const Color inversePrimary       = Color(0xFFA04100);

  static const Color secondary            = Color(0xFF4EDEA3);
  static const Color secondaryFixed       = Color(0xFF6FFBBE);
  static const Color secondaryFixedDim    = Color(0xFF4EDEA3);
  static const Color secondaryContainer   = Color(0xFF00A572);
  static const Color onSecondary          = Color(0xFF003824);
  static const Color onSecondaryFixed     = Color(0xFF002113);
  static const Color onSecondaryFixedVariant = Color(0xFF005236);
  static const Color onSecondaryContainer = Color(0xFF00311F);

  static const Color tertiary             = Color(0xFF7BD0FF);
  static const Color tertiaryFixed        = Color(0xFFC4E7FF);
  static const Color tertiaryFixedDim     = Color(0xFF7BD0FF);
  static const Color tertiaryContainer    = Color(0xFF00A4DD);
  static const Color onTertiary           = Color(0xFF00354A);
  static const Color onTertiaryFixed      = Color(0xFF001E2C);
  static const Color onTertiaryFixedVariant = Color(0xFF004C69);
  static const Color onTertiaryContainer  = Color(0xFF00354A);

  static const Color error                = Color(0xFFFFB4AB);
  static const Color errorContainer       = Color(0xFF93000A);
  static const Color onError              = Color(0xFF690005);
  static const Color onErrorContainer     = Color(0xFFFFDAD6);

  static const Color outline              = Color(0xFFA98A7D);
  static const Color outlineVariant       = Color(0xFF5A4136);
}
