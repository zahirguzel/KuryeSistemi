// Application/DTOs/Merchants/CourierReconciliationDto.cs

namespace KuryeSistemi.Application.DTOs.Merchants;

/// <summary>
/// İşletme - Kurye gün sonu nakit kasa mahsuplaşması sonuç DTO'su.
/// </summary>
public sealed record CourierReconciliationDto(
    Guid CourierId,
    string CourierFullName,
    decimal SettledAmount,
    decimal NewBalance,
    DateTime ReconciledAt,
    string Message
);
