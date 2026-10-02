// DTOs/Wallet/CourierEarningsDto.cs

namespace KuryeSistemi.Application.DTOs.Wallet;

public sealed record CourierEarningsDto(
    Guid CourierId,
    string CourierName,
    DateTime Date,
    decimal TotalEarnings,
    int DeliveredPackageCount,
    decimal AveragePerPackage,
    IReadOnlyList<DeliveryHistoryItemDto> Deliveries
);
