import 'package:dio/dio.dart';
import '../config/api_config.dart';
import '../storage/secure_storage_service.dart';

/// Merkezi Dio HTTP İstemcisi (DioClient)
/// Base URL yapılandırması, otomatik JWT header ekleme ve hata yönetimi içerir.
class DioClient {
  DioClient(this._storageService, {String? customBaseUrl, this.onUnauthorized}) {
    final defaultBaseUrl = ApiConfig.baseUrl;
    _dio = Dio(
      BaseOptions(
        baseUrl: customBaseUrl ?? defaultBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Token mevcutsa otomatik Authorization header'ı ekle
          final token = await _storageService.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) {
          // Oturum geçersizse (süresi dolmuş / iptal edilmiş token) kullanıcıyı login'e döndür.
          // Giriş isteğinin kendi 401'i (yanlış şifre) bu akışa girmez.
          // Yalnızca JWT doğrulama reddi (gövdesiz 401) oturum bitti sayılır; iş kuralı 401'leri
          // (ServiceResult gövdeli) oturumu düşürmez.
          final path = error.requestOptions.path.toLowerCase();
          if (error.response?.statusCode == 401 &&
              !path.contains('/auth/login') &&
              _isAuthChallenge(error.response?.data) &&
              onUnauthorized != null) {
            onUnauthorized!();
          }
          final friendlyError = _mapDioException(error);
          return handler.next(friendlyError);
        },
      ),
    );
  }

  final SecureStorageService _storageService;

  /// 401 (oturum geçersiz) alındığında çağrılır.
  final void Function()? onUnauthorized;
  late final Dio _dio;

  Dio get dio => _dio;

  /// ASP.NET JwtBearer reddinin gövdesi boştur; uygulama hataları ServiceResult JSON'u taşır.
  static bool _isAuthChallenge(dynamic data) {
    if (data == null) return true;
    if (data is String) return data.trim().isEmpty;
    if (data is Map) return data.isEmpty;
    return false;
  }

  /// Dio Exception'larını anlaşılır mesajlara dönüştürür
  DioException _mapDioException(DioException error) {
    String message;
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        message = 'Sunucu yanıt vermedi. Bağlantı zaman aşımına uğradı.';
        break;
      case DioExceptionType.connectionError:
        message = 'Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol ediniz.';
        break;
      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode;
        final responseData = error.response?.data;

        if (statusCode == 401) {
          if (responseData is Map && responseData.containsKey('message')) {
            message = responseData['message'].toString();
          } else {
            message = 'Giriş başarısız. E-posta adresi veya şifre hatalı.';
          }
        } else if (statusCode == 400) {
          if (responseData is Map && responseData.containsKey('message')) {
            message = responseData['message'].toString();
          } else if (responseData is Map && responseData.containsKey('detail')) {
            message = responseData['detail'].toString();
          } else {
            message = 'Geçersiz istek gönderildi.';
          }
        } else if (statusCode == 409) {
          if (responseData is Map && responseData.containsKey('message')) {
            message = responseData['message'].toString();
          } else if (responseData is Map && responseData.containsKey('detail')) {
            message = responseData['detail'].toString();
          } else {
            message = 'İşlem yapabilmek için lütfen önce mesainizi başlatın.';
          }
        } else if (statusCode == 403) {
          message = 'Bu işlem için yetkiniz bulunmamaktadır.';
        } else if (statusCode == 404) {
          message = 'İstenen kaynak bulunamadı (404).';
        } else if (statusCode != null && statusCode >= 500) {
          message = 'Sunucu hatası meydana geldi. Lütfen biraz sonra tekrar deneyin.';
        } else {
          message = 'Beklenmeyen bir sunucu yanıtı alındı ($statusCode).';
        }
        break;
      case DioExceptionType.cancel:
        message = 'İstek iptal edildi.';
        break;
      case DioExceptionType.badCertificate:
        message = 'Güvenlik sertifikası doğrulanamadı.';
        break;
      default:
        message = error.message ?? 'Bilinmeyen bir ağ hatası oluştu.';
        break;
    }

    return DioException(
      requestOptions: error.requestOptions,
      response: error.response,
      type: error.type,
      error: message,
      message: message,
    );
  }

  // ── Standart HTTP Yardımcı Metotları ─────────────────────────────────────

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.get<T>(path, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.post<T>(path, data: data, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.put<T>(path, data: data, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.delete<T>(path, data: data, queryParameters: queryParameters, options: options);
  }
}
