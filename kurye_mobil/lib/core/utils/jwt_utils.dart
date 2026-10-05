import 'dart:convert';

/// JWT yardımcıları (imza doğrulaması YAPMAZ; yalnızca süre kontrolü için yük okur).
/// Gerçek doğrulama sunucudadır; bu kontrol süresi dolmuş token'la gereksiz açılışı engeller.
class JwtUtils {
  JwtUtils._();

  /// Token'ın `exp` (bitiş) zamanı. Okunamazsa null.
  static DateTime? expiry(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
      final map = jsonDecode(payload) as Map<String, dynamic>;
      final exp = map['exp'];
      if (exp is num) {
        return DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000, isUtc: true);
      }
    } catch (_) {}
    return null;
  }

  /// Token süresi dolmuş veya okunamıyorsa true.
  static bool isExpired(String token, {Duration skew = const Duration(seconds: 30)}) {
    final exp = expiry(token);
    if (exp == null) return true;
    return DateTime.now().toUtc().isAfter(exp.subtract(skew));
  }
}
