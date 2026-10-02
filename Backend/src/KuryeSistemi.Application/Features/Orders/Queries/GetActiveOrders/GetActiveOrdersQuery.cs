using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Application.Interfaces;
using MediatR;

namespace KuryeSistemi.Application.Features.Orders.Queries.GetActiveOrders;

/// <summary>
/// Aktif siparişleri getiren sorgu.
/// "Aktif" = Delivered veya Cancelled olmayan siparişler (Pending, Assigned, PickedUp).
/// MerchantId ile tenant izolasyonu sağlanır.
/// ICacheableQuery arayüzü sayesinde Redis üzerinden önbelleklenir.
/// </summary>
public sealed record GetActiveOrdersQuery(Guid MerchantId)
    : IRequest<List<OrderDto>>, ICacheableQuery
{
    public string CacheKey => $"orders:active:merchant:{MerchantId}";
    public TimeSpan? SlidingExpiration => TimeSpan.FromMinutes(2);
}
