import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Haftalık Performans Çubuk Grafiği (WeeklyPerformanceChart)
/// HTML: div.flex.flex-col.rounded-xl.bg-surface-container-low.p-inset-lg
class WeeklyPerformanceChart extends StatelessWidget {
  const WeeklyPerformanceChart({
    super.key,
    this.totalWeeklyEarnings = '₺7.920',
    this.avgPerPackage = '₺54,50',
    this.bonusText = '+₺420 Dahil',
  });

  final String totalWeeklyEarnings;
  final String avgPerPackage;
  final String bonusText;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.3),
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Başlık & Ortalama Satırı ─────────────────────────────────────
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'HAFTALIK PERFORMANS',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant.withValues(alpha: 0.8),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.9,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    totalWeeklyEarnings,
                    style: AppTextStyles.headlineMd.copyWith(
                      color: AppColors.onSurface,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Paket Başı Ort.',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant.withValues(alpha: 0.85),
                      fontSize: 11.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    avgPerPackage,
                    style: AppTextStyles.headlineSm.copyWith(
                      color: AppColors.secondary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 18),

          // ── Dikey Çubuk Grafiği (Bar Chart) ──────────────────────────────
          const SizedBox(
            height: 154,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _ChartBar(day: 'Pzt', amount: '₺850', height: 68),
                _ChartBar(day: 'Sal', amount: '₺920', height: 80),
                _ChartBar(day: 'Çar', amount: '₺1.050', height: 96),
                _ChartBar(day: 'Per', amount: '₺980', height: 82),
                _ChartBar(
                  day: 'Cum',
                  amount: '₺1.940',
                  height: 116,
                  isHighlighted: true,
                ),
                _ChartBar(
                  day: 'Cmt',
                  amount: '₺2.180',
                  height: 128,
                  isHighlighted: true,
                ),
                _ChartBar(day: 'Paz', amount: '₺0', height: 5, isFlat: true),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Mini Bilgi Şeridi (Yoğunluk Primi) ───────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHigh.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.local_fire_department_rounded,
                      size: 18,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Hafta Sonu Yoğunluk Primi',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                Text(
                  bonusText,
                  style: AppTextStyles.labelStatus.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChartBar extends StatelessWidget {
  const _ChartBar({
    required this.day,
    required this.amount,
    required this.height,
    this.isHighlighted = false,
    this.isFlat = false,
  });

  final String day;
  final String amount;
  final double height;
  final bool isHighlighted;
  final bool isFlat;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 3),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            // Amount Label on Top of Peak Days
            if (isHighlighted)
              Text(
                amount,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w800,
                  fontSize: 10,
                ),
              )
            else
              const SizedBox(height: 14),
            const SizedBox(height: 4),

            // Bar Container
            AnimatedContainer(
              duration: const Duration(milliseconds: 400),
              curve: Curves.easeOutCubic,
              height: height,
              width: double.infinity,
              constraints: const BoxConstraints(maxWidth: 30),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(isFlat ? 2 : 7),
                gradient: isHighlighted
                    ? const LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [
                          AppColors.primaryContainer,
                          AppColors.primary,
                        ],
                      )
                    : null,
                color: isHighlighted
                    ? null
                    : isFlat
                        ? AppColors.surfaceContainerHighest
                        : AppColors.surfaceVariant,
                boxShadow: isHighlighted
                    ? [
                        BoxShadow(
                          color: AppColors.primaryContainer.withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
            ),
            const SizedBox(height: 6),

            // Day Label
            Text(
              day,
              style: AppTextStyles.caption.copyWith(
                color: isHighlighted
                    ? AppColors.primary
                    : AppColors.onSurfaceVariant.withValues(alpha: 0.8),
                fontWeight: isHighlighted ? FontWeight.w800 : FontWeight.w500,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
