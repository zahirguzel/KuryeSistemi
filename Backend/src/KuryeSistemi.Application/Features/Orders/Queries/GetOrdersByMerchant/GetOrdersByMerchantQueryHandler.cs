using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Features.Orders.Queries.GetOrdersByMerchant;

/// <summary>
/// GetOrdersByMerchantQuery'yi işleyen handler.
///
/// Performans notları:
///   - AsNoTracking(): Read-only sorgu, change tracking maliyeti yoktur.
///   - Dinamik Where: EF Core, null kontrolünü SQL'e parametre olarak iter
///     (index kullanımı korunur, expression tree derlenmez).
///   - IX_Orders_MerchantId_Status composite index bu sorguyu karşılar.
///   - OrderByDescending(CreatedAt): En yeni sipariş üstte.
/// </summary>
public sealed class GetOrdersByMerchantQueryHandler
    : IRequestHandler<GetOrdersByMerchantQuery, List<OrderDto>>
{
    private readonly IApplicationDbContext _db;

    public GetOrdersByMerchantQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<OrderDto>> Handle(
        GetOrdersByMerchantQuery query,
        CancellationToken cancellationToken)
    {
        var orders = _db.Orders
            .AsNoTracking()
            .Where(o => o.MerchantId == query.MerchantId);

        // Opsiyonel Status filtresi — null gelirse tüm siparişler döner.
        if (query.Status.HasValue)
            orders = orders.Where(o => o.Status == query.Status.Value);

        return await orders
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new OrderDto(
                o.Id,
                o.MerchantId,
                o.CourierId,
                o.PickupAddressLine,
                o.PickupDistrict,
                o.PickupCity,
                o.PickupLatitude,
                o.PickupLongitude,
                o.DeliveryAddressLine,
                o.DeliveryDistrict,
                o.DeliveryCity,
                o.DeliveryLatitude,
                o.DeliveryLongitude,
                o.RecipientName,
                o.RecipientPhone,
                o.Notes,
                o.Status,
                o.PickedUpAt,
                o.DeliveredAt,
                o.CreatedAt,
                o.CourierEarning,
                o.PaymentMethod,
                o.TotalOrderAmount,
                o.Courier != null ? (o.Courier.FirstName + " " + o.Courier.LastName).Trim() : null,
                o.Merchant != null ? o.Merchant.Name : null,
                o.OrderCode,
                o.Source,
                o.DeliveryNeighborhood,
                o.EstimatedDistanceKm,
                o.EstimatedDeliveryMinutes,
                o.AssignedAt))
            .ToListAsync(cancellationToken);
    }
}
