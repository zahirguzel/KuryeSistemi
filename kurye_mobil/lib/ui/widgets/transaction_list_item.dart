import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Yeniden kullanılabilir finansal işlem liste öğesi (TransactionListItem)
/// HTML: div.flex.items-center.justify-between.p-inset-md.rounded-xl.bg-surface-container
class TransactionListItem extends StatelessWidget {
  const TransactionListItem({
    super.key,
    required this.title,
    required this.time,
    required this.subtitle,
    required this.amount,
    required this.status,
    required this.icon,
    this.badgeText,
    this.isNegative = false,
    this.iconColor = AppColors.secondary,
    this.iconBgColor,
    this.onTap,
  });

  final String title;
  final String time;
  final String subtitle;
  final String amount;
  final String status;
  final IconData icon;
  final String? badgeText;
  final bool isNegative;
  final Color iconColor;
  final Color? iconBgColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final effectiveBgColor = iconBgColor ??
        (isNegative
            ? AppColors.tertiaryContainer.withValues(alpha: 0.2)
            : AppColors.secondaryContainer.withValues(alpha: 0.2));

    final effectiveAmountColor =
        isNegative ? AppColors.tertiary : AppColors.secondary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isNegative
                ? AppColors.surfaceContainerHigh
                : AppColors.surfaceContainer,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: AppColors.surfaceBright.withValues(alpha: 0.3),
              width: 0.7,
            ),
          ),
          child: Row(
            children: [
              // ── Sol İkon Kutusu ──────────────────────────────────────────
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: effectiveBgColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Icon(icon, color: iconColor, size: 22),
              ),
              const SizedBox(width: 12),

              // ── Orta Başlık & Detay ───────────────────────────────────────
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.headlineSm.copyWith(
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurface,
                              fontSize: 14.5,
                            ),
                          ),
                        ),
                        if (time.isNotEmpty) ...[
                          const SizedBox(width: 4),
                          Text(
                            time,
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.onSurfaceVariant.withValues(alpha: 0.8),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Text(
                          subtitle,
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.onSurfaceVariant.withValues(alpha: 0.85),
                            fontWeight: FontWeight.w500,
                            fontSize: 11.5,
                          ),
                        ),
                        if (badgeText != null) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 1.5,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.secondary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              badgeText!,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.secondary,
                                fontWeight: FontWeight.w800,
                                fontSize: 9.5,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),

              // ── Sağ Tutar & Durum ─────────────────────────────────────────
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    amount,
                    style: AppTextStyles.headlineSm.copyWith(
                      color: effectiveAmountColor,
                      fontWeight: FontWeight.w800,
                      fontSize: 15.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    status,
                    style: AppTextStyles.caption.copyWith(
                      color: isNegative
                          ? AppColors.tertiaryFixedDim
                          : AppColors.onSurfaceVariant,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
