/// Kurye Günlük Hakediş ve Cüzdan Modeli (CourierEarningsModel)
/// Backend CourierEarningsDto ile birebir eşleşir.
class CourierEarningsModel {
  const CourierEarningsModel({
    required this.courierId,
    required this.courierName,
    required this.date,
    required this.totalEarnings,
    required this.deliveredPackageCount,
    required this.averagePerPackage,
    required this.deliveries,
  });

  final String courierId;
  final String courierName;
  final DateTime date;
  final double totalEarnings;
  final int deliveredPackageCount;
  final double averagePerPackage;
  final List<DeliveryHistoryItemModel> deliveries;

  factory CourierEarningsModel.fromJson(Map<String, dynamic> rawJson) {
    // Hem sarmalanmış (ServiceResult.data) hem doğrudan nesne desteği
    final json = (rawJson.containsKey('data') && rawJson['data'] is Map)
        ? Map<String, dynamic>.from(rawJson['data'] as Map)
        : rawJson;

    final courierId = json['courierId'] ?? json['CourierId'] ?? '';
    final courierName = json['courierName'] ?? json['CourierName'] ?? '';
    final dateStr = json['date'] ?? json['Date'];
    final totalEarnings = (json['totalEarnings'] ?? json['TotalEarnings'] ?? 0.0) as num;
    final deliveredPackageCount = (json['deliveredPackageCount'] ?? json['DeliveredPackageCount'] ?? 0) as int;
    final averagePerPackage = (json['averagePerPackage'] ?? json['AveragePerPackage'] ?? 0.0) as num;
    final rawDeliveries = (json['deliveries'] ?? json['Deliveries'] ?? []) as List;

    return CourierEarningsModel(
      courierId: courierId.toString(),
      courierName: courierName.toString(),
      date: dateStr != null ? DateTime.tryParse(dateStr.toString()) ?? DateTime.now() : DateTime.now(),
      totalEarnings: totalEarnings.toDouble(),
      deliveredPackageCount: deliveredPackageCount,
      averagePerPackage: averagePerPackage.toDouble(),
      deliveries: rawDeliveries
          .map((item) => DeliveryHistoryItemModel.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
    );
  }

  /// Boş başlangıç durumu
  factory CourierEarningsModel.empty() {
    return CourierEarningsModel(
      courierId: '',
      courierName: '',
      date: DateTime.now(),
      totalEarnings: 0.0,
      deliveredPackageCount: 0,
      averagePerPackage: 0.0,
      deliveries: const [],
    );
  }
}

/// Tamamlanan Teslimat Geçmişi Öğesi (DeliveryHistoryItemModel)
class DeliveryHistoryItemModel {
  const DeliveryHistoryItemModel({
    required this.orderId,
    required this.shortCode,
    required this.recipientName,
    required this.deliveryAddress,
    required this.deliveredAt,
    required this.earning,
    this.orderCode,
    this.merchantName,
    this.pickupAddress,
    this.deliveryAddressFull,
    this.recipientPhoneMasked,
    this.paymentMethod,
    this.totalOrderAmount = 0.0,
    this.notes,
    this.createdAt,
    this.assignedAt,
    this.pickedUpAt,
    this.distanceKm,
  });

  final String orderId;
  final String shortCode;
  final String recipientName;
  final String deliveryAddress;
  final DateTime deliveredAt;
  final double earning;

  // Detay alanları (sunucu teslim geçmişinde döner)
  final String? orderCode;
  final String? merchantName;
  final String? pickupAddress;
  final String? deliveryAddressFull;
  final String? recipientPhoneMasked;
  final String? paymentMethod;
  final double totalOrderAmount;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? assignedAt;
  final DateTime? pickedUpAt;
  final double? distanceKm;

  /// Arama için birleştirilmiş, küçük harfe çevrilmiş metin.
  String get searchText => [
        shortCode,
        orderCode,
        recipientName,
        deliveryAddress,
        deliveryAddressFull,
        merchantName,
        pickupAddress,
      ].whereType<String>().join(' ').toLowerCase();

  factory DeliveryHistoryItemModel.fromJson(Map<String, dynamic> json) {
    dynamic pick(String camel) {
      final pascal = camel[0].toUpperCase() + camel.substring(1);
      return json[camel] ?? json[pascal];
    }

    String? str(String key) {
      final v = pick(key);
      if (v == null) return null;
      final t = v.toString().trim();
      return t.isEmpty ? null : t;
    }

    DateTime? date(String key) {
      final v = pick(key);
      return v == null ? null : DateTime.tryParse(v.toString())?.toLocal();
    }

    final deliveredAt = date('deliveredAt');

    return DeliveryHistoryItemModel(
      orderId: (pick('orderId') ?? '').toString(),
      shortCode: (pick('shortCode') ?? '').toString(),
      recipientName: (pick('recipientName') ?? '').toString(),
      deliveryAddress: (pick('deliveryAddress') ?? '').toString(),
      deliveredAt: deliveredAt ?? DateTime.now(),
      earning: ((pick('earning') ?? 0.0) as num).toDouble(),
      orderCode: str('orderCode'),
      merchantName: str('merchantName'),
      pickupAddress: str('pickupAddress'),
      deliveryAddressFull: str('deliveryAddressFull'),
      recipientPhoneMasked: str('recipientPhoneMasked'),
      paymentMethod: str('paymentMethod'),
      totalOrderAmount: ((pick('totalOrderAmount') ?? 0.0) as num).toDouble(),
      notes: str('notes'),
      createdAt: date('createdAt'),
      assignedAt: date('assignedAt'),
      pickedUpAt: date('pickedUpAt'),
      distanceKm: (pick('distanceKm') as num?)?.toDouble(),
    );
  }
}
