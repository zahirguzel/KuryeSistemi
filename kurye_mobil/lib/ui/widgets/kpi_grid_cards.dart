import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// KPI Grid Kartları — "Bugünkü Kazanç" ve "Tamamlanan" 2'li grid.
/// HTML: section.grid.grid-cols-2.gap-stack-gap
class KpiGridCards extends StatelessWidget {
  const KpiGridCards({
    super.key,
    this.todayEarnings = '₺1.420',
    this.earningsCents = ',00',
    this.earningsGrowth = '+%18 düne göre',
    this.packageCount = '14 Paket',
    this.avgPerPackage = '₺101.4/ort',
    this.completedCount = 14,
    this.targetCount = 20,
  });

  final String todayEarnings;
  final String earningsCents;
  final String earningsGrowth;
  final String packageCount;
  final String avgPerPackage;
  final int completedCount;
  final int targetCount;

  double get _progressFraction =>
      (completedCount / targetCount).clamp(0.0, 1.0);
  int get _remaining => targetCount - completedCount;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // ── Bugünkü Kazanç ──────────────────────────────────────────────
        Expanded(child: _EarningsCard(
          earnings: todayEarnings,
          cents: earningsCents,
          growth: earningsGrowth,
          packageCount: packageCount,
          avgPerPackage: avgPerPackage,
        )),
        const SizedBox(width: 12),
        // ── Tamamlanan ──────────────────────────────────────────────────
        Expanded(child: _CompletedCard(
          completed: completedCount,
          target: targetCount,
          progress: _progressFraction,
          remaining: _remaining,
        )),
      ],
    );
  }
}

// ── Earnings Card ─────────────────────────────────────────────────────────────
class _EarningsCard extends StatelessWidget {
  const _EarningsCard({
    required this.earnings,
    required this.cents,
    required this.growth,
    required this.packageCount,
    required this.avgPerPackage,
  });

  final String earnings;
  final String cents;
  final String growth;
  final String packageCount;
  final String avgPerPackage;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Flexible(
                child: Text(
                  'BUGÜNKÜ KAZANÇ',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.payments_outlined,
                  color: AppColors.primary, size: 18),
            ],
          ),
          const SizedBox(height: 8),
          // Amount
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: earnings,
                    style: AppTextStyles.headlineLg.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  TextSpan(
                    text: cents,
                    style: AppTextStyles.bodyLg.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Growth
          Row(
            children: [
              const Icon(Icons.trending_up,
                  color: AppColors.secondary, size: 16),
              const SizedBox(width: 3),
              Flexible(
                child: Text(
                  growth,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Divider(color: AppColors.surfaceContainerHigh, height: 1),
          const SizedBox(height: 8),
          // Footer
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(packageCount,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontWeight: FontWeight.w400,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ),
              const SizedBox(width: 4),
              Text(avgPerPackage,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.tertiary,
                  )),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Completed Deliveries Card ─────────────────────────────────────────────────
class _CompletedCard extends StatelessWidget {
  const _CompletedCard({
    required this.completed,
    required this.target,
    required this.progress,
    required this.remaining,
  });

  final int completed;
  final int target;
  final double progress;
  final int remaining;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Flexible(
                child: Text(
                  'TAMAMLANAN',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.local_shipping_outlined,
                  color: AppColors.tertiary, size: 18),
            ],
          ),
          const SizedBox(height: 8),
          // Count + target
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  '$completed',
                  style: AppTextStyles.headlineLg.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  '/ $target Hedef',
                  style: AppTextStyles.bodyMd.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: AppColors.surfaceContainerHighest,
              valueColor:
                  const AlwaysStoppedAnimation<Color>(AppColors.secondary),
            ),
          ),
          const SizedBox(height: 8),
          const Divider(color: AppColors.surfaceContainerHigh, height: 1),
          const SizedBox(height: 8),
          // Footer
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  '%${(progress * 100).round()} Tamamlandı',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontWeight: FontWeight.w400,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '+$remaining kaldı',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.secondary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
