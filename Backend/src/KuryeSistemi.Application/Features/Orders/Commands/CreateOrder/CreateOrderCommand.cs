using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Application.Interfaces;
using MediatR;

namespace KuryeSistemi.Application.Features.Orders.Commands.CreateOrder;

/// <summary>
/// Yeni sipariş oluşturma komutu.
/// OrderStatus otomatik olarak Pending atanır — handler dışından geçirilmez.
/// CourierId oluşturma anında null'dır; kurye ataması ayrı bir Command ile yapılacak.
/// ICacheRemoverCommand: Yeni sipariş eklendiğinde işletmenin aktif sipariş önbelleği temizlenir.
/// </summary>
public sealed record CreateOrderCommand(
    Guid    MerchantId,
    // Alım Adresi
    string  PickupAddressLine,
    string  PickupDistrict,
    string  PickupCity,
    decimal PickupLatitude,
    decimal PickupLongitude,
    // Teslim Adresi
    string  DeliveryAddressLine,
    string  DeliveryDistrict,
    string  DeliveryCity,
    decimal DeliveryLatitude,
    decimal DeliveryLongitude,
    // Alıcı Bilgileri
    string  RecipientName,
    string  RecipientPhone,
    string? Notes,
    KuryeSistemi.Domain.Enums.PaymentMethod PaymentMethod = KuryeSistemi.Domain.Enums.PaymentMethod.Online,
    decimal TotalOrderAmount = 0.00m
) : IRequest<OrderDto>, ICacheRemoverCommand
{
    public string CacheKey => $"orders:active:merchant:{MerchantId}";
}
