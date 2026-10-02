// DTOs/Merchants/MerchantFinanceSummaryDto.cs

namespace KuryeSistemi.Application.DTOs.Merchants;

/// <summary>
/// İşletme (Restoran) ile Kurye Firması arasındaki finans ve mahsuplaşma özeti.
/// Hem Web yönetim paneli hem de Mobil İşletme uygulaması için tek ve optimize edilmiş kaynaktır.
/// </summary>
public sealed record MerchantFinanceSummaryDto(
    Guid MerchantId,
    string MerchantName,
    decimal DefaultPackageFee,
    int TotalDeliveredCount,
    decimal TotalCashAmount,
    decimal TotalOnlineAmount,
    decimal TotalCardAmount,
    decimal TotalDirectRevenue,
    decimal TotalFirmDeliveryFee,
    decimal NetSettlementBalance,
    string SettlementDirection, // "CourierFirmOwesMerchant", "MerchantOwesCourierFirm", "Balanced"
    double AverageDeliveryDurationMinutes,
    IReadOnlyList<CourierDeliveryBreakdownDto> Couriers,
    IReadOnlyList<MerchantFinanceOrderDto> Orders
);

/// <summary>
/// Restoranın paketlerini taşıyan kuryelerin teslimat ve nakit dağılımı.
/// </summary>
public sealed record CourierDeliveryBreakdownDto(
    Guid CourierId,
    string FullName,
    string PhoneNumber,
    string PlateNumber,
    int DeliveredCount,
    decimal CashCollected
);

/// <summary>
/// Mahsuplaşmaya dahil edilen tekil sipariş detayı.
/// </summary>
public sealed record MerchantFinanceOrderDto(
    Guid OrderId,
    string OrderCode,
    string CustomerName,
    string CustomerPhoneNumber,
    string DeliveryAddress,
    string PaymentMethod,
    decimal TotalOrderAmount,
    decimal PackageFee,
    decimal NetCashEffect,
    Guid? CourierId,
    string? CourierName,
    string? PlateNumber,
    DateTime CreatedAt,
    DateTime? DeliveredAt,
    int? DeliveryDurationMinutes,
    string? DeliveryDurationFormatted
);

