import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../../core/navigation/navigation_provider.dart';
import '../../features/location/providers/location_provider.dart';
import '../../features/orders/providers/order_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';
import '../widgets/custom_bottom_nav.dart';
import '../widgets/order_bottom_sheet.dart';
import '../widgets/osm_map_view.dart';
import '../widgets/signal_hud_bar.dart';
import 'package:url_launcher/url_launcher.dart';

/// Canlı Sipariş ve Harita Ekranı (ActiveOrderMapScreen)
/// Riverpod ile gerçek zamanlı SignalR GPS konumu ve OpenStreetMap haritasını birleştirir.
class ActiveOrderMapScreen extends ConsumerStatefulWidget {
  const ActiveOrderMapScreen({
    super.key,
    this.showBottomNav = true,
  });

  final bool showBottomNav;

  @override
  ConsumerState<ActiveOrderMapScreen> createState() => _ActiveOrderMapScreenState();
}

class _ActiveOrderMapScreenState extends ConsumerState<ActiveOrderMapScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);

    final orderState = ref.watch(orderProvider);
    final activeOrder = orderState.activeOrder;
    final locationState = ref.watch(locationProvider);

    // Sipariş alım ve teslim koordinatlarını oluştur
    LatLng? pickupLatLng;
    if (activeOrder != null && activeOrder.pickupLatitude != 0.0) {
      pickupLatLng = LatLng(activeOrder.pickupLatitude, activeOrder.pickupLongitude);
    }

    LatLng? deliveryLatLng;
    if (activeOrder != null && activeOrder.deliveryLatitude != 0.0) {
      deliveryLatLng = LatLng(activeOrder.deliveryLatitude, activeOrder.deliveryLongitude);
    }

    // Kurye GPS koordinatları (Sadece gerçek GPS fixi varsa kurye konumu oluştur)
    LatLng? courierLatLng;
    if (locationState.hasRealGpsFix && locationState.latitude != 0.0 && locationState.longitude != 0.0) {
      courierLatLng = LatLng(locationState.latitude, locationState.longitude);
    }

    final speedText = '${locationState.speedKmH.toStringAsFixed(0)} km/s';
    final restaurantName = activeOrder != null ? activeOrder.restaurantName : 'Alım Noktası';
    final destinationName = activeOrder != null
        ? (activeOrder.deliveryDistrict.isNotEmpty
            ? '${activeOrder.deliveryDistrict}, ${activeOrder.deliveryCity}'
            : activeOrder.deliveryAddressLine)
        : 'Teslimat Noktası';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // ── 1. Üst Başlık Çubuğu (Top App Header) ──────────────────────
            _buildTopAppBar(hasActiveOrder: activeOrder != null),

            // ── 2. SignalR & GPS Canlı HUD Barı ────────────────────────────
            SignalHudBar(
              status: locationState.signalRStatus,
              gpsAccuracyText: locationState.accuracy > 0
                  ? 'GPS: ±${locationState.accuracy.toStringAsFixed(0)}m Hassasiyet'
                  : 'GPS: ±2m Hassasiyet',
              onTap: () {
                ref.read(locationProvider.notifier).retrySignalR();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('SignalR sunucusuna yeniden bağlanılıyor...'),
                    duration: Duration(seconds: 2),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
            ),

            // ── 3. Scroll Edilebilir Harita ve Sipariş Detay Gövdesi ───────
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  children: [
                    // Gerçek OpenStreetMap Katmanı (flutter_map & latlong2)
                    OsmMapView(
                      pickupLatLng: pickupLatLng,
                      deliveryLatLng: deliveryLatLng,
                      courierLatLng: courierLatLng,
                      restaurantName: restaurantName,
                      destinationName: destinationName,
                      courierSpeed: speedText,
                      onCenterMap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Harita konumu ortalandı'),
                            duration: Duration(seconds: 1),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      },
                      onOpenExternalNav: () {
                        _showExternalNavDialog(context, deliveryLatLng, activeOrder?.deliveryAddressLine);
                      },
                    ),

                    // Çoklu Paket Seçim Çubuğu (Birden fazla paket varsa gösterilir)
                    if (orderState.orders.length > 1)
                      Container(
                        margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerHigh,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppColors.secondary.withValues(alpha: 0.35),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.25),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.layers_rounded, size: 16, color: AppColors.secondary),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Çoklu Teslimat (${orderState.orders.length} Paket)',
                                      style: AppTextStyles.caption.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.onSurface,
                                        fontSize: 11.5,
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  'Görüntülemek için dokunun',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.onSurfaceVariant,
                                    fontSize: 10.5,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              physics: const BouncingScrollPhysics(),
                              child: Row(
                                children: [
                                  for (int i = 0; i < orderState.orders.length; i++) ...[
                                    Builder(builder: (context) {
                                      final pkg = orderState.orders[i];
                                      final isSelected = activeOrder?.id == pkg.id;
                                      return InkWell(
                                        onTap: () {
                                          ref.read(orderProvider.notifier).selectActiveOrder(pkg);
                                        },
                                        borderRadius: BorderRadius.circular(10),
                                        child: AnimatedContainer(
                                          duration: const Duration(milliseconds: 200),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                                          decoration: BoxDecoration(
                                            color: isSelected
                                                ? AppColors.primaryContainer
                                                : AppColors.surfaceContainerLow,
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(
                                              color: isSelected
                                                  ? AppColors.secondary
                                                  : AppColors.surfaceBright.withValues(alpha: 0.4),
                                              width: isSelected ? 1.5 : 1,
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                isSelected ? Icons.check_circle_rounded : Icons.inventory_2_outlined,
                                                size: 14,
                                                color: isSelected ? Colors.white : AppColors.secondary,
                                              ),
                                              const SizedBox(width: 6),
                                              Text(
                                                'Paket ${i + 1}: ${pkg.shortCode}',
                                                style: AppTextStyles.caption.copyWith(
                                                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                                  color: isSelected ? Colors.white : AppColors.onSurface,
                                                  fontSize: 11.5,
                                                ),
                                              ),
                                              const SizedBox(width: 6),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                                decoration: BoxDecoration(
                                                  color: (isSelected ? Colors.white : AppColors.secondary).withValues(alpha: 0.18),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  pkg.estimatedEarnings,
                                                  style: AppTextStyles.caption.copyWith(
                                                    fontWeight: FontWeight.w800,
                                                    color: isSelected ? Colors.white : AppColors.secondary,
                                                    fontSize: 10.5,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      );
                                    }),
                                    if (i < orderState.orders.length - 1) const SizedBox(width: 8),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 8),

                    // Sipariş Detay Kartı (Bottom Sheet)
                    OrderBottomSheet(
                      order: activeOrder,
                      onRefresh: () => ref.read(orderProvider.notifier).fetchActiveOrders(),
                      onOrderStepChanged: (step) {
                        if (step == 5 || step == 3) {
                          ref.read(orderProvider.notifier).completeCurrentTask();
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: widget.showBottomNav
          ? CustomBottomNav(
              currentIndex: 1,
              onTap: (index) {
                ref.read(currentTabProvider.notifier).setTab(index);
              },
            )
          : null,
    );
  }

  Widget _buildTopAppBar({bool hasActiveOrder = true}) {
    return Container(
      height: 58,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow.withValues(alpha: 0.92),
        border: Border(
          bottom: BorderSide(
            color: AppColors.surfaceBright.withValues(alpha: 0.3),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Sol: Logo & Başlık
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryContainer.withValues(alpha: 0.4),
                      blurRadius: 8,
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.two_wheeler_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'KuryeSistemi',
                    style: AppTextStyles.headlineSm.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                      fontSize: 16,
                      letterSpacing: -0.2,
                    ),
                  ),
                  Text(
                    'Harita (OpenStreetMap)',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Sağ: Aktif Rozeti & Profil Avatarı
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHighest.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: (hasActiveOrder ? AppColors.secondary : AppColors.tertiary)
                        .withValues(alpha: 0.25),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: hasActiveOrder ? AppColors.secondary : AppColors.tertiary,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      hasActiveOrder ? 'AKTİF' : 'BEKLEMEDE',
                      style: AppTextStyles.caption.copyWith(
                        color: hasActiveOrder ? AppColors.secondary : AppColors.tertiary,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.surfaceBright,
                      border: Border.all(
                        color: AppColors.surfaceBright,
                        width: 1.5,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.person_rounded,
                      color: AppColors.onSurface,
                      size: 22,
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: AppColors.secondary,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.surface,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _launchGoogleMaps(double? lat, double? lng, String? address) async {
    Uri url;
    if (lat != null && lng != null && lat != 0 && lng != 0) {
      url = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving');
    } else if (address != null && address.trim().isNotEmpty) {
      url = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${Uri.encodeComponent(address.trim())}&travelmode=driving');
    } else {
      url = Uri.parse('https://www.google.com/maps');
    }

    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(url, mode: LaunchMode.platformDefault);
      }
    } catch (e) {
      debugPrint('Google Haritalar açılamadı: $e');
    }
  }

  Future<void> _launchYandexNavi(double? lat, double? lng) async {
    if (lat == null || lng == null || (lat == 0 && lng == 0)) {
      return;
    }
    final appUrl = Uri.parse('yandexnavi://build_route_on_map?lat_to=$lat&lon_to=$lng');
    final webUrl = Uri.parse('https://yandex.com/maps/?rtext=~$lat,$lng&rtt=auto');

    try {
      if (await canLaunchUrl(appUrl)) {
        await launchUrl(appUrl);
      } else {
        await launchUrl(webUrl, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('Yandex Haritalar açılamadı: $e');
    }
  }

  void _showExternalNavDialog(BuildContext context, LatLng? deliveryLatLng, String? deliveryAddress) {
    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: AppColors.surfaceContainerHigh,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: Text(
            'Navigasyon Başlatılsın mı?',
            style: AppTextStyles.headlineSm.copyWith(color: AppColors.onSurface),
          ),
          content: Text(
            'Harici navigasyon uygulamanızı seçiniz:',
            style: AppTextStyles.bodyMd.copyWith(color: AppColors.onSurfaceVariant),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                _launchGoogleMaps(
                  deliveryLatLng?.latitude,
                  deliveryLatLng?.longitude,
                  deliveryAddress,
                );
              },
              child: const Text(
                'Google Haritalar',
                style: TextStyle(color: AppColors.tertiary, fontWeight: FontWeight.bold),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryContainer,
                foregroundColor: AppColors.onPrimaryContainer,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                Navigator.of(dialogContext).pop();
                _launchYandexNavi(
                  deliveryLatLng?.latitude,
                  deliveryLatLng?.longitude,
                );
              },
              child: const Text('Yandex Navigasyon'),
            ),
          ],
        );
      },
    );
  }
}
