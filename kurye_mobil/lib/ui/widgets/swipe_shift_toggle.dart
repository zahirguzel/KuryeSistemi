import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Mesai Kaydırma Çubuğu — "Mesaiyi Başlat / Mesaiyi Bitir" swipe mekanizması.
///
/// HTML mantığı birebir canlandırılmıştır:
///  - Sol→Sağ sürükleme: Mesaiye giriş (secondary yeşil fill)
///  - Sağ→Sol sürükleme: Mesaiden çıkış (error kırmızı fill)
///  - %65 eşiği geçince state değişir, animasyonla kilitlenir
class SwipeShiftToggle extends StatefulWidget {
  const SwipeShiftToggle({
    super.key,
    this.isShiftActive = false,
    this.onShiftChanged,
  });

  final bool isShiftActive;
  final ValueChanged<bool>? onShiftChanged;

  @override
  State<SwipeShiftToggle> createState() => _SwipeShiftToggleState();
}

class _SwipeShiftToggleState extends State<SwipeShiftToggle>
    with SingleTickerProviderStateMixin {
  late bool _isShiftActive;
  double _dragOffset = 0;
  bool _isDragging = false;

  // Track size — filled at layout time
  double _trackWidth = 0;

  static const double _handleSize = 56.0;
  static const double _trackPad = 4.0;

  double get _maxDrag => _trackWidth - _handleSize - _trackPad * 2;

  @override
  void initState() {
    super.initState();
    _isShiftActive = widget.isShiftActive;
  }

  @override
  void didUpdateWidget(SwipeShiftToggle oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.isShiftActive != widget.isShiftActive) {
      setState(() {
        _isShiftActive = widget.isShiftActive;
        _dragOffset = _isShiftActive ? _maxDrag : 0;
      });
    }
  }

  void _setShiftState(bool active) {
    setState(() {
      _isShiftActive = active;
      _dragOffset = active ? _maxDrag : 0;
      _isDragging = false;
    });
    widget.onShiftChanged?.call(active);
  }

  void _onDragStart(double localX) {
    setState(() {
      _isDragging = true;
    });
  }

  void _onDragUpdate(double dx) {
    if (!_isDragging || _trackWidth == 0) return;
    setState(() {
      if (!_isShiftActive) {
        _dragOffset = (_dragOffset + dx).clamp(0, _maxDrag);
      } else {
        _dragOffset = (_dragOffset + dx).clamp(0, _maxDrag);
      }
    });
  }

  void _onDragEnd() {
    if (!_isDragging) return;
    if (!_isShiftActive) {
      if (_dragOffset > _maxDrag * 0.65) {
        _setShiftState(true);
      } else {
        setState(() {
          _dragOffset = 0;
          _isDragging = false;
        });
      }
    } else {
      if (_dragOffset < _maxDrag * 0.35) {
        _setShiftState(false);
      } else {
        setState(() {
          _dragOffset = _maxDrag;
          _isDragging = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor =
        _isShiftActive ? AppColors.secondary : AppColors.error;
    final fillColor = _isShiftActive
        ? AppColors.error.withValues(alpha: 0.3)
        : AppColors.secondary;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // ── Status row ─────────────────────────────────────────────────
          Row(
            children: [
              // Pulsing status dot
              _PulsingStatusDot(color: statusColor),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isShiftActive
                          ? 'MESAİDE • SİPARİŞE AÇIK'
                          : 'MESAİ DIŞI • DİNLENME MODU',
                      style: AppTextStyles.labelStatus.copyWith(
                        color: _isShiftActive
                            ? AppColors.secondary
                            : AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      _isShiftActive
                          ? 'Rota optimizasyonu devrede, havuz taranıyor'
                          : 'Sipariş havuzuna bağlanmak için butonu kaydırın',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.moped_outlined,
                color: AppColors.outline,
                size: 28,
              ),
            ],
          ),
          const SizedBox(height: 16),
          // ── Swipe track ────────────────────────────────────────────────
          LayoutBuilder(
            builder: (context, constraints) {
              _trackWidth = constraints.maxWidth;
              if (_isShiftActive && !_isDragging && _dragOffset == 0) {
                _dragOffset = _maxDrag;
              }
              return GestureDetector(
                onHorizontalDragStart: (d) => _onDragStart(d.localPosition.dx),
                onHorizontalDragUpdate: (d) => _onDragUpdate(d.delta.dx),
                onHorizontalDragEnd: (_) => _onDragEnd(),
                child: Container(
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerLowest,
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Stack(
                    children: [
                      // ── Fill bar ──────────────────────────────────────
                      AnimatedContainer(
                        duration: _isDragging
                            ? Duration.zero
                            : const Duration(milliseconds: 300),
                        curve: Curves.easeOut,
                        width: _isShiftActive
                            ? (_isDragging
                                ? (_dragOffset + _handleSize + _trackPad)
                                    .clamp(0, _trackWidth)
                                : _trackWidth)
                            : (_isDragging
                                ? (_dragOffset + _handleSize + _trackPad)
                                    .clamp(_handleSize, _trackWidth)
                                : _handleSize + _trackPad),
                        height: 64,
                        decoration: BoxDecoration(
                          color: fillColor,
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                      // ── Center label ──────────────────────────────────
                      Center(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _isShiftActive ? 'MESAİYİ BİTİR' : 'MESAİYİ BAŞLAT',
                              style: AppTextStyles.labelAction.copyWith(
                                color: AppColors.onSurface.withValues(alpha: 0.8),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(
                              _isShiftActive
                                  ? Icons.stop_circle_outlined
                                  : Icons.keyboard_double_arrow_right,
                              color: _isShiftActive
                                  ? AppColors.error
                                  : AppColors.secondary,
                              size: 22,
                            ),
                          ],
                        ),
                      ),
                      // ── Handle ────────────────────────────────────────
                      AnimatedPositioned(
                        duration: _isDragging
                            ? Duration.zero
                            : const Duration(milliseconds: 300),
                        curve: Curves.easeOut,
                        left: _trackPad + (_isDragging
                            ? _dragOffset.clamp(0, _maxDrag)
                            : (_isShiftActive ? _maxDrag : 0)),
                        top: _trackPad,
                        child: Container(
                          width: _handleSize,
                          height: _handleSize,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceBright,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            Icons.power_settings_new,
                            color: _isShiftActive
                                ? AppColors.error
                                : AppColors.secondary,
                            size: 28,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

// ── Pulsing status dot (animate-pulse) ────────────────────────────────────────
class _PulsingStatusDot extends StatefulWidget {
  const _PulsingStatusDot({required this.color});
  final Color color;

  @override
  State<_PulsingStatusDot> createState() => _PulsingStatusDotState();
}

class _PulsingStatusDotState extends State<_PulsingStatusDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.4, end: 1.0)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Opacity(
        opacity: _anim.value,
        child: Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: widget.color,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }
}
