import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/orders/models/order_model.dart';
import '../../features/orders/providers/order_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';
import 'giant_action_button.dart';
import 'order_timeline_steps.dart';

/// Alt %40'lık kısmı kaplayan sipariş detay kartı (Order Bottom Sheet).
/// Eğer kuryenin üzerinde atanmış aktif sipariş varsa gerçek sipariş verilerini gösterir;
/// sipariş yoksa "Bekleniyor" durumunu gösterir.
class OrderBottomSheet extends ConsumerWidget {
  const OrderBottomSheet({
    super.key,
    this.order,
    this.onSupportTap,
    this.onReportProblemTap,
    this.onOrderStepChanged,
    this.onRefresh,
  });

  final OrderModel? order;
  final VoidCallback? onSupportTap;
  final VoidCallback? onReportProblemTap;
  final ValueChanged<int>? onOrderStepChanged;
  final VoidCallback? onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderState = ref.watch(orderProvider);
    final currentOrder = order ?? orderState.activeOrder;
    final isUpdating = orderState.isUpdatingStatus;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(28),
          topRight: Radius.circular(28),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.55),
            blurRadius: 28,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Drag Grab Handle ─────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            alignment: Alignment.center,
            child: Container(
              width: 48,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),

          // ── Content (Aktif Sipariş veya Bekleniyor Durumu) ───────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: currentOrder != null
                ? _buildActiveOrderContent(context, ref, currentOrder, isUpdating)
                : _buildWaitingState(context, ref),
          ),
        ],
      ),
    );
  }

  /// Aktif Görev Detay Görünümü
  Widget _buildActiveOrderContent(
    BuildContext context,
    WidgetRef ref,
    OrderModel currentOrder,
    bool isUpdating,
  ) {
    final paymentStatusText = currentOrder.status == OrderStatus.pickedUp
        ? 'Teslim Alındı (Yolda)'
        : 'Online Kredi Kartı (Ödendi)';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Sipariş Kodu & Ücret Özeti ─────────────────────────────
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainer,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppColors.surfaceBright.withValues(alpha: 0.3),
              width: 0.8,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Sipariş Kodu & Ödeme
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        currentOrder.shortCode,
                        style: AppTextStyles.headlineSm.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          currentOrder.orderType.toUpperCase(),
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.tertiary,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Durum: $paymentStatusText',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant.withValues(alpha: 0.85),
                      fontSize: 11.5,
                    ),
                  ),
                ],
              ),

              // Hakediş
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      currentOrder.estimatedEarnings,
                      style: AppTextStyles.headlineSm.copyWith(
                        color: AppColors.secondary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Net Hakediş',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.secondary,
                      fontWeight: FontWeight.w600,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // ── Aşamalar (Restoran & Müşteri Timeline) ─────────────────
        OrderTimelineSteps(
          restaurantName: currentOrder.restaurantName,
          restaurantAddress: currentOrder.fullPickupAddress,
          customerName: currentOrder.recipientName,
          customerAddress: currentOrder.fullDeliveryAddress,
          customerPhone: currentOrder.recipientPhone,
          customerNote: currentOrder.notes?.isNotEmpty == true
              ? currentOrder.notes!
              : 'Özel teslimat notu bulunmuyor.',
          orderItemsSummary: currentOrder.notes?.isNotEmpty == true
              ? currentOrder.notes!
              : 'Standart Teslimat Paketi',
          itemCountText: 'Aktif Paket',
          onCallRestaurant: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('${currentOrder.restaurantName} aranıyor...')),
            );
          },
          onNavigateRestaurant: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('${currentOrder.restaurantName} için rota çiziliyor...')),
            );
          },
          onCallCustomer: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  '${currentOrder.recipientName} (${currentOrder.recipientPhone}) aranıyor...',
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 14),

        // ── Devasa Operasyon Butonu ────────────────────────────────
        GiantActionButton(
          status: currentOrder.status,
          isLoading: isUpdating,
          onPressed: isUpdating
              ? null
              : () => _handleStatusChange(context, ref, currentOrder),
        ),
        const SizedBox(height: 10),

        // ── Canlı Destek & Sorun Bildir Barı ───────────────────────
        Row(
          children: [
            Expanded(
              child: _SupportButton(
                icon: Icons.support_agent_rounded,
                label: 'Canlı Destek',
                textColor: AppColors.onSurfaceVariant,
                iconColor: AppColors.tertiary,
                onTap: onSupportTap ??
                    () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Canlı Destek Merkezi açılıyor...')),
                      );
                    },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _SupportButton(
                icon: Icons.report_problem_rounded,
                label: 'Sorun Bildir',
                textColor: AppColors.error,
                iconColor: AppColors.error,
                onTap: onReportProblemTap ??
                    () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Sorun bildirimi formu açılıyor...'),
                          backgroundColor: AppColors.errorContainer,
                        ),
                      );
                    },
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  /// Sipariş Durum Güncelleme İşleyicisi
  Future<void> _handleStatusChange(
    BuildContext context,
    WidgetRef ref,
    OrderModel currentOrder,
  ) async {
    // Assigned (3) veya Ready/Pending ise PickedUp (4 - Yolda); PickedUp (4) ise Delivered (5 - Teslim Edildi)
    final int newStatus = (currentOrder.status == OrderStatus.pickedUp) ? 5 : 4;

    final success = await ref.read(orderProvider.notifier).changeOrderStatus(newStatus);

    if (context.mounted) {
      if (success) {
        onOrderStepChanged?.call(newStatus);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Colors.white),
                SizedBox(width: 10),
                Text(
                  'Durum güncellendi',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF137547), // Canlı Yeşil / Success Green
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            duration: const Duration(seconds: 3),
          ),
        );
      } else {
        final errorMsg = ref.read(orderProvider).errorMessage ?? 'İşlem gerçekleştirilemedi.';
        final isWarning = errorMsg.toLowerCase().contains('mesai');

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(
                  isWarning ? Icons.access_time_filled_rounded : Icons.error_outline_rounded,
                  color: Colors.white,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (isWarning)
                        const Text(
                          'Mesai Gerekli',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      Text(
                        errorMsg,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: isWarning ? 0.95 : 1.0),
                          fontWeight: isWarning ? FontWeight.w500 : FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            backgroundColor: isWarning ? const Color(0xFFD97706) : const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
            elevation: 4,
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  /// Sipariş Yokken Gösterilecek "Bekleniyor" Durumu
  Widget _buildWaitingState(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // İkon & Nabız Efekti
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHigh,
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.surfaceBright.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            alignment: Alignment.center,
            child: Icon(
              Icons.hourglass_top_rounded,
              size: 28,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),

          // Başlık
          Text(
            'Aktif Görev Bekleniyor',
            style: AppTextStyles.headlineSm.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 6),

          // Açıklama
          Text(
            'Şu an üzerinize atanmış teslimat bulunmuyor. Yeni bir sipariş atandığında rota ve müşteri detayları otomatik olarak buraya yansıtılacaktır.',
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMd.copyWith(
              color: AppColors.onSurfaceVariant,
              fontSize: 12.5,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 18),

          // Siparişleri Yenile Butonu
          SizedBox(
            width: double.infinity,
            height: 46,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: BorderSide(
                  color: AppColors.primary.withValues(alpha: 0.35),
                  width: 1,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: onRefresh ?? () => ref.read(orderProvider.notifier).fetchActiveOrders(),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: Text(
                'Siparişleri Kontrol Et',
                style: AppTextStyles.bodyMd.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}

class _SupportButton extends StatelessWidget {
  const _SupportButton({
    required this.icon,
    required this.label,
    required this.textColor,
    required this.iconColor,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final Color textColor;
  final Color iconColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          height: 44,
          decoration: BoxDecoration(
            color: AppColors.surfaceContainer,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.surfaceBright.withValues(alpha: 0.3),
              width: 0.8,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: iconColor),
              const SizedBox(width: 6),
              Text(
                label,
                style: AppTextStyles.caption.copyWith(
                  color: textColor,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
