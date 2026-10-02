// DTOs/Wallet/DeliveryHistoryItemDto.cs

namespace KuryeSistemi.Application.DTOs.Wallet;

public sealed record DeliveryHistoryItemDto(
    Guid OrderId,
    string ShortCode,
    string RecipientName,
    string DeliveryAddress,
    DateTime DeliveredAt,
    decimal Earning
);
