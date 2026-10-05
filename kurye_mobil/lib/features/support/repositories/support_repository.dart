import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';

/// Dispeçer iletişim bilgisi (GET /api/couriers/me/support).
class SupportInfo {
  const SupportInfo({this.dispatcherPhone, this.companyName = ''});

  final String? dispatcherPhone;
  final String companyName;

  bool get hasPhone => dispatcherPhone != null && dispatcherPhone!.trim().isNotEmpty;

  factory SupportInfo.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map ? Map<String, dynamic>.from(json['data'] as Map) : json;
    final phone = (data['dispatcherPhone'] ?? data['DispatcherPhone'])?.toString();
    return SupportInfo(
      dispatcherPhone: (phone == null || phone.trim().isEmpty) ? null : phone.trim(),
      companyName: (data['companyName'] ?? data['CompanyName'] ?? '').toString(),
    );
  }
}

/// Acil durum çağrısı sonucu: başarı ya da kullanıcıya gösterilecek hata mesajı.
class SosResult {
  const SosResult.success(this.message)
      : success = true,
        rateLimited = false;
  const SosResult.failure(this.message, {this.rateLimited = false}) : success = false;

  final bool success;
  final bool rateLimited;
  final String message;
}

/// Destek talepleri: dispeçer bilgisi ve acil durum (SOS) çağrısı.
class SupportRepository {
  const SupportRepository(this._dioClient);

  final DioClient _dioClient;

  Future<SupportInfo> getSupportInfo() async {
    final response = await _dioClient.get('/api/couriers/me/support');
    final raw = response.data is Map<String, dynamic>
        ? response.data as Map<String, dynamic>
        : Map<String, dynamic>.from(response.data as Map);
    return SupportInfo.fromJson(raw);
  }

  /// Acil çağrı gönderir. Konum varsa iletilir; yoksa sunucu kuryenin son bilinen konumunu kullanır.
  Future<SosResult> sendSos({String? note, double? latitude, double? longitude}) async {
    try {
      await _dioClient.post('/api/couriers/me/sos', data: {
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
      });
      return const SosResult.success('Acil çağrınız dispeçere iletildi.');
    } on DioException catch (e) {
      final data = e.response?.data;
      final serverMessage = data is Map && data['message'] != null ? data['message'].toString() : null;
      return SosResult.failure(
        serverMessage ?? e.message ?? 'Acil çağrı gönderilemedi.',
        rateLimited: e.response?.statusCode == 429,
      );
    } catch (_) {
      return const SosResult.failure('Acil çağrı gönderilemedi. Bağlantınızı kontrol edin veya dispeçeri arayın.');
    }
  }
}
