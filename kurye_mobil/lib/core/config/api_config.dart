import 'dart:io';
import 'package:flutter/foundation.dart';

/// Sunucu adresi yapılandırması.
///
/// Varsayılan adres platforma göre seçilir. Gerçek telefonu aynı Wi-Fi üzerinden
/// bilgisayardaki API'ye bağlamak için çalıştırırken adresi verin:
///
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.131:5000
///
/// (192.168.1.131 yerine bilgisayarın o anki yerel IP adresi yazılır.)
class ApiConfig {
  ApiConfig._();

  static const String _override = String.fromEnvironment('API_BASE_URL');

  /// REST API kök adresi (sonda "/" olmadan).
  static String get baseUrl {
    if (_override.isNotEmpty) {
      return _override.endsWith('/') ? _override.substring(0, _override.length - 1) : _override;
    }
    if (kIsWeb) return 'http://localhost:5000';
    if (Platform.isAndroid) {
      // adb reverse tcp:5000 tcp:5000 ile USB bağlı telefon ve emülatör
      return 'http://127.0.0.1:5000';
    }
    // iOS Simulator, Windows, macOS, Linux
    return 'http://localhost:5000';
  }

  /// SignalR konum hub adresi.
  static String get hubUrl => '$baseUrl/hubs/location';
}
