import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Güvenli Veri Depolama Servisi (SecureStorageService)
/// JWT token ve kimlik doğrulama verilerini güvenli donanım alanında saklar.
class SecureStorageService {
  SecureStorageService([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(resetOnError: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  final FlutterSecureStorage _storage;

  static const String _keyJwtToken = 'jwt_token';
  static const String _keyMerchantId = 'merchant_id';
  static const String _keyMerchantName = 'merchant_name';
  static const String _keyEmail = 'email';
  static const String _keyCourierId = 'courier_id';

  /// JWT Token kaydet
  Future<void> saveToken(String token) async {
    await _storage.write(key: _keyJwtToken, value: token);
  }

  /// JWT Token oku
  Future<String?> getToken() async {
    return await _storage.read(key: _keyJwtToken);
  }

  /// JWT Token var mı kontrol et
  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  /// Kullanıcı meta verilerini kaydet
  Future<void> saveUserData({
    required String merchantId,
    required String merchantName,
    required String email,
    String? courierId,
  }) async {
    await _storage.write(key: _keyMerchantId, value: merchantId);
    await _storage.write(key: _keyMerchantName, value: merchantName);
    await _storage.write(key: _keyEmail, value: email);
    if (courierId != null && courierId.isNotEmpty) {
      await _storage.write(key: _keyCourierId, value: courierId);
    }
  }

  /// Saklanan kullanıcı e-postasını getir
  Future<String?> getEmail() async {
    return await _storage.read(key: _keyEmail);
  }

  /// Saklanan işletme / kurye adını getir
  Future<String?> getMerchantName() async {
    return await _storage.read(key: _keyMerchantName);
  }

  /// Saklanan işletme ID'sini getir
  Future<String?> getMerchantId() async {
    return await _storage.read(key: _keyMerchantId);
  }

  /// Saklanan kurye ID'sini getir
  Future<String?> getCourierId() async {
    return await _storage.read(key: _keyCourierId);
  }

  /// Çıkış yapıldığında token'ı sil
  Future<void> deleteToken() async {
    await _storage.delete(key: _keyJwtToken);
  }

  /// Tüm oturum verilerini temizle
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  // ─── Bildirim ve Titreşim Ayarları ──────────────────────────────────────────
  static const String _keySoundNotification = 'settings_sound_notification';
  static const String _keyVibrationNotification = 'settings_vibration_notification';

  /// Sesli bildirim açık mı? (Varsayılan: true)
  Future<bool> getSoundNotificationEnabled() async {
    final val = await _storage.read(key: _keySoundNotification);
    return val == null ? true : val == 'true';
  }

  /// Sesli bildirim tercihini kaydet
  Future<void> setSoundNotificationEnabled(bool enabled) async {
    await _storage.write(key: _keySoundNotification, value: enabled.toString());
  }

  /// Titreşimli bildirim açık mı? (Varsayılan: true)
  Future<bool> getVibrationNotificationEnabled() async {
    final val = await _storage.read(key: _keyVibrationNotification);
    return val == null ? true : val == 'true';
  }

  /// Titreşimli bildirim tercihini kaydet
  Future<void> setVibrationNotificationEnabled(bool enabled) async {
    await _storage.write(key: _keyVibrationNotification, value: enabled.toString());
  }

  // ─── Tema Ayarları (Açık Beyaz / Karanlık Mod) ──────────────────────────────
  static const String _keyDarkMode = 'settings_dark_mode';

  /// Karanlık mod açık mı? (Varsayılan: false -> Göz yormayan beyaz tema)
  Future<bool> getDarkModeEnabled() async {
    final val = await _storage.read(key: _keyDarkMode);
    return val == 'true';
  }

  /// Karanlık mod tercihini kaydet
  Future<void> setDarkModeEnabled(bool enabled) async {
    await _storage.write(key: _keyDarkMode, value: enabled.toString());
  }
}
