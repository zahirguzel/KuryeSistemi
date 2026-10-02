import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../features/orders/models/order_model.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Operasyonel devasa aksiyon butonu (Giant Action Button).
/// Siparişin durumuna göre (Assigned -> "Paketi Teslim Aldım", PickedUp -> "Teslim Edildi")
/// renk, metin ve ikon değiştirir. İşlem sürerken spinner gösterir ve tıklamaları kilitler.
class GiantActionButton extends StatefulWidget {
  const GiantActionButton({
    super.key,
    this.status = OrderStatus.assigned,
    this.isLoading = false,
    this.onPressed,
    this.initialStep,
    this.onStepChanged,
  });

  final OrderStatus status;
  final bool isLoading;
  final VoidCallback? onPressed;

  // Geriye dönük uyumluluk için opsiyonel step parametreleri
  final int? initialStep;
  final ValueChanged<int>? onStepChanged;

  @override
  State<GiantActionButton> createState() => _GiantActionButtonState();
}

class _GiantActionButtonState extends State<GiantActionButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.0, end: 6.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _handleTap() {
    if (widget.isLoading) return;
    HapticFeedback.mediumImpact();

    if (widget.onPressed != null) {
      widget.onPressed!();
    } else if (widget.onStepChanged != null) {
      final nextStep = (widget.initialStep ?? 1) + 1;
      widget.onStepChanged!(nextStep);
    }
  }

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color textColor;
    Color iconContainerColor;
    IconData leadingIcon;
    String title;
    String subtitle;
    Widget trailingWidget;

    final isAssigned = widget.status == OrderStatus.assigned;
    final isPickedUp = widget.status == OrderStatus.pickedUp;
    final isDelivered = widget.status == OrderStatus.delivered;

    if (widget.isLoading) {
      // Yüklenme (Spinner) Durumu
      backgroundColor = isPickedUp ? AppColors.secondary : AppColors.primaryContainer;
      textColor = isPickedUp ? AppColors.onSecondary : AppColors.onPrimaryContainer;
      iconContainerColor = Colors.black.withValues(alpha: 0.2);
      leadingIcon = isPickedUp ? Icons.local_shipping_rounded : Icons.inventory_2_rounded;
      title = isPickedUp ? 'Teslim Ediliyor...' : 'Paket Alınıyor...';
      subtitle = 'Sunucuya durum iletiliyor...';

      trailingWidget = SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          valueColor: AlwaysStoppedAnimation<Color>(textColor),
        ),
      );
    } else if (isAssigned) {
      // Aşama 1: Paketi Teslim Aldım
      backgroundColor = AppColors.primaryContainer;
      textColor = AppColors.onPrimaryContainer;
      iconContainerColor = Colors.black.withValues(alpha: 0.2);
      leadingIcon = Icons.inventory_2_rounded;
      title = 'Paketi Teslim Aldım';
      subtitle = 'İşletmeden yola çıkış yap';
      trailingWidget = AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) {
          return Transform.translate(
            offset: Offset(_pulseAnimation.value, 0),
            child: Icon(
              Icons.keyboard_double_arrow_right_rounded,
              color: textColor,
              size: 28,
            ),
          );
        },
      );
    } else if (isPickedUp) {
      // Aşama 2: Teslim Edildi
      backgroundColor = AppColors.secondary;
      textColor = AppColors.onSecondary;
      iconContainerColor = AppColors.onSecondary.withValues(alpha: 0.15);
      leadingIcon = Icons.check_circle_outline_rounded;
      title = 'Teslim Edildi';
      subtitle = 'Müşteriye teslim et ve görevi tamamla';
      trailingWidget = Icon(
        Icons.check_rounded,
        color: textColor,
        size: 28,
      );
    } else if (isDelivered) {
      // Tamamlandı
      backgroundColor = AppColors.surfaceContainerHigh;
      textColor = AppColors.secondary;
      iconContainerColor = AppColors.secondary.withValues(alpha: 0.15);
      leadingIcon = Icons.check_circle_rounded;
      title = 'TESLİMAT TAMAMLANDI ✓';
      subtitle = 'Yeni sipariş aranıyor...';
      trailingWidget = const Icon(
        Icons.done_all_rounded,
        color: AppColors.secondary,
        size: 24,
      );
    } else {
      // Varsayılan / Beklemede
      backgroundColor = AppColors.primaryContainer;
      textColor = AppColors.onPrimaryContainer;
      iconContainerColor = Colors.black.withValues(alpha: 0.2);
      leadingIcon = Icons.inventory_2_rounded;
      title = 'Paketi Teslim Aldım';
      subtitle = 'İşletmeden yola çıkış yap';
      trailingWidget = Icon(
        Icons.keyboard_double_arrow_right_rounded,
        color: textColor,
        size: 28,
      );
    }

    final isClickable = !widget.isLoading && !isDelivered;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      height: 64,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: isAssigned
                ? AppColors.primaryContainer.withValues(alpha: widget.isLoading ? 0.2 : 0.35)
                : isPickedUp
                    ? AppColors.secondary.withValues(alpha: widget.isLoading ? 0.2 : 0.35)
                    : Colors.black.withValues(alpha: 0.2),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isClickable ? _handleTap : null,
          borderRadius: BorderRadius.circular(16),
          splashColor: Colors.white.withValues(alpha: 0.15),
          highlightColor: Colors.transparent,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                // Leading Icon Box
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: iconContainerColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: Icon(leadingIcon, color: textColor, size: 24),
                ),
                const SizedBox(width: 12),

                // Text Labels
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.labelAction.copyWith(
                          color: textColor,
                          fontWeight: FontWeight.w800,
                          fontSize: 15.5,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.caption.copyWith(
                          color: textColor.withValues(alpha: 0.9),
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ),
                ),

                // Trailing Action / Spinner Widget
                trailingWidget,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
