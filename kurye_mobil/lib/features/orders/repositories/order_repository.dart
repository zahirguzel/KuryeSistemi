import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/order_model.dart';

/// Sipariş Yönetimi Deposu (OrderRepository)
/// Backend GET /api/orders/active/{merchantId} çağrısını gerçekleştirir.
class OrderRepository {
  const OrderRepository(this._dioClient, this._storageService);

  final DioClient _dioClient;
  final SecureStorageService _storageService;

  /// Aktif siparişleri getirir (Önce /api/orders/courier/active denenir, ardından fallback işletme sorgulanır)
  Future<List<OrderModel>> getActiveOrders({String? merchantId}) async {
    // 1. Kuryenin atanmış görevleri ve havuza düşen bekleyen paketleri
    try {
      final response = await _dioClient.get('/api/orders/courier/active');
      if (response.statusCode == 200 && response.data != null) {
        final list = _parseOrderList(response.data);
        if (list.isNotEmpty) {
          return list;
        }
      }
    } catch (e) {
      debugPrint('[OrderRepository] /api/orders/courier/active çağrısı: $e');
    }

    // 2. Fallback: Belirli bir işletmeye ait aktif siparişler
    try {
      final targetMerchantId = merchantId ?? await _storageService.getMerchantId();
      if (targetMerchantId != null && targetMerchantId.isNotEmpty) {
        final response = await _dioClient.get('/api/orders/active/$targetMerchantId');
        if (response.statusCode == 200 && response.data != null) {
          return _parseOrderList(response.data);
        }
      }
    } catch (e) {
      debugPrint('[OrderRepository] /api/orders/active fallback: $e');
    }

    // 3. Genel fallback: /api/orders
    try {
      final response = await _dioClient.get('/api/orders');
      if (response.statusCode == 200 && response.data != null) {
        final all = _parseOrderList(response.data);
        return all
            .where((o) =>
                o.status == OrderStatus.pending ||
                o.status == OrderStatus.preparing ||
                o.status == OrderStatus.ready ||
                o.status == OrderStatus.assigned ||
                o.status == OrderStatus.pickedUp)
            .toList();
      }
    } catch (e) {
      debugPrint('[OrderRepository] /api/orders genel fallback: $e');
    }

    return [];
  }

  List<OrderModel> _parseOrderList(dynamic data) {
    List<dynamic> rawList = [];
    if (data is List) {
      rawList = data;
    } else if (data is Map) {
      final map = data;
      if (map.containsKey('data') && map['data'] is List) {
        rawList = map['data'] as List<dynamic>;
      } else if (map.containsKey('items') && map['items'] is List) {
        rawList = map['items'] as List<dynamic>;
      }
    }

    return rawList
        .map((item) => OrderModel.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  /// Havuzdaki bir siparişi kuryenin üzerine alır (POST /api/orders/{id}/claim)
  Future<OrderModel?> claimOrder(String orderId) async {
    try {
      final response = await _dioClient.post('/api/orders/$orderId/claim');
      if (response.statusCode == 200 && response.data != null) {
        final Map<String, dynamic> rawMap = response.data is Map<String, dynamic>
            ? response.data as Map<String, dynamic>
            : Map<String, dynamic>.from(response.data as Map);
        final Map<String, dynamic> data = (rawMap.containsKey('data') && rawMap['data'] is Map)
            ? Map<String, dynamic>.from(rawMap['data'] as Map)
            : rawMap;

        return OrderModel.fromJson(data);
      }
      return null;
    } on DioException catch (e) {
      debugPrint('[OrderRepository] claimOrder Dio hatası: ${e.message}');
      rethrow;
    } catch (e) {
      debugPrint('[OrderRepository] claimOrder beklenmeyen hata: $e');
      rethrow;
    }
  }

  /// Sipariş durumunu günceller (PUT /api/orders/{id}/status)
  /// Body: { "newStatus": newStatus }
  Future<OrderModel?> updateOrderStatus(String orderId, int newStatus) async {
    try {
      const statusNames = {
        0: 'Pending',
        1: 'Preparing',
        2: 'Ready',
        3: 'Assigned',
        4: 'PickedUp',
        5: 'Delivered',
        6: 'Cancelled',
      };
      final statusName = statusNames[newStatus] ?? 'Delivered';

      final response = await _dioClient.put(
        '/api/orders/$orderId/status',
        data: {'newStatus': statusName},
      );

      if (response.statusCode == 200 && response.data != null) {
        final Map<String, dynamic> rawMap = response.data is Map<String, dynamic>
            ? response.data as Map<String, dynamic>
            : Map<String, dynamic>.from(response.data as Map);
        final Map<String, dynamic> data = (rawMap.containsKey('data') && rawMap['data'] is Map)
            ? Map<String, dynamic>.from(rawMap['data'] as Map)
            : rawMap;

        return OrderModel.fromJson(data);
      }
      return null;
    } on DioException catch (e) {
      debugPrint('[OrderRepository] updateOrderStatus Dio hatası: ${e.message}');
      rethrow;
    } catch (e) {
      debugPrint('[OrderRepository] updateOrderStatus beklenmeyen hata: $e');
      rethrow;
    }
  }
}
