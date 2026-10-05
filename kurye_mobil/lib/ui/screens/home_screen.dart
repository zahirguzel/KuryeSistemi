import '../../features/settings/providers/settings_provider.dart';
import '../widgets/daily_goal_sheet.dart';
import '../widgets/sos_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/navigation/navigation_provider.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/orders/providers/order_provider.dart';
import '../../features/shift/providers/shift_provider.dart';
import '../../features/wallet/providers/wallet_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';
import '../widgets/active_task_card.dart';
import '../widgets/courier_header_card.dart';
import '../widgets/custom_bottom_nav.dart';
import '../widgets/kpi_grid_cards.dart';
import '../widgets/quick_actions_strip.dart';
import '../widgets/radar_scanner_view.dart';
import '../widgets/swipe_shift_toggle.dart';

/// Kurye Ana Kokpit Ekranı (HomeScreen)
/// AutomaticKeepAliveClientMixin ile sekmeler arası geçişte widget durumu bellekte korunur.
/// Mesai durumu shiftProvider üzerinden yönetilerek sayfa değişimlerinde sıfırlanmaz.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({
    super.key,
    this.showBottomNav = true,
  });

  final bool showBottomNav;

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);

    final orderState = ref.watch(orderProvider);
    final shiftState = ref.watch(shiftProvider);
    final currentTabIndex = ref.watch(currentTabProvider);
    final walletState = ref.watch(walletProvider);
    final authState = ref.watch(authProvider);

    ref.listen<ShiftState>(shiftProvider, (previous, next) {
      if (next.errorMessage != null && next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.errorMessage!),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    });

    final courierDisplayName = (walletState.earnings?.courierName.isNotEmpty ?? false)
        ? walletState.earnings!.courierName
        : (authState.authResponse?.email.split('@').first ?? 'Ahmet');

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: AppColors.primaryContainer,
          backgroundColor: AppColors.surfaceContainerHigh,
          onRefresh: () async {
            await Future.wait([
              ref.read(orderProvider.notifier).fetchActiveOrders(),
              ref.read(walletProvider.notifier).fetchTodayEarnings(isRefresh: true),
            ]);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 12,
              bottom: widget.showBottomNav ? 96 : 24,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── 1. Üst Bilgi Kartı (Header) ──────────────────────────────
                CourierHeaderCard(
                  courierName: courierDisplayName,
                  rank: 'Kıdemli Kurye',
                  rating: '4.98',
                ),
                const SizedBox(height: 16),

                // ── 2. Mesai Kaydırma Çubuğu (Shift Toggle) ─────────────────
                SwipeShiftToggle(
                  isShiftActive: shiftState.isActive,
                  onShiftChanged: (active) {
                    ref.read(shiftProvider.notifier).toggleShift(active);
                  },
                ),
                const SizedBox(height: 16),

                // ── 3. KPI İstatistik Kartları ───────────────────────────────
                KpiGridCards(
                  todayEarnings: '₺${walletState.totalEarnings.truncate()}',
                  earningsCents: ',${((walletState.totalEarnings - walletState.totalEarnings.truncate()) * 100).toInt().toString().padLeft(2, '0')}',
                  earningsGrowth: walletState.deliveredCount > 0 ? 'Bugünkü hakediş' : 'Henüz teslimat yok',
                  packageCount: '${walletState.deliveredCount} Paket',
                  avgPerPackage: '₺${walletState.averagePerPackage.toStringAsFixed(1)}/ort',
                  completedCount: walletState.deliveredCount,
                  targetCount: ref.watch(dailyGoalProvider),
                  onGoalTap: () => showDailyGoalSheet(context),
                ),
                const SizedBox(height: 16),

                // ── 4. Aktif Görev Kartları veya Radar Tarama Alanı ──────────
                if (orderState.orders.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.secondary,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'GÖREV LİSTESİ (${orderState.orders.length} Paket)',
                              style: AppTextStyles.caption.copyWith(
                                fontWeight: FontWeight.w800,
                                color: AppColors.onSurfaceVariant,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          'Toplam: ₺${orderState.orders.fold<double>(0, (sum, o) => sum + o.courierEarning).toStringAsFixed(2).replaceAll('.', ',')}',
                          style: AppTextStyles.caption.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.secondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (int i = 0; i < orderState.orders.length; i++) ...[
                    ActiveTaskCard(
                      order: orderState.orders[i],
                      onOpenMap: () {
                        ref.read(orderProvider.notifier).selectActiveOrder(orderState.orders[i]);
                        ref.read(currentTabProvider.notifier).setTab(1);
                      },
                    ),
                    if (i < orderState.orders.length - 1) const SizedBox(height: 14),
                  ],
                ] else
                  RadarScannerView(
                    title: shiftState.isActive
                        ? 'Yeni Siparişler Taranıyor...'
                        : 'Sistem Beklemede',
                    subtitle: shiftState.isActive
                        ? 'Bölgenizdeki restoranlar aktif. Yakınınızda sipariş düştüğünde sesli ve titreşimli bildirim alacaksınız.'
                        : 'Sipariş almaya başlamak için yukarıdaki butondan mesainizi başlatın.',
                    zoneText: 'İskenderun / Merkez Sektörü - Canlı',
                    isScanning: shiftState.isActive,
                  ),
                const SizedBox(height: 16),

                // ── 5. Eldiven Dostu Hızlı Eylemler Çubuğu ────────────────────
                QuickActionsStrip(
                  isOnBreak: shiftState.isOnBreak,
                  onTakeBreak: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    final goingOnBreak = !shiftState.isOnBreak;
                    final error = await ref.read(shiftProvider.notifier).toggleBreak(goingOnBreak);
                    messenger.showSnackBar(
                      SnackBar(
                        content: Text(error ?? (goingOnBreak
                            ? 'Moladasınız. Yeni sipariş atanmayacak.'
                            : 'Moladan döndünüz. Yeni siparişler için müsaitsiniz.')),
                        backgroundColor: error != null ? AppColors.errorContainer : null,
                      ),
                    );
                  },
                  onOpenSurgeMap: () {
                    ref.read(currentTabProvider.notifier).setTab(1);
                  },
                  onEmergencySupport: () => showSosDialog(context),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: widget.showBottomNav
          ? CustomBottomNav(
              currentIndex: currentTabIndex,
              onTap: (index) {
                ref.read(currentTabProvider.notifier).setTab(index);
              },
            )
          : null,
    );
  }
}
