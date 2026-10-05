import 'package:flutter/material.dart';
import '../../core/realtime/signalr_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Ekranın en üstündeki "SignalR: Canlı Bağlı" ve "GPS: ±2m" bildirim çubuğu (ping animasyonu ile birlikte).
/// HTML: div.px-margin-screen.py-inset-xs.flex.items-center.justify-between.bg-surface-container-lowest
class SignalHudBar extends StatefulWidget {
  const SignalHudBar({
    super.key,
    this.status = SignalRConnectionStatus.connected,
    this.signalStatusText,
    this.gpsAccuracyText = 'GPS: ±2m Hassasiyet',
    this.statusColor,
    this.onTap,
  });

  final SignalRConnectionStatus status;
  final String? signalStatusText;
  final String gpsAccuracyText;
  final Color? statusColor;
  final VoidCallback? onTap;

  @override
  State<SignalHudBar> createState() => _SignalHudBarState();
}

class _SignalHudBarState extends State<SignalHudBar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseScale;
  late final Animation<double> _pulseOpacity;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();

    _pulseScale = Tween<double>(begin: 1.0, end: 2.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOutQuad),
    );

    _pulseOpacity = Tween<double>(begin: 0.8, end: 0.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOutQuad),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Color get _resolvedColor {
    if (widget.statusColor != null) return widget.statusColor!;
    switch (widget.status) {
      case SignalRConnectionStatus.connected:
        return AppColors.secondary;
      case SignalRConnectionStatus.connecting:
      case SignalRConnectionStatus.reconnecting:
        return AppColors.primaryContainer;
      case SignalRConnectionStatus.disconnected:
        return AppColors.error;
    }
  }

  String get _resolvedText {
    if (widget.signalStatusText != null) return widget.signalStatusText!;
    switch (widget.status) {
      case SignalRConnectionStatus.connected:
        return 'SIGNALR: CANLI BAĞLI';
      case SignalRConnectionStatus.connecting:
        return 'SIGNALR: BAĞLANIYOR...';
      case SignalRConnectionStatus.reconnecting:
        return 'SIGNALR: YENİDEN BAĞLANIYOR...';
      case SignalRConnectionStatus.disconnected:
        return 'SIGNALR: BAĞLANTI KOPTU';
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentColor = _resolvedColor;
    final currentText = _resolvedText;

    return GestureDetector(
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        color: AppColors.surfaceContainerLowest,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
          // ── SignalR Bağlantı Durumu ─────────────────────────────────────
          Row(
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return Transform.scale(
                        scale: _pulseScale.value,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: currentColor.withValues(
                              alpha: _pulseOpacity.value,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: currentColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 8),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 300),
                style: AppTextStyles.caption.copyWith(
                  color: currentColor,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  fontSize: 11,
                ),
                child: Text(currentText),
              ),
            ],
          ),

          // ── GPS Hassasiyeti ─────────────────────────────────────────────
          Row(
            children: [
              Icon(
                Icons.satellite_alt_rounded,
                size: 15,
                color: AppColors.tertiary,
              ),
              const SizedBox(width: 5),
              Text(
                widget.gpsAccuracyText,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.onSurfaceVariant.withValues(alpha: 0.85),
                  fontWeight: FontWeight.w500,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
}
