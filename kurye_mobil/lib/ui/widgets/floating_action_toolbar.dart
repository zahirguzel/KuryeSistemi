import 'dart:ui';
import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Haritanın sol üstündeki (8 dk ETA) rota HUD rozeti ve
/// sağ üstündeki (Merkeze Odakla, Trafik, Harici Navigasyon) yüzen kontrol butonları.
class FloatingActionToolbar extends StatelessWidget {
  const FloatingActionToolbar({
    super.key,
    this.etaMinutes = '8 dk',
    this.distance = '(2.4 km)',
    this.trafficCondition = 'Trafik: Akıcı (Moda Cad.)',
    this.isTrafficActive = true,
    this.onCenterMap,
    this.onToggleTraffic,
    this.onOpenExternalNav,
  });

  final String etaMinutes;
  final String distance;
  final String trafficCondition;
  final bool isTrafficActive;
  final VoidCallback? onCenterMap;
  final VoidCallback? onToggleTraffic;
  final VoidCallback? onOpenExternalNav;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // ── Sol: Yüzen Rota HUD Rozeti (Tahmini Varış) ───────────────────
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHigh.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: AppColors.surfaceBright.withValues(alpha: 0.4),
                    width: 0.8,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.sports_motorsports_rounded,
                        color: AppColors.primary,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              etaMinutes,
                              style: AppTextStyles.headlineSm.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              distance,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.onSurfaceVariant.withValues(alpha: 0.85),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 1),
                        Text(
                          trafficCondition,
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.secondary,
                            fontWeight: FontWeight.w700,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Sağ: Yüzen Kontrol Araç Çubuğu ──────────────────────────────
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 1. Merkeze Odakla Butonu
              _FloatingHudButton(
                icon: Icons.my_location_rounded,
                iconColor: AppColors.onSurface,
                backgroundColor: AppColors.surfaceContainerHigh.withValues(alpha: 0.90),
                tooltip: 'Merkeze Odakla',
                onTap: onCenterMap,
              ),
              const SizedBox(height: 8),

              // 2. Trafik Aç/Kapa
              _FloatingHudButton(
                icon: Icons.traffic_rounded,
                iconColor: isTrafficActive
                    ? AppColors.secondary
                    : AppColors.onSurfaceVariant.withValues(alpha: 0.6),
                backgroundColor: AppColors.surfaceContainerHigh.withValues(alpha: 0.90),
                tooltip: 'Trafik Durumu',
                onTap: onToggleTraffic,
              ),
              const SizedBox(height: 8),

              // 3. Harici Navigasyon
              _FloatingHudButton(
                icon: Icons.navigation_rounded,
                iconColor: AppColors.onTertiaryFixed,
                backgroundColor: AppColors.tertiaryContainer,
                tooltip: 'Navigasyonu Başlat',
                onTap: onOpenExternalNav,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FloatingHudButton extends StatelessWidget {
  const _FloatingHudButton({
    required this.icon,
    required this.iconColor,
    required this.backgroundColor,
    required this.tooltip,
    this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final Color backgroundColor;
  final String tooltip;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Material(
          color: backgroundColor,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 46,
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.surfaceBright.withValues(alpha: 0.3),
                  width: 0.8,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.25),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
          ),
        ),
      ),
    );
  }
}
