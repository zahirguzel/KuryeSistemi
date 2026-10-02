import 'package:flutter/services.dart';

/// Harita sağlayıcı tipleri
enum MapProviderType {
  openStreetMap,
  googleMaps,
}

/// Uygulama Genel Çevre ve Yapılandırma Yöneticisi (AppConfig)
/// .env dosyasından okunan harita ve harici servis konfigürasyonlarını yönetir.
class AppConfig {
  AppConfig._();

  /// Aktif Harita Sağlayıcısı ("OpenStreetMap" veya "GoogleMaps")
  static String activeMapProvider = 'OpenStreetMap';

  /// Google Maps API Anahtarı
  static String googleMapsApiKey = '';

  /// Harita sağlayıcı tipi
  static MapProviderType get mapProviderType {
    if (activeMapProvider.trim().toLowerCase() == 'googlemaps') {
      return MapProviderType.googleMaps;
    }
    return MapProviderType.openStreetMap;
  }

  static bool get isOpenStreetMap => mapProviderType == MapProviderType.openStreetMap;
  static bool get isGoogleMaps => mapProviderType == MapProviderType.googleMaps;

  /// .env dosyasını veya konfigürasyonu yükler
  static Future<void> initialize() async {
    try {
      final envContent = await rootBundle.loadString('.env');
      parseEnvString(envContent);
    } catch (_) {
      // .env dosyası bulunamazsa veya henüz asset olarak eklenmediyse
      // varsayılan konfigürasyon (OpenStreetMap) güvenle kullanılır.
    }
  }

  /// .env içeriğini satır satır ayrıştırır
  static void parseEnvString(String content) {
    final lines = content.split('\n');
    for (var line in lines) {
      line = line.trim();
      if (line.isEmpty || line.startsWith('#')) continue;

      final parts = line.split('=');
      if (parts.length >= 2) {
        final key = parts[0].trim();
        final value = parts.sublist(1).join('=').trim();

        if (key == 'ACTIVE_MAP_PROVIDER') {
          activeMapProvider = value.isNotEmpty ? value : 'OpenStreetMap';
        } else if (key == 'GOOGLE_MAPS_API_KEY') {
          googleMapsApiKey = value;
        }
      }
    }
  }
}
