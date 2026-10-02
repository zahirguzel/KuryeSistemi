import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Gerçek OpenStreetMap (OSM) Harita Bileşeni
/// flutter_map ve latlong2 ile canlı kurye, alım (pickup) ve teslim (delivery) pini sunar.
class OsmMapView extends StatefulWidget {
  const OsmMapView({
    super.key,
    this.pickupLatLng,
    this.deliveryLatLng,
    this.courierLatLng,
    this.restaurantName = 'İskenderun Dürüm Evi',
    this.destinationName = 'Hedef Adres',
    this.courierSpeed = '0 km/s',
    this.onCenterMap,
    this.onOpenExternalNav,
  });

  final LatLng? pickupLatLng;
  final LatLng? deliveryLatLng;
  final LatLng? courierLatLng;
  final String restaurantName;
  final String destinationName;
  final String courierSpeed;
  final VoidCallback? onCenterMap;
  final VoidCallback? onOpenExternalNav;

  @override
  State<OsmMapView> createState() => _OsmMapViewState();
}

class _OsmMapViewState extends State<OsmMapView> {
  final MapController _mapController = MapController();

  // Varsayılan koordinat (İskenderun / Türkiye)
  static const LatLng _defaultCenter = LatLng(36.5872, 36.1735);

  LatLng get _resolvedCenter {
    if (widget.courierLatLng != null) return widget.courierLatLng!;
    if (widget.pickupLatLng != null) return widget.pickupLatLng!;
    if (widget.deliveryLatLng != null) return widget.deliveryLatLng!;
    return _defaultCenter;
  }

  @override
  void didUpdateWidget(covariant OsmMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    final oldCenter = oldWidget.courierLatLng ?? oldWidget.pickupLatLng ?? oldWidget.deliveryLatLng;
    final newCenter = widget.courierLatLng ?? widget.pickupLatLng ?? widget.deliveryLatLng;
    if (newCenter != null && (oldCenter == null || oldCenter.latitude != newCenter.latitude || oldCenter.longitude != newCenter.longitude)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _mapController.move(newCenter, 15.0);
        }
      });
    }
  }

  void _recenter() {
    _mapController.move(_resolvedCenter, 14.8);
    widget.onCenterMap?.call();
  }

  void _zoomIn() {
    _mapController.move(
      _mapController.camera.center,
      _mapController.camera.zoom + 1,
    );
  }

  void _zoomOut() {
    _mapController.move(
      _mapController.camera.center,
      _mapController.camera.zoom - 1,
    );
  }

  @override
  Widget build(BuildContext context) {
    final markers = <Marker>[];
    final polylinePoints = <LatLng>[];

    // 1. Kurye Konumu Pini
    if (widget.courierLatLng != null) {
      polylinePoints.add(widget.courierLatLng!);
      markers.add(
        Marker(
          point: widget.courierLatLng!,
          width: 70,
          height: 70,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.35),
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: Text(
                  widget.courierSpeed,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 3),
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.5),
                      blurRadius: 10,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.two_wheeler_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // 2. Alım (Pickup / Restoran) Pini
    if (widget.pickupLatLng != null) {
      polylinePoints.add(widget.pickupLatLng!);
      markers.add(
        Marker(
          point: widget.pickupLatLng!,
          width: 100,
          height: 65,
          child: _buildPinBadge(
            title: widget.restaurantName,
            subtitle: 'Alım Noktası',
            icon: Icons.storefront_rounded,
            badgeColor: const Color(0xFFD97706), // Amber
          ),
        ),
      );
    }

    // 3. Teslimat (Delivery / Müşteri) Pini
    if (widget.deliveryLatLng != null) {
      polylinePoints.add(widget.deliveryLatLng!);
      markers.add(
        Marker(
          point: widget.deliveryLatLng!,
          width: 100,
          height: 65,
          child: _buildPinBadge(
            title: widget.destinationName,
            subtitle: 'Teslim Noktası',
            icon: Icons.location_on_rounded,
            badgeColor: const Color(0xFF059669), // Yeşil
          ),
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final h = constraints.maxHeight.isFinite && constraints.maxHeight > 300
            ? constraints.maxHeight
            : 390.0;

        return SizedBox(
          width: w,
          height: h,
          child: Stack(
            children: [
              // ── 1. OpenStreetMap Tile ve Harita Gövdesi ─────────────────
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: _resolvedCenter,
                  initialZoom: 14.5,
                  minZoom: 4.0,
                  maxZoom: 19.0,
                  interactionOptions: const InteractionOptions(
                    flags: InteractiveFlag.all,
                  ),
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.kuryesistemi.app',
                  ),
                  if (polylinePoints.length >= 2)
                    PolylineLayer(
                      polylines: [
                        Polyline(
                          points: polylinePoints,
                          strokeWidth: 4.5,
                          color: const Color(0xFF2563EB).withValues(alpha: 0.85),
                        ),
                      ],
                    ),
                  MarkerLayer(markers: markers),
                ],
              ),

              // ── 2. Üst Karartma / Durum Gradyanı ─────────────────────────
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: IgnorePointer(
                  child: Container(
                    height: 50,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.4),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // ── 3. Sağ Taktiksel Araç Çubuğu (Toolbar) ───────────────────
              Positioned(
                right: 12,
                top: 14,
                child: Column(
                  children: [
                    _buildMapIconButton(
                      icon: Icons.my_location_rounded,
                      tooltip: 'Merkeze Hizala',
                      onPressed: _recenter,
                    ),
                    const SizedBox(height: 8),
                    _buildMapIconButton(
                      icon: Icons.add_rounded,
                      tooltip: 'Yakınlaştır',
                      onPressed: _zoomIn,
                    ),
                    const SizedBox(height: 8),
                    _buildMapIconButton(
                      icon: Icons.remove_rounded,
                      tooltip: 'Uzaklaştır',
                      onPressed: _zoomOut,
                    ),
                    if (widget.onOpenExternalNav != null) ...[
                      const SizedBox(height: 8),
                      _buildMapIconButton(
                        icon: Icons.navigation_rounded,
                        tooltip: 'Navigasyonda Aç',
                        iconColor: AppColors.primaryContainer,
                        onPressed: widget.onOpenExternalNav,
                      ),
                    ],
                  ],
                ),
              ),

              // ── 4. Sol Alt Açık Harita Rozeti ────────────────────────────
              Positioned(
                left: 12,
                bottom: 24,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerLowest.withValues(alpha: 0.88),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppColors.surfaceBright.withValues(alpha: 0.3),
                      width: 0.5,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.map_outlined,
                        size: 13,
                        color: AppColors.secondary,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'OpenStreetMap Live',
                        style: AppTextStyles.caption.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMapIconButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback? onPressed,
    Color? iconColor,
  }) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.3),
          width: 0.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: IconButton(
          icon: Icon(icon, size: 20, color: iconColor ?? AppColors.onSurface),
          tooltip: tooltip,
          padding: EdgeInsets.zero,
          onPressed: onPressed,
        ),
      ),
    );
  }

  Widget _buildPinBadge({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color badgeColor,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerLowest.withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: badgeColor, width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.4),
                blurRadius: 4,
              ),
            ],
          ),
          child: Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(height: 1),
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: badgeColor,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [
              BoxShadow(
                color: badgeColor.withValues(alpha: 0.5),
                blurRadius: 6,
                spreadRadius: 1,
              ),
            ],
          ),
          child: Icon(icon, color: Colors.white, size: 18),
        ),
      ],
    );
  }
}
