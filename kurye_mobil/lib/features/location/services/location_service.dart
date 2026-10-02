import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Cihaz Konum Servisi (LocationService)
/// Geolocator ve izin yönetimini kapsüller, cihazın anlık GPS koordinat akışını sağlar.
class LocationService {
  const LocationService();

  /// Konum servisinin açık olup olmadığını ve gerekli izinlerin verilip verilmediğini denetler
  Future<bool> checkAndRequestPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('[LocationService] Konum servisleri (GPS) kapalı.');
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        debugPrint('[LocationService] Konum izni kullanıcı tarafından reddedildi.');
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      debugPrint('[LocationService] Konum izni kalıcı olarak reddedildi.');
      return false;
    }

    return true;
  }

  /// Mevcut son konumu getir
  Future<Position?> getCurrentPosition() async {
    final hasPermission = await checkAndRequestPermission();
    if (!hasPermission) return null;

    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
    } catch (e) {
      debugPrint('[LocationService] getCurrentPosition hatası: $e');
      return null;
    }
  }

  /// Canlı GPS konum akışını dinle (Saha kurye takibi için yüksek hassasiyetli)
  Stream<Position> getPositionStream({
    int distanceFilterMeters = 5,
    int intervalSeconds = 3,
  }) {
    late final LocationSettings locationSettings;

    if (defaultTargetPlatform == TargetPlatform.android) {
      locationSettings = AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: distanceFilterMeters,
        intervalDuration: Duration(seconds: intervalSeconds),
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationText: "KuryeSistemi canlı konumunuzu sunucuya aktarıyor.",
          notificationTitle: "Canlı Kurye Takibi Aktif",
          enableWakeLock: true,
        ),
      );
    } else if (defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS) {
      locationSettings = AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: distanceFilterMeters,
        activityType: ActivityType.automotiveNavigation,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
      );
    } else {
      locationSettings = LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: distanceFilterMeters,
      );
    }

    return Geolocator.getPositionStream(locationSettings: locationSettings);
  }
}
