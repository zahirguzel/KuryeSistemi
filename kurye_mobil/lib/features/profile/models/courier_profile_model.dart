/// Kurye Profil ve Kasa Durumu Veri Modeli
class CourierProfileModel {
  const CourierProfileModel({
    required this.id,
    required this.merchantId,
    required this.merchantName,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    required this.email,
    required this.phoneNumber,
    required this.vehicleType,
    required this.licensePlate,
    required this.vehicleBrand,
    required this.vehicleModel,
    required this.isAvailable,
    required this.currentBalance,
    required this.completedDeliveriesToday,
    required this.totalEarningsToday,
    required this.totalDeliveriesAllTime,
    this.isOnline = false,
  });

  final String id;
  final String merchantId;
  final String merchantName;
  final String firstName;
  final String lastName;
  final String fullName;
  final String email;
  final String phoneNumber;
  final String vehicleType;
  final String licensePlate;
  final String vehicleBrand;
  final String vehicleModel;
  final bool isAvailable;
  final bool isOnline;
  final double currentBalance;
  final int completedDeliveriesToday;
  final double totalEarningsToday;
  final int totalDeliveriesAllTime;

  /// Kurye firmaya borçlu mu? (Nakit tahsilat yaptıysa bakiye negatif olur)
  bool get isIndebted => currentBalance < -0.001;

  /// Kurye firmadan alacaklı mı? (Hak edişleri nakit tahsilatından fazlaysa)
  bool get isCreditor => currentBalance > 0.001;

  /// Kasa tam dengede mi?
  bool get isBalanced => !isIndebted && !isCreditor;

  /// Mutlak bakiye tutarı (borç/alacak gösteriminde pozitife çevrilir)
  double get absoluteBalance => currentBalance.abs();

  String formatCurrency(double amount) {
    return '₺${amount.toStringAsFixed(2).replaceAll('.', ',')}';
  }

  factory CourierProfileModel.fromJson(Map<String, dynamic> json) {
    // ServiceResult<T> veya doğrudan DTO nesnesi uyumluluğu
    final data = json.containsKey('data') && json['data'] is Map<String, dynamic>
        ? json['data'] as Map<String, dynamic>
        : json;

    return CourierProfileModel(
      id: data['id']?.toString() ?? '',
      merchantId: data['merchantId']?.toString() ?? '',
      merchantName: data['merchantName']?.toString() ?? 'KuryeSistemi İşletmesi',
      firstName: data['firstName']?.toString() ?? '',
      lastName: data['lastName']?.toString() ?? '',
      fullName: data['fullName']?.toString() ??
          '${data['firstName'] ?? ''} ${data['lastName'] ?? ''}'.trim(),
      email: data['email']?.toString() ?? '',
      phoneNumber: data['phoneNumber']?.toString() ?? '',
      vehicleType: data['vehicleType']?.toString() ?? 'Motosiklet',
      licensePlate: data['licensePlate']?.toString() ?? '',
      vehicleBrand: data['vehicleBrand']?.toString() ?? '',
      vehicleModel: data['vehicleModel']?.toString() ?? '',
      isAvailable: data['isAvailable'] as bool? ?? true,
      isOnline: data['isOnline'] as bool? ?? false,
      currentBalance: (data['currentBalance'] as num?)?.toDouble() ?? 0.0,
      completedDeliveriesToday: (data['completedDeliveriesToday'] as num?)?.toInt() ?? 0,
      totalEarningsToday: (data['totalEarningsToday'] as num?)?.toDouble() ?? 0.0,
      totalDeliveriesAllTime: (data['totalDeliveriesAllTime'] as num?)?.toInt() ?? 0,
    );
  }
}
