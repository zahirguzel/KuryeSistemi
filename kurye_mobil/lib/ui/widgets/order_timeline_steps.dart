import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Aşama 1 (Restorandan Alış) ve Aşama 2 (Müşteriye Teslimat) kartlarını içeren zaman çizelgesi adımları.
/// HTML: div.flex.flex-col.gap-3 (ADIM 1 & ADIM 2)
class OrderTimelineSteps extends StatelessWidget {
  const OrderTimelineSteps({
    super.key,
    this.restaurantName = 'Burger & Co. Kadıköy',
    this.restaurantAddress = 'Caferağa Mah. Moda Cad. No:12/A',
    this.restaurantPhone = '02165550199',
    this.orderItemsSummary = '2x Gurme Smash Menü, 1x Çıtır Soğan',
    this.itemCountText = '3 Parça',
    this.customerName = 'Zeynep Kaya',
    this.customerAddress = 'Moda Cad. Deniz Apt. Kat:3 D:7',
    this.customerPhone = '05325550188',
    this.customerNote =
        'Bebek uyuyor, lütfen zili çalmayın. Kapının önüne bırakıp kapıyı tıklatın.',
    this.onCallRestaurant,
    this.onNavigateRestaurant,
    this.onCallCustomer,
  });

  final String restaurantName;
  final String restaurantAddress;
  final String restaurantPhone;
  final String orderItemsSummary;
  final String itemCountText;
  final String customerName;
  final String customerAddress;
  final String customerPhone;
  final String customerNote;
  final VoidCallback? onCallRestaurant;
  final VoidCallback? onNavigateRestaurant;
  final VoidCallback? onCallCustomer;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── ADIM 1: Restorandan Alış (İşletme) ─────────────────────────────
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainer,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppColors.surfaceBright.withValues(alpha: 0.3),
              width: 0.8,
            ),
          ),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Restaurant Icon Box
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.tertiary.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: Icon(
                      Icons.restaurant_rounded,
                      color: AppColors.tertiary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                restaurantName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTextStyles.bodyLg.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.onSurface,
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.secondaryContainer.withValues(alpha: 0.25),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'PAKET HAZIR',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.secondary,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 9.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          restaurantAddress,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.bodyMd.copyWith(
                            color: AppColors.onSurfaceVariant.withValues(alpha: 0.85),
                            fontSize: 12.5,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Action buttons
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Call button
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: onCallRestaurant,
                          borderRadius: BorderRadius.circular(10),
                          child: Ink(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerHigh,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              Icons.call_rounded,
                              size: 18,
                              color: AppColors.onSurface,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),

                      // Directions button
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: onNavigateRestaurant,
                          borderRadius: BorderRadius.circular(10),
                          child: Ink(
                            height: 36,
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            decoration: BoxDecoration(
                              color: AppColors.primaryContainer,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.directions_rounded,
                                  size: 16,
                                  color: AppColors.onPrimaryContainer,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Tarif',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.onPrimaryContainer,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Items summary bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Icon(
                            Icons.lunch_dining_rounded,
                            size: 16,
                            color: AppColors.tertiary,
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              orderItemsSummary,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      itemCountText,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // ── ADIM 2: Müşteriye Teslimat (Hedef) ─────────────────────────────
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainer,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppColors.surfaceBright.withValues(alpha: 0.3),
              width: 0.8,
            ),
          ),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Customer Icon Box
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: Icon(
                      Icons.person_pin_circle_rounded,
                      color: AppColors.secondary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          customerName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.bodyLg.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          customerAddress,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.bodyMd.copyWith(
                            color: AppColors.onSurfaceVariant.withValues(alpha: 0.85),
                            fontSize: 12.5,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Call Customer Button
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: onCallCustomer,
                      borderRadius: BorderRadius.circular(10),
                      child: Ink(
                        height: 36,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerHigh,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.phone_in_talk_rounded,
                              size: 16,
                              color: AppColors.secondary,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'Ara',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.secondary,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Customer Note Highlight Box
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLowest,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: AppColors.primaryContainer.withValues(alpha: 0.25),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.notifications_active_rounded,
                      size: 18,
                      color: AppColors.primaryContainer,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'MÜŞTERİ NOTU:',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.6,
                              fontSize: 10,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '"$customerNote"',
                            style: AppTextStyles.bodyMd.copyWith(
                              color: AppColors.onSurface,
                              fontWeight: FontWeight.w600,
                              fontSize: 12.5,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
