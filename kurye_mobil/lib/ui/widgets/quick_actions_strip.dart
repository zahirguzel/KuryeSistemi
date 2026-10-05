import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Eldiven Dostu Hızlı Eylemler Çubuğu (Glove-Friendly Quick Actions Strip)
/// HTML: section.flex.flex-col.gap-inset-xs.mb-2 (Mola Ver, Yoğunluk Haritası, Acil Destek)
class QuickActionsStrip extends StatelessWidget {
  const QuickActionsStrip({
    super.key,
    this.onTakeBreak,
    this.isOnBreak = false,
    this.onOpenSurgeMap,
    this.onEmergencySupport,
  });

  final VoidCallback? onTakeBreak;

  /// Kurye şu an molada mı? Buton "Moladan Dön" olarak vurgulanır.
  final bool isOnBreak;
  final VoidCallback? onOpenSurgeMap;
  final VoidCallback? onEmergencySupport;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
          child: Text(
            'HIZLI EYLEMLER',
            style: AppTextStyles.caption.copyWith(
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.8),
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            // Action 1: Break
            Expanded(
              child: _QuickActionButton(
                icon: Icons.coffee_rounded,
                iconColor: AppColors.tertiary,
                label: isOnBreak ? 'Moladan Dön' : 'Mola Ver',
                textColor: AppColors.onSurface,
                backgroundColor: isOnBreak
                    ? AppColors.tertiary.withValues(alpha: 0.18)
                    : AppColors.surfaceContainer,
                borderColor: isOnBreak ? AppColors.tertiary.withValues(alpha: 0.5) : null,
                onTap: onTakeBreak,
              ),
            ),
            const SizedBox(width: 8),

            // Action 2: Surge Map
            Expanded(
              child: _QuickActionButton(
                icon: Icons.local_fire_department_rounded,
                iconColor: AppColors.primary,
                label: 'Yoğunluk Haritası',
                textColor: AppColors.onSurface,
                backgroundColor: AppColors.surfaceContainer,
                onTap: onOpenSurgeMap,
              ),
            ),
            const SizedBox(width: 8),

            // Action 3: Emergency Support
            Expanded(
              child: _QuickActionButton(
                icon: Icons.sos_rounded,
                iconColor: AppColors.error,
                label: 'Acil Destek',
                textColor: AppColors.error,
                backgroundColor: AppColors.errorContainer.withValues(alpha: 0.35),
                borderColor: AppColors.error.withValues(alpha: 0.25),
                onTap: onEmergencySupport,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  const _QuickActionButton({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.textColor,
    required this.backgroundColor,
    this.borderColor,
    this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final Color textColor;
  final Color backgroundColor;
  final Color? borderColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          height: 68,
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(14),
            border: borderColor != null
                ? Border.all(color: borderColor!, width: 1)
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: iconColor, size: 24),
              const SizedBox(height: 5),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: AppTextStyles.caption.copyWith(
                    color: textColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
