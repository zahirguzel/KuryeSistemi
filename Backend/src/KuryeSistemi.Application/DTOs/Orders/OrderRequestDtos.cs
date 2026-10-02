// DTOs/Orders/OrderRequestDtos.cs

using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.DTOs.Orders;

public sealed record CreateOrderRequestDto(
    Guid MerchantId = default,
    string? PickupAddressLine = null,
    string? PickupDistrict = null,
    string? PickupCity = null,
    decimal PickupLatitude = 0m,
    decimal PickupLongitude = 0m,
    string DeliveryAddressLine = "",
    string DeliveryDistrict = "İskenderun",
    string DeliveryCity = "Hatay",
    decimal DeliveryLatitude = 0m,
    decimal DeliveryLongitude = 0m,
    string RecipientName = "",
    string RecipientPhone = "",
    string? Notes = null,
    PaymentMethod PaymentMethod = PaymentMethod.Online,
    decimal TotalOrderAmount = 0.00m,
    string? OrderCode = null,
    string? Source = "Direct",
    string? DeliveryNeighborhood = null
);

public sealed record AssignOrderRequestDto(Guid CourierId);

public sealed record UpdateOrderStatusRequestDto(OrderStatus NewStatus);
