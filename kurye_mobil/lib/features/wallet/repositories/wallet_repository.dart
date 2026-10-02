import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/courier_earnings_model.dart';

/// Cüzdan ve Hakediş Deposu (WalletRepository)
/// Backend GET /api/couriers/{courierId}/earnings/today çağrısını gerçekleştirir.
class WalletRepository {
  const WalletRepository(this._dioClient, this._storageService);

  final DioClient _dioClient;
  final SecureStorageService _storageService;

  /// Kuryenin bugünkü teslimatlarını ve toplam kazancını getirir
  Future<CourierEarningsModel> getTodayEarnings() async {
    try {
      final courierId = await _storageService.getCourierId();

      // Eğer courierId varsa doğrudan path parametreli çağrı yapılır,
      // yoksa JWT claim'den okuyan /api/couriers/earnings/today endpoint'i kullanılır.
      final String endpoint = (courierId != null && courierId.isNotEmpty)
          ? '/api/couriers/$courierId/earnings/today'
          : '/api/couriers/earnings/today';

      final response = await _dioClient.get(endpoint);

      if (response.statusCode == 200 && response.data != null) {
        final Map<String, dynamic> rawMap = response.data is Map<String, dynamic>
            ? response.data as Map<String, dynamic>
            : Map<String, dynamic>.from(response.data as Map);

        return CourierEarningsModel.fromJson(rawMap);
      }

      return CourierEarningsModel.empty();
    } on DioException catch (e) {
      debugPrint('[WalletRepository] getTodayEarnings Dio hatası: ${e.message}');
      rethrow;
    } catch (e) {
      debugPrint('[WalletRepository] getTodayEarnings beklenmeyen hata: $e');
      return CourierEarningsModel.empty();
    }
  }

  /// Kuryenin belirtilen tarih aralığındaki teslimatlarını ve kazancını getirir

  Future<CourierEarningsModel> getEarningsHistory({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      final courierId = await _storageService.getCourierId();

      final String endpoint = (courierId != null && courierId.isNotEmpty)
          ? '/api/couriers/$courierId/earnings/history'
          : '/api/couriers/me/earnings/history';

      final response = await _dioClient.get(
        endpoint,
        queryParameters: {
          'startDate': startDate.toIso8601String(),
          'endDate': endDate.toIso8601String(),
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final Map<String, dynamic> rawMap = response.data is Map<String, dynamic>
            ? response.data as Map<String, dynamic>
            : Map<String, dynamic>.from(response.data as Map);

        return CourierEarningsModel.fromJson(rawMap);
      }

      return CourierEarningsModel.empty();
    } on DioException catch (e) {
      debugPrint('[WalletRepository] getEarningsHistory Dio hatası: ${e.message}');
      rethrow;
    } catch (e) {
      debugPrint('[WalletRepository] getEarningsHistory beklenmeyen hata: $e');
      return CourierEarningsModel.empty();
    }
  }
}

