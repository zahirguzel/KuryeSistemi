// DTOs/Wallet/DeliveryHistoryItemDto.cs

namespace KuryeSistemi.Application.DTOs.Wallet;

/// <summary>
/// Kuryenin teslim geçmişindeki tek bir teslimat. İlk 6 alan liste görünümü içindir;
/// geri kalanlar detay ekranında gösterilir. Müşteri telefonu maskelenmiş olarak döner.
/// </summary>
public sealed record DeliveryHistoryItemDto(
    Guid OrderId,
    string ShortCode,
    string RecipientName,
    string DeliveryAddress,
    DateTime DeliveredAt,
    decimal Earning,
    string? OrderCode = null,
    string? MerchantName = null,
    string? PickupAddress = null,
    string? DeliveryAddressFull = null,
    string? RecipientPhoneMasked = null,
    string? PaymentMethod = null,
    decimal TotalOrderAmount = 0m,
    string? Notes = null,
    DateTime? CreatedAt = null,
    DateTime? AssignedAt = null,
    DateTime? PickedUpAt = null,
    double? DistanceKm = null
);
