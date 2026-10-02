namespace KuryeSistemi.Application.DTOs.Merchants;

/// <summary>
/// İşletme ile kurye arasındaki kasa mahsuplaşma geçmiş kaydı DTO'su.
/// </summary>
public sealed record CashSettlementDto(
    Guid Id,
    Guid MerchantId,
    Guid CourierId,
    string CourierFullName,
    string CourierPhoneNumber,
    decimal SettledAmount,
    decimal CashCollectedTotal,
    decimal CourierEarningsTotal,
    int DeliveredPackageCount,
    DateTime SettledAt,
    string? Notes
);
