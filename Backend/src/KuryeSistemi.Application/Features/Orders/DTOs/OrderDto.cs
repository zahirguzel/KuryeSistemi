using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.Features.Orders.DTOs;

/// <summary>
/// Order entity'sinin dışarıya açılan veri transfer nesnesi.
/// Hem alım hem teslim adres bilgilerini ve mevcut durumu içerir.
/// </summary>
public sealed record OrderDto(
    Guid        Id,
    Guid        MerchantId,
    Guid?       CourierId,
    // Alım adresi
    string      PickupAddressLine,
    string      PickupDistrict,
    string      PickupCity,
    decimal     PickupLatitude,
    decimal     PickupLongitude,
    // Teslim adresi
    string      DeliveryAddressLine,
    string      DeliveryDistrict,
    string      DeliveryCity,
    decimal     DeliveryLatitude,
    decimal     DeliveryLongitude,
    // Alıcı & Durum
    string      RecipientName,
    string      RecipientPhone,
    string?     Notes,
    OrderStatus Status,
    DateTime?   PickedUpAt,
    DateTime?   DeliveredAt,
    DateTime    CreatedAt,
    decimal     CourierEarning,
    PaymentMethod PaymentMethod = PaymentMethod.Online,
    decimal     TotalOrderAmount = 0.00m,
    string?     CourierName = null,
    string?     MerchantName = null,
    string?     OrderCode = null,
    string?     Source = null,
    string?     DeliveryNeighborhood = null,
    double?     EstimatedDistanceKm = null,
    int?        EstimatedDeliveryMinutes = null,
    DateTime?   AssignedAt = null
);
