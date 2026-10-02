/// Kimlik Doğrulama Yanıt Modeli (AuthResponseModel)
/// Backend /api/auth/login endpoint'inden dönen AuthTokenDto ile birebir eşleşir.
class AuthResponseModel {
  const AuthResponseModel({
    required this.token,
    required this.merchantId,
    required this.merchantName,
    required this.email,
    this.expiresAt,
    this.courierId,
  });

  final String token;
  final String merchantId;
  final String merchantName;
  final String email;
  final DateTime? expiresAt;
  final String? courierId;

  factory AuthResponseModel.fromJson(Map<String, dynamic> rawJson) {
    // Hem sarmalanmış (ServiceResult.data) hem doğrudan nesne desteği
    final json = (rawJson.containsKey('data') && rawJson['data'] is Map)
        ? Map<String, dynamic>.from(rawJson['data'] as Map)
        : rawJson;

    // Hem camelCase hem PascalCase desteği
    final token = json['token'] ?? json['Token'] ?? '';
    final merchantId = json['merchantId'] ?? json['MerchantId'] ?? '';
    final merchantName = json['merchantName'] ?? json['MerchantName'] ?? '';
    final email = json['email'] ?? json['Email'] ?? '';
    final expiresAtStr = json['expiresAt'] ?? json['ExpiresAt'];
    final courierId = json['courierId'] ?? json['CourierId'];

    DateTime? parsedExpiresAt;
    if (expiresAtStr != null) {
      parsedExpiresAt = DateTime.tryParse(expiresAtStr.toString());
    }

    return AuthResponseModel(
      token: token.toString(),
      merchantId: merchantId.toString(),
      merchantName: merchantName.toString(),
      email: email.toString(),
      expiresAt: parsedExpiresAt,
      courierId: courierId?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'merchantId': merchantId,
      'merchantName': merchantName,
      'email': email,
      'expiresAt': expiresAt?.toIso8601String(),
    };
  }
}

/// Giriş İstek Modeli (LoginRequestModel)
class LoginRequestModel {
  const LoginRequestModel({
    required this.email,
    required this.password,
  });

  final String email;
  final String password;

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
    };
  }
}
