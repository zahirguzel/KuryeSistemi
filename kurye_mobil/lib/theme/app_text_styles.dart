import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// HTML'deki fontSize / fontWeight tanımlarını Flutter TextStyle'a çevirir.
abstract final class AppTextStyles {
  static TextStyle get headlineXl => GoogleFonts.inter(
        fontSize: 36,
        height: 44 / 36,
        letterSpacing: -0.02 * 36,
        fontWeight: FontWeight.w800,
        color: AppColors.onSurface,
      );

  static TextStyle get headlineLg => GoogleFonts.inter(
        fontSize: 28,
        height: 36 / 28,
        letterSpacing: -0.01 * 28,
        fontWeight: FontWeight.w700,
        color: AppColors.onSurface,
      );

  static TextStyle get headlineMd => GoogleFonts.inter(
        fontSize: 22,
        height: 28 / 22,
        fontWeight: FontWeight.w700,
        color: AppColors.onSurface,
      );

  static TextStyle get headlineSm => GoogleFonts.inter(
        fontSize: 18,
        height: 24 / 18,
        fontWeight: FontWeight.w600,
        color: AppColors.onSurface,
      );

  static TextStyle get bodyXl => GoogleFonts.inter(
        fontSize: 20,
        height: 28 / 20,
        fontWeight: FontWeight.w500,
        color: AppColors.onSurface,
      );

  static TextStyle get bodyLg => GoogleFonts.inter(
        fontSize: 16,
        height: 24 / 16,
        fontWeight: FontWeight.w400,
        color: AppColors.onSurface,
      );

  static TextStyle get bodyMd => GoogleFonts.inter(
        fontSize: 14,
        height: 20 / 14,
        fontWeight: FontWeight.w400,
        color: AppColors.onSurface,
      );

  static TextStyle get labelAction => GoogleFonts.inter(
        fontSize: 18,
        height: 24 / 18,
        letterSpacing: 0.02 * 18,
        fontWeight: FontWeight.w700,
        color: AppColors.onSurface,
      );

  static TextStyle get labelStatus => GoogleFonts.inter(
        fontSize: 13,
        height: 16 / 13,
        letterSpacing: 0.06 * 13,
        fontWeight: FontWeight.w700,
        color: AppColors.onSurface,
      );

  static TextStyle get caption => GoogleFonts.inter(
        fontSize: 12,
        height: 16 / 12,
        fontWeight: FontWeight.w500,
        color: AppColors.onSurface,
      );

  // Material 3 style aliases
  static TextStyle get bodyLarge => bodyLg;
  static TextStyle get bodyMedium => bodyMd;
  static TextStyle get bodySmall => caption;
  static TextStyle get titleMedium => headlineSm;
  static TextStyle get headlineMedium => headlineMd;
  static TextStyle get displayLarge => headlineXl;
}
