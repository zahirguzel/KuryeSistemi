import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../models/auth_response_model.dart';

/// Kimlik doğrulama işlemleri sırasında oluşan özel hata sınıfı
class AuthException implements Exception {
  const AuthException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Kimlik Doğrulama Deposu (AuthRepository)
/// Backend API /api/auth/login çağrısını gerçekleştirir.
class AuthRepository {
  const AuthRepository(this._dioClient);

  final DioClient _dioClient;

  /// İşletme / Kurye Girişi (POST /api/auth/login)
  Future<AuthResponseModel> login({
    required String email,
    required String password,
  }) async {
    try {
      final requestModel = LoginRequestModel(
        email: email.trim(),
        password: password,
      );

      final response = await _dioClient.post(
        '/api/auth/login',
        data: requestModel.toJson(),
      );

      if (response.statusCode == 200 && response.data != null) {
        final Map<String, dynamic> data = response.data is Map<String, dynamic>
            ? response.data as Map<String, dynamic>
            : Map<String, dynamic>.from(response.data as Map);
        return AuthResponseModel.fromJson(data);
      } else {
        throw const AuthException('Giriş yapılamadı. Geçersiz sunucu yanıtı.');
      }
    } on DioException catch (dioError) {
      final errorMessage = dioError.message ??
          (dioError.error != null ? dioError.error.toString() : 'Bağlantı hatası oluştu.');
      throw AuthException(errorMessage);
    } catch (e) {
      if (e is AuthException) rethrow;
      throw AuthException('Giriş işlemi sırasında beklenmeyen bir hata oluştu: $e');
    }
  }
}
