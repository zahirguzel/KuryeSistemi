import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../storage/secure_storage_service.dart';

/// Merkezi Dio HTTP İstemcisi (DioClient)
/// Base URL yapılandırması, otomatik JWT header ekleme ve hata yönetimi içerir.
class DioClient {
  DioClient(this._storageService, {String? customBaseUrl}) {
    final defaultBaseUrl = _resolveDefaultBaseUrl();
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
          final friendlyError = _mapDioException(error);
          return handler.next(friendlyError);
        },
      ),
    );
  }

  final SecureStorageService _storageService;
  late final Dio _dio;

  Dio get dio => _dio;

  /// Platforma göre varsayılan API URL'si
  static String _resolveDefaultBaseUrl() {
    if (kIsWeb) {
      return 'http://localhost:5000';
    }
    if (Platform.isAndroid) {
      // adb reverse tcp:5000 tcp:5000 ile fiziksel telefon ve emülatör desteği
      return 'http://127.0.0.1:5000';
    }
    // iOS Simulator, Windows, macOS, Linux
    return 'http://localhost:5000';
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
