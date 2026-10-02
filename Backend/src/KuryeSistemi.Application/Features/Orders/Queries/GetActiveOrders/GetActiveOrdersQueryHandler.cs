using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Features.Orders.Queries.GetActiveOrders;

/// <summary>
/// GetActiveOrdersQuery'yi işleyen handler.
/// Aktif sipariş tanımı: Pending, Assigned veya PickedUp durumundaki siparişler.
/// Composite index (MerchantId + Status) bu sorguyu veritabanında hızlandırır.
/// </summary>
public sealed class GetActiveOrdersQueryHandler
    : IRequestHandler<GetActiveOrdersQuery, List<OrderDto>>
{
    private readonly IApplicationDbContext _db;

    // Aktif sayılan durumlar — sabit bir set olarak tanımlanır (boxing yok)
    private static readonly OrderStatus[] ActiveStatuses =
    [
        OrderStatus.Pending,
        OrderStatus.Preparing,
        OrderStatus.Ready,
        OrderStatus.Assigned,
        OrderStatus.PickedUp
    ];

    public GetActiveOrdersQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<OrderDto>> Handle(
        GetActiveOrdersQuery query,
        CancellationToken cancellationToken)
    {
        return await _db.Orders
            .AsNoTracking()
            .Where(o => o.MerchantId == query.MerchantId
                     && ActiveStatuses.Contains(o.Status))
            .OrderByDescending(o => o.CreatedAt) // En yeni sipariş üstte
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
