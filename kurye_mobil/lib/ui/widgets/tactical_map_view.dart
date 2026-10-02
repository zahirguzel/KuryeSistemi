import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';
import 'floating_action_toolbar.dart';

/// Üst %60'lık alanı kaplayan karanlık / taktiksel harita görünümü.
/// Harita üzeri canlı kurye rotası, GPS pini, restoran pini ve hedef müşteri pini içerir.
class TacticalMapView extends StatefulWidget {
  const TacticalMapView({
    super.key,
    this.courierSpeed = 'Sen (42 km/s)',
    this.restaurantName = 'İskenderun Dürüm Evi',
    this.destinationName = 'İsmet İnönü Mah.',
    this.onCenterMap,
    this.onToggleTraffic,
    this.onOpenExternalNav,
  });

  final String courierSpeed;
  final String restaurantName;
  final String destinationName;
  final VoidCallback? onCenterMap;
  final VoidCallback? onToggleTraffic;
  final VoidCallback? onOpenExternalNav;

  @override
  State<TacticalMapView> createState() => _TacticalMapViewState();
}

class _TacticalMapViewState extends State<TacticalMapView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseScale;
  late final Animation<double> _pulseOpacity;
  bool _isTrafficActive = true;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat();

    _pulseScale = Tween<double>(begin: 1.0, end: 2.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOut),
    );

    _pulseOpacity = Tween<double>(begin: 0.8, end: 0.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final h = constraints.maxHeight.isFinite && constraints.maxHeight > 300
            ? constraints.maxHeight
            : 390.0;

        // Proportional pin coordinates based on actual width/height
        final courierX = w * 0.22;
        final courierY = h * 0.74;

        final restaurantX = w * 0.50;
        final restaurantY = h * 0.44;

        final customerX = w * 0.78;
        final customerY = h * 0.21;

        return Container(
          width: w,
          height: h,
          color: const Color(0xFF091122), // Tactical Map Deep Navy
          child: Stack(
            children: [
              // ── 1. Taktiksel Harita Çizgileri & Yollar & Rota ────────────
              CustomPaint(
                size: Size(w, h),
                painter: _TacticalMapPainter(
                  courierPoint: Offset(courierX, courierY),
                  restaurantPoint: Offset(restaurantX, restaurantY),
                  customerPoint: Offset(customerX, customerY),
                  showTraffic: _isTrafficActive,
                ),
              ),

              // ── 2. Rota Çizgisi Üzerinde Animasyonlu Kurye Pini ──────────
              Positioned(
                left: courierX,
                top: courierY,
                child: FractionalTranslation(
                  translation: const Offset(-0.5, -0.5),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          // Animated GPS ping wave
                          AnimatedBuilder(
                            animation: _pulseController,
                            builder: (context, child) {
                              return Transform.scale(
                                scale: _pulseScale.value,
                                child: Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppColors.primaryContainer.withValues(
                                      alpha: _pulseOpacity.value * 0.5,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                          // Center Navigation Arrow Pin
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.primaryContainer,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primaryContainer.withValues(alpha: 0.5),
                                  blurRadius: 12,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            alignment: Alignment.center,
                            child: Transform.rotate(
                              angle: -math.pi / 4,
                              child: const Icon(
                                Icons.navigation_rounded,
                                color: Colors.white,
                                size: 22,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      // Speed Badge Pill
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.4),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Text(
                          widget.courierSpeed,
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                            fontSize: 10.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // ── 3. Restoran Pini (Burger & Co.) ─────────────────────────
              Positioned(
                left: restaurantX,
                top: restaurantY,
                child: FractionalTranslation(
                  translation: const Offset(-0.5, -1.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerHigh,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.4),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.secondary,
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              widget.restaurantName,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.onSurface,
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                              ),
                            ),
                            const SizedBox(width: 5),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: AppColors.secondaryContainer,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'HAZIR',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.onSecondaryContainer,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 9,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 3),
                      // Pin icon
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.tertiaryContainer,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.3),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.storefront_rounded,
                          size: 18,
                          color: AppColors.onTertiaryContainer,
                        ),
                      ),
                      // Pin point line
                      Container(
                        width: 2,
                        height: 6,
                        color: AppColors.tertiaryContainer,
                      ),
                    ],
                  ),
                ),
              ),

              // ── 4. Hedef Müşteri Pini (Moda Cd. No:42) ──────────────────
              Positioned(
                left: customerX,
                top: customerY,
                child: FractionalTranslation(
                  translation: const Offset(-0.5, -1.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerHigh,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.4),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.location_on_rounded,
                              size: 14,
                              color: AppColors.secondary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              widget.destinationName,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.onSurface,
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 3),
                      // Pin icon
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.secondary,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.secondary.withValues(alpha: 0.4),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.flag_rounded,
                          size: 18,
                          color: AppColors.onSecondary,
                        ),
                      ),
                      // Pin point line
                      Container(
                        width: 2,
                        height: 6,
                        color: AppColors.secondary,
                      ),
                    ],
                  ),
                ),
              ),

              // ── 5. Yüzen Rota Rozeti ve Kontrol Butonları ────────────────
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: FloatingActionToolbar(
                  isTrafficActive: _isTrafficActive,
                  onCenterMap: widget.onCenterMap,
                  onToggleTraffic: () {
                    setState(() => _isTrafficActive = !_isTrafficActive);
                    widget.onToggleTraffic?.call();
                  },
                  onOpenExternalNav: widget.onOpenExternalNav,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Harita Arka Plan Izgarası, Yollar ve Rota Çizgisi Çizici
class _TacticalMapPainter extends CustomPainter {
  _TacticalMapPainter({
    required this.courierPoint,
    required this.restaurantPoint,
    required this.customerPoint,
    required this.showTraffic,
  });

  final Offset courierPoint;
  final Offset restaurantPoint;
  final Offset customerPoint;
  final bool showTraffic;

  @override
  void paint(Canvas canvas, Size size) {
    // ── Grid Lines ────────────────────────────────────────────────────────
    final gridPaint = Paint()
      ..color = const Color(0xFF1B273E).withValues(alpha: 0.5)
      ..strokeWidth = 0.6;

    const gridStep = 40.0;
    for (double x = 0; x < size.width; x += gridStep) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += gridStep) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    // ── Secondary Road Contours ───────────────────────────────────────────
    final roadPaint = Paint()
      ..color = const Color(0xFF1E2F4C)
      ..strokeWidth = 3.5
      ..style = PaintingStyle.stroke;

    final roadPath = Path()
      ..moveTo(0, size.height * 0.85)
      ..quadraticBezierTo(size.width * 0.4, size.height * 0.7, size.width, size.height * 0.5)
      ..moveTo(size.width * 0.1, 0)
      ..quadraticBezierTo(size.width * 0.35, size.height * 0.5, size.width * 0.7, size.height)
      ..moveTo(size.width * 0.3, size.height * 0.2)
      ..lineTo(size.width, size.height * 0.25);

    canvas.drawPath(roadPath, roadPaint);

    if (showTraffic) {
      final trafficFlowPaint = Paint()
        ..color = AppColors.secondary.withValues(alpha: 0.45)
        ..strokeWidth = 2.0
        ..style = PaintingStyle.stroke;

      final trafficPath = Path()
        ..moveTo(0, size.height * 0.85)
        ..quadraticBezierTo(size.width * 0.4, size.height * 0.7, size.width, size.height * 0.5);

      canvas.drawPath(trafficPath, trafficFlowPaint);
    }

    // ── Live Active Route (Courier -> Restaurant -> Customer) ─────────────
    final routePath = Path()
      ..moveTo(courierPoint.dx, courierPoint.dy)
      ..quadraticBezierTo(
        courierPoint.dx + (restaurantPoint.dx - courierPoint.dx) * 0.3,
        courierPoint.dy - (courierPoint.dy - restaurantPoint.dy) * 0.7,
        restaurantPoint.dx,
        restaurantPoint.dy,
      )
      ..quadraticBezierTo(
        restaurantPoint.dx + (customerPoint.dx - restaurantPoint.dx) * 0.5,
        customerPoint.dy + (restaurantPoint.dy - customerPoint.dy) * 0.2,
        customerPoint.dx,
        customerPoint.dy,
      );

    // Glow backing
    final glowPaint = Paint()
      ..color = AppColors.primaryContainer.withValues(alpha: 0.35)
      ..strokeWidth = 10.0
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(routePath, glowPaint);

    // Main orange line
    final routeMainPaint = Paint()
      ..color = AppColors.primaryContainer
      ..strokeWidth = 5.0
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(routePath, routeMainPaint);

    // Inner dashed line
    _drawDashedPath(
      canvas,
      routePath,
      Paint()
        ..color = AppColors.primaryFixed
        ..strokeWidth = 2.0
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke,
      dashLength: 7.0,
      gapLength: 5.0,
    );
  }

  void _drawDashedPath(
    Canvas canvas,
    Path source,
    Paint paint, {
    required double dashLength,
    required double gapLength,
  }) {
    for (final metric in source.computeMetrics()) {
      double distance = 0.0;
      while (distance < metric.length) {
        final currentDash = math.min(dashLength, metric.length - distance);
        final extractPath = metric.extractPath(distance, distance + currentDash);
        canvas.drawPath(extractPath, paint);
        distance += dashLength + gapLength;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _TacticalMapPainter oldDelegate) {
    return oldDelegate.courierPoint != courierPoint ||
        oldDelegate.restaurantPoint != restaurantPoint ||
        oldDelegate.customerPoint != customerPoint ||
        oldDelegate.showTraffic != showTraffic;
  }
}
