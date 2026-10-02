import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Radar Animasyonu — Canlı sipariş arama nabzı ve dönen radar iğnesi.
/// HTML: section.relative.flex.flex-col.items-center.justify-center.p-inset-lg.rounded-xl.bg-surface-container-low
class RadarScannerView extends StatefulWidget {
  const RadarScannerView({
    super.key,
    this.title = 'Yeni Siparişler Taranıyor...',
    this.subtitle =
        'Bölgenizdeki restoranlar aktif. Yakınında sipariş düştüğünde sesli ve titreşimli bildirim alacaksınız.',
    this.zoneText = 'Kadıköy / Moda Sektörü - Yüksek Talep',
    this.isScanning = true,
  });

  final String title;
  final String subtitle;
  final String zoneText;
  final bool isScanning;

  @override
  State<RadarScannerView> createState() => _RadarScannerViewState();
}

class _RadarScannerViewState extends State<RadarScannerView>
    with TickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final AnimationController _rotationController;
  late final Animation<double> _pulseScaleAnimation;
  late final Animation<double> _pulseFadeAnimation;

  @override
  void initState() {
    super.initState();
    // Pulse animation (ambient waves)
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat();

    _pulseScaleAnimation = Tween<double>(begin: 0.8, end: 1.25).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOutQuad),
    );

    _pulseFadeAnimation = Tween<double>(begin: 0.7, end: 0.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOutQuad),
    );

    // Continuous rotation for radar sweep
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _rotationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 260),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // ── Ambient Radar Waves ──────────────────────────────────────────
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              return Stack(
                alignment: Alignment.center,
                children: [
                  // Outer Wave
                  Transform.scale(
                    scale: _pulseScaleAnimation.value,
                    child: Container(
                      width: 210,
                      height: 210,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primary.withValues(
                          alpha: (_pulseFadeAnimation.value * 0.12).clamp(0.0, 1.0),
                        ),
                        border: Border.all(
                          color: AppColors.primary.withValues(
                            alpha: (_pulseFadeAnimation.value * 0.25).clamp(0.0, 1.0),
                          ),
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
                  // Middle Wave
                  Container(
                    width: 155,
                    height: 155,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.secondary.withValues(alpha: 0.08),
                      border: Border.all(
                        color: AppColors.secondary.withValues(alpha: 0.20),
                        width: 1,
                      ),
                    ),
                  ),
                  // Inner Core
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.surfaceContainerHigh.withValues(alpha: 0.65),
                    ),
                  ),
                ],
              );
            },
          ),

          // ── Content ──────────────────────────────────────────────────────
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Central Radar Pin
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.surfaceContainerHighest,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.4),
                          blurRadius: 20,
                          offset: const Offset(0, 4),
                        ),
                        BoxShadow(
                          color: AppColors.primaryContainer.withValues(alpha: 0.25),
                          blurRadius: 18,
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primaryContainer.withValues(alpha: 0.18),
                      ),
                      alignment: Alignment.center,
                      child: AnimatedBuilder(
                        animation: _rotationController,
                        builder: (context, child) {
                          return Transform.rotate(
                            angle: _rotationController.value * 2 * math.pi,
                            child: const Icon(
                              Icons.radar_rounded,
                              size: 32,
                              color: AppColors.primaryContainer,
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  // Active Green Dot
                  Positioned(
                    top: 2,
                    right: 2,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: AppColors.secondary,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.surfaceContainerHighest,
                          width: 2.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.secondary.withValues(alpha: 0.7),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Title
              Text(
                widget.title,
                textAlign: TextAlign.center,
                style: AppTextStyles.headlineSm.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 6),

              // Subtitle
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 275),
                child: Text(
                  widget.subtitle,
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodyMd.copyWith(
                    color: AppColors.onSurfaceVariant.withValues(alpha: 0.85),
                    height: 1.35,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Region Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHigh.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.secondary.withValues(alpha: 0.25),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.secondary,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      widget.zoneText,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
