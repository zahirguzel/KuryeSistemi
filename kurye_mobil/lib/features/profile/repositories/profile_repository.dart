import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/courier_profile_model.dart';

/// Kurye Profil ve Mahsuplaşma Deposu (ProfileRepository)
/// Backend GET /api/couriers/me/profile veya /api/couriers/{courierId}/profile çağrısını gerçekleştirir.
class ProfileRepository {
  const ProfileRepository(this._dioClient, this._storageService);

  final DioClient _dioClient;
  final SecureStorageService _storageService;

  /// Kuryenin profilini, araç bilgilerini ve güncel kasa bakiyesini getirir
  Future<CourierProfileModel?> getProfile() async {
    try {
      final courierId = await _storageService.getCourierId();

      final String endpoint = (courierId != null && courierId.isNotEmpty)
          ? '/api/couriers/$courierId/profile'
          : '/api/couriers/me/profile';

      final response = await _dioClient.get(endpoint);

      if (response.statusCode == 200 && response.data != null) {
        final Map<String, dynamic> rawMap = response.data is Map<String, dynamic>
            ? response.data as Map<String, dynamic>
            : Map<String, dynamic>.from(response.data as Map);

        return CourierProfileModel.fromJson(rawMap);
      }

      return null;
    } on DioException catch (e) {
      debugPrint('[ProfileRepository] getProfile Dio hatası: ${e.message}');
      rethrow;
    } catch (e) {
      debugPrint('[ProfileRepository] getProfile beklenmeyen hata: $e');
      return null;
    }
  }
}
