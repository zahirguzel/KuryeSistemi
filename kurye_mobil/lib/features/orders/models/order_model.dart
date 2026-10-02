/// Sipariş Durumu (OrderStatus)
/// Backend Domain Enums OrderStatus ile birebir uyumludur.
enum OrderStatus {
  pending(0, 'Beklemede'),
  preparing(1, 'Hazırlanıyor'),
  ready(2, 'Paket Hazır'),
  assigned(3, 'Kurye Atandı'),
  pickedUp(4, 'Yolda (Teslim Alındı)'),
  delivered(5, 'Teslim Edildi'),
  cancelled(6, 'İptal Edildi');

  const OrderStatus(this.value, this.label);
  final int value;
  final String label;

  static OrderStatus fromValue(dynamic val) {
    if (val is int) {
      return OrderStatus.values.firstWhere(
        (e) => e.value == val,
        orElse: () => OrderStatus.pending,
      );
    }
    if (val is String) {
      final lower = val.toLowerCase().trim();
      if (lower == 'created' || lower == 'pending' || lower == '0') return OrderStatus.pending;
      if (lower == 'preparing' || lower == '1') return OrderStatus.preparing;
      if (lower == 'ready' || lower == '2') return OrderStatus.ready;
      if (lower == 'assigned' || lower == '3') return OrderStatus.assigned;
      if (lower == 'pickedup' || lower == 'picked_up' || lower == '4') return OrderStatus.pickedUp;
      if (lower == 'delivered' || lower == '5') return OrderStatus.delivered;
      if (lower == 'cancelled' || lower == 'canceled' || lower == '6') return OrderStatus.cancelled;
      return OrderStatus.values.firstWhere(
        (e) =>
            e.name.toLowerCase() == lower ||
            e.value.toString() == val,
        orElse: () => OrderStatus.pending,
      );
    }
    return OrderStatus.pending;
  }
}

/// Sipariş Veri Modeli (OrderModel)
/// Backend OrderDto ile birebir eşleşir.
class OrderModel {
  const OrderModel({
    required this.id,
    required this.merchantId,
    this.courierId,
    this.orderCode,
    this.source,
    this.deliveryNeighborhood,
    required this.pickupAddressLine,
    required this.pickupDistrict,
    required this.pickupCity,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.deliveryAddressLine,
    required this.deliveryDistrict,
    required this.deliveryCity,
    required this.deliveryLatitude,
    required this.deliveryLongitude,
    required this.recipientName,
    required this.recipientPhone,
    this.notes,
    required this.status,
    this.pickedUpAt,
    this.deliveredAt,
    required this.createdAt,
    this.restaurantName = 'İskenderun Dürüm Evi',
    this.courierEarning = 40.0,
    this.estimatedEarnings = '₺40,00',
    this.orderType = 'Ekspres',
  });

  final String id;
  final String merchantId;
  final String? courierId;
  final String? orderCode;
  final String? source;
  final String? deliveryNeighborhood;

  // Alım Adresi (Restoran / Mağaza)
  final String pickupAddressLine;
  final String pickupDistrict;
  final String pickupCity;
  final double pickupLatitude;
  final double pickupLongitude;

  // Teslim Adresi (Müşteri)
  final String deliveryAddressLine;
  final String deliveryDistrict;
  final String deliveryCity;
  final double deliveryLatitude;
  final double deliveryLongitude;

  // Alıcı & Bilgiler
  final String recipientName;
  final String recipientPhone;
  final String? notes;
  final OrderStatus status;
  final DateTime? pickedUpAt;
  final DateTime? deliveredAt;
  final DateTime createdAt;

  // Ekstra UI İpuçları (Opsiyonel / Mock Varsayılanları)
  final String restaurantName;
  final double courierEarning;
  final String estimatedEarnings;
  final String orderType;

  /// Kısa sipariş kodu örneği: #TY-8492 veya #KS-8942
  String get shortCode {
    if (orderCode != null && orderCode!.trim().isNotEmpty) {
      final clean = orderCode!.trim();
      return clean.startsWith('#') ? clean : '#$clean';
    }
    if (id.isEmpty) return '#KS-8942';
    final clean = id.replaceAll('-', '');
    final part = clean.length >= 4 ? clean.substring(0, 4).toUpperCase() : clean.toUpperCase();
    return '#KS-$part';
  }

  /// Kuryenin aktif görevi mi? (Assigned veya PickedUp)
  bool get isActiveTask =>
      status == OrderStatus.assigned || status == OrderStatus.pickedUp;

  /// Havuzdaki boşta sipariş mi?
  bool get isPoolOrder =>
      status == OrderStatus.pending || status == OrderStatus.preparing || status == OrderStatus.ready;

  String get fullPickupAddress =>
      '$pickupAddressLine, $pickupDistrict / $pickupCity';

  String get fullDeliveryAddress =>
      deliveryNeighborhood != null && deliveryNeighborhood!.isNotEmpty
          ? '$deliveryNeighborhood, $deliveryAddressLine, $deliveryDistrict'
          : '$deliveryAddressLine, $deliveryDistrict / $deliveryCity';

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? 0.0;
    }

    DateTime parseDate(dynamic val) {
      if (val == null) return DateTime.now();
      return DateTime.tryParse(val.toString()) ?? DateTime.now();
    }

    DateTime? parseNullableDate(dynamic val) {
      if (val == null) return null;
      return DateTime.tryParse(val.toString());
    }

    final rawEarning = parseDouble(json['courierEarning'] ?? json['CourierEarning']);
    final earning = rawEarning > 0 ? rawEarning : 40.0;
    final formattedEarnings = '₺${earning.toStringAsFixed(2).replaceAll('.', ',')}';

    return OrderModel(
      id: (json['id'] ?? json['Id'] ?? '').toString(),
      merchantId: (json['merchantId'] ?? json['MerchantId'] ?? '').toString(),
      courierId: json['courierId']?.toString() ?? json['CourierId']?.toString(),
      orderCode: json['orderCode']?.toString() ?? json['OrderCode']?.toString(),
      source: json['source']?.toString() ?? json['Source']?.toString(),
      deliveryNeighborhood: json['deliveryNeighborhood']?.toString() ?? json['DeliveryNeighborhood']?.toString(),
      pickupAddressLine: (json['pickupAddressLine'] ?? json['PickupAddressLine'] ?? '').toString(),
      pickupDistrict: (json['pickupDistrict'] ?? json['PickupDistrict'] ?? '').toString(),
      pickupCity: (json['pickupCity'] ?? json['PickupCity'] ?? '').toString(),
      pickupLatitude: parseDouble(json['pickupLatitude'] ?? json['PickupLatitude']),
      pickupLongitude: parseDouble(json['pickupLongitude'] ?? json['PickupLongitude']),
      deliveryAddressLine: (json['deliveryAddressLine'] ?? json['DeliveryAddressLine'] ?? '').toString(),
      deliveryDistrict: (json['deliveryDistrict'] ?? json['DeliveryDistrict'] ?? '').toString(),
      deliveryCity: (json['deliveryCity'] ?? json['DeliveryCity'] ?? '').toString(),
      deliveryLatitude: parseDouble(json['deliveryLatitude'] ?? json['DeliveryLatitude']),
      deliveryLongitude: parseDouble(json['deliveryLongitude'] ?? json['DeliveryLongitude']),
      recipientName: (json['recipientName'] ?? json['RecipientName'] ?? '').toString(),
      recipientPhone: (json['recipientPhone'] ?? json['RecipientPhone'] ?? '').toString(),
      notes: json['notes']?.toString() ?? json['Notes']?.toString(),
      status: OrderStatus.fromValue(json['status'] ?? json['Status']),
      pickedUpAt: parseNullableDate(json['pickedUpAt'] ?? json['PickedUpAt']),
      deliveredAt: parseNullableDate(json['deliveredAt'] ?? json['DeliveredAt']),
      createdAt: parseDate(json['createdAt'] ?? json['CreatedAt']),
      restaurantName: (json['merchantName'] ?? json['MerchantName'] ?? json['restaurantName'] ?? json['RestaurantName'] ?? 'İskenderun Dürüm Evi').toString(),
      courierEarning: earning,
      estimatedEarnings: formattedEarnings,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'merchantId': merchantId,
      'courierId': courierId,
      'orderCode': orderCode,
      'source': source,
      'deliveryNeighborhood': deliveryNeighborhood,
      'pickupAddressLine': pickupAddressLine,
      'pickupDistrict': pickupDistrict,
      'pickupCity': pickupCity,
      'pickupLatitude': pickupLatitude,
      'pickupLongitude': pickupLongitude,
      'deliveryAddressLine': deliveryAddressLine,
      'deliveryDistrict': deliveryDistrict,
      'deliveryCity': deliveryCity,
      'deliveryLatitude': deliveryLatitude,
      'deliveryLongitude': deliveryLongitude,
      'recipientName': recipientName,
      'recipientPhone': recipientPhone,
      'notes': notes,
      'status': status.value,
      'pickedUpAt': pickedUpAt?.toIso8601String(),
      'deliveredAt': deliveredAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'courierEarning': courierEarning,
    };
  }
}
