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
  });

  final String orderId;
  final String shortCode;
  final String recipientName;
  final String deliveryAddress;
  final DateTime deliveredAt;
  final double earning;

  factory DeliveryHistoryItemModel.fromJson(Map<String, dynamic> json) {
    final orderId = json['orderId'] ?? json['OrderId'] ?? '';
    final shortCode = json['shortCode'] ?? json['ShortCode'] ?? '';
    final recipientName = json['recipientName'] ?? json['RecipientName'] ?? '';
    final deliveryAddress = json['deliveryAddress'] ?? json['DeliveryAddress'] ?? '';
    final deliveredAtStr = json['deliveredAt'] ?? json['DeliveredAt'];
    final earning = (json['earning'] ?? json['Earning'] ?? 0.0) as num;

    return DeliveryHistoryItemModel(
      orderId: orderId.toString(),
      shortCode: shortCode.toString(),
      recipientName: recipientName.toString(),
      deliveryAddress: deliveryAddress.toString(),
      deliveredAt: deliveredAtStr != null ? DateTime.tryParse(deliveredAtStr.toString()) ?? DateTime.now() : DateTime.now(),
      earning: earning.toDouble(),
    );
  }
}
