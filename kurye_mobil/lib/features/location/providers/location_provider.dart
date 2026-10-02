import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/realtime/signalr_service.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../services/location_service.dart';

/// Canlı Konum ve Takip Durumu Modeli (LocationState)
class LocationState {
  const LocationState({
    this.latitude = 36.5872, // İskenderun başlangıç koordinatı
    this.longitude = 36.1735,
    this.speedKmH = 0.0,
    this.heading = 0.0,
    this.accuracy = 0.0,
    this.isTracking = false,
    this.hasRealGpsFix = false,
    this.signalRStatus = SignalRConnectionStatus.disconnected,
    this.errorMessage,
  });

  final double latitude;
  final double longitude;
  final double speedKmH;
  final double heading;
  final double accuracy;
  final bool isTracking;
  final bool hasRealGpsFix;
  final SignalRConnectionStatus signalRStatus;
  final String? errorMessage;

  LocationState copyWith({
    double? latitude,
    double? longitude,
    double? speedKmH,
    double? heading,
    double? accuracy,
    bool? isTracking,
    bool? hasRealGpsFix,
    SignalRConnectionStatus? signalRStatus,
    String? errorMessage,
  }) {
    return LocationState(
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      speedKmH: speedKmH ?? this.speedKmH,
      heading: heading ?? this.heading,
      accuracy: accuracy ?? this.accuracy,
      isTracking: isTracking ?? this.isTracking,
      hasRealGpsFix: hasRealGpsFix ?? this.hasRealGpsFix,
      signalRStatus: signalRStatus ?? this.signalRStatus,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// ─── Riverpod Providers ───────────────────────────────────────────────────

final signalRServiceProvider = Provider<SignalRService>((ref) {
  final storageService = ref.watch(secureStorageProvider);
  final service = SignalRService(storageService);
  ref.onDispose(() => service.dispose());
  return service;
});

final locationServiceProvider = Provider<LocationService>((ref) {
  return const LocationService();
});

// ─── Location Notifier (Modern Riverpod Notifier) ─────────────────────────

class LocationNotifier extends Notifier<LocationState> {
  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<SignalRConnectionStatus>? _signalRStatusSubscription;

  SignalRService get _signalRService => ref.read(signalRServiceProvider);
  LocationService get _locationService => ref.read(locationServiceProvider);
  SecureStorageService get _storageService => ref.read(secureStorageProvider);

  @override
  LocationState build() {
    // SignalR durum akışını dinle
    _signalRStatusSubscription = _signalRService.statusStream.listen((status) {
      state = state.copyWith(signalRStatus: status);
    });

    // Kullanıcı giriş yaptığında SignalR'a otomatik bağlan
    ref.listen(authProvider, (previous, next) {
      if (next.isAuthenticated) {
        debugPrint('[LocationNotifier] Kullanıcı oturumu doğrulandı, SignalR başlatılıyor...');
        _signalRService.connect();
      }
    });

    ref.onDispose(() {
      _positionSubscription?.cancel();
      _signalRStatusSubscription?.cancel();
    });

    // Otomatik canlı takibi başlat
    Future.microtask(() => startTracking());

    return const LocationState();
  }

  /// SignalR bağlantısını yenile
  Future<void> retrySignalR() async {
    await _signalRService.connect();
  }

  /// Canlı GPS ve SignalR Takibini Başlat
  Future<void> startTracking() async {
    if (_signalRService.currentStatus != SignalRConnectionStatus.connected) {
      _signalRService.connect();
    }

    if (state.isTracking) return;

    state = state.copyWith(
      isTracking: true,
      signalRStatus: _signalRService.currentStatus,
    );

    // 2. Cihaz GPS İzinlerini kontrol et
    final hasPermission = await _locationService.checkAndRequestPermission();
    if (!hasPermission) {
      state = state.copyWith(
        errorMessage: 'GPS konumu izni verilmedi veya konum servisleri kapalı.',
      );
      return;
    }

    // İlk konumu al
    final initialPos = await _locationService.getCurrentPosition();
    if (initialPos != null) {
      _processPositionUpdate(initialPos);
    }

    // 3. Konum akışını dinlemeye başla
    _positionSubscription?.cancel();
    _positionSubscription = _locationService.getPositionStream().listen(
      (position) {
        _processPositionUpdate(position);
      },
      onError: (error) {
        debugPrint('[LocationNotifier] Konum akışı hatası: $error');
        state = state.copyWith(errorMessage: error.toString());
      },
    );
  }

  /// Yeni GPS konumunu işle ve SignalR ile backend'e gönder
  Future<void> _processPositionUpdate(Position pos) async {
    final speedKmH = (pos.speed * 3.6).clamp(0.0, 160.0);

    state = state.copyWith(
      latitude: pos.latitude,
      longitude: pos.longitude,
      speedKmH: speedKmH > 0 ? speedKmH : state.speedKmH,
      heading: pos.heading,
      accuracy: pos.accuracy,
      hasRealGpsFix: true,
    );

    // Kayıtlı kurye ID'sini al (yoksa merchantId fallback)
    final courierId = await _storageService.getCourierId() ??
        await _storageService.getMerchantId() ??
        '00000000-0000-0000-0000-000000000001';

    // SignalR ile sunucuya ilet
    await _signalRService.sendLocationUpdate(
      courierId: courierId,
      latitude: pos.latitude,
      longitude: pos.longitude,
    );
  }

  /// Takibi Durdur
  Future<void> stopTracking() async {
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    await _signalRService.disconnect();
    state = state.copyWith(
      isTracking: false,
      signalRStatus: SignalRConnectionStatus.disconnected,
    );
  }
}

/// Uygulama Genelinde Kullanılacak Location Provider
final locationProvider =
    NotifierProvider<LocationNotifier, LocationState>(LocationNotifier.new);
