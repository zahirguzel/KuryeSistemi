using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Domain.Enums;
using MediatR;

namespace KuryeSistemi.Application.Features.Orders.Queries.GetOrdersByMerchant;

/// <summary>
/// Bir işletmenin siparişlerini listeleyen sorgu.
/// MerchantId zorunludur — tenant izolasyonu.
/// Status opsiyoneldir: null → tüm siparişler, değer varsa → sadece o statü.
/// Sonuçlar her zaman en yeni sipariş üstte gelecek şekilde sıralanır.
/// </summary>
public sealed record GetOrdersByMerchantQuery(
    Guid         MerchantId,
    OrderStatus? Status = null
) : IRequest<List<OrderDto>>;
