using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Features.Orders.Commands.UpdateOrderStatus;

/// <summary>
/// UpdateOrderStatusCommand'ı işleyen handler.
///
/// State Machine Geçiş Matrisi:
/// ┌──────────────┬──────────────────────────────┐
/// │  Mevcut      │  İzin Verilen Hedef Durumlar  │
/// ├──────────────┼──────────────────────────────┤
/// │  Pending     │  Cancelled                   │
/// │  Assigned    │  PickedUp, Cancelled         │
/// │  PickedUp    │  Delivered                   │
/// │  Delivered   │  (Terminal — değişemez)      │
/// │  Cancelled   │  (Terminal — değişemez)      │
/// └──────────────┴──────────────────────────────┘
///
/// Yan Etkiler:
///   - PickedUp  → Order.PickedUpAt   = UtcNow
///   - Delivered → Order.DeliveredAt  = UtcNow  |  Courier.IsAvailable = true
///   - Cancelled → Courier.IsAvailable = true (eğer atanmış kurye varsa)
/// </summary>
public sealed class UpdateOrderStatusCommandHandler
    : IRequestHandler<UpdateOrderStatusCommand, OrderDto>
{
    private readonly IApplicationDbContext _db;

    // Geçiş matrisi: her mevcut durum için izin verilen hedef durumlar
    private static readonly Dictionary<OrderStatus, HashSet<OrderStatus>> AllowedTransitions = new()
    {
        [OrderStatus.Pending]   = [OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.Assigned, OrderStatus.Cancelled],
        [OrderStatus.Preparing] = [OrderStatus.Ready, OrderStatus.Assigned, OrderStatus.Cancelled, OrderStatus.Pending],
        [OrderStatus.Ready]     = [OrderStatus.Assigned, OrderStatus.PickedUp, OrderStatus.Cancelled, OrderStatus.Preparing],
        [OrderStatus.Assigned]  = [OrderStatus.PickedUp, OrderStatus.Ready, OrderStatus.Cancelled],
        [OrderStatus.PickedUp]  = [OrderStatus.Delivered, OrderStatus.Cancelled],
        [OrderStatus.Delivered] = [],   // Terminal
        [OrderStatus.Cancelled] = []    // Terminal
    };

    public UpdateOrderStatusCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<OrderDto> Handle(
        UpdateOrderStatusCommand command,
        CancellationToken cancellationToken)
    {
        // --- Sipariş var mı? ---
        var order = await _db.Orders
            .FirstOrDefaultAsync(o => o.Id == command.OrderId, cancellationToken);

        if (order is null)
            throw new InvalidOperationException(
                $"Sipariş '{command.OrderId}' bulunamadı.");

        // --- State Machine doğrulaması ---
        if (!AllowedTransitions.TryGetValue(order.Status, out var allowed)
            || !allowed.Contains(command.NewStatus))
        {
            throw new InvalidOperationException(
                $"Geçersiz durum geçişi: '{order.Status}' → '{command.NewStatus}'. " +
                $"İzin verilen geçişler: [{string.Join(", ", AllowedTransitions[order.Status])}]");
        }

        var now = DateTime.UtcNow;

        // --- Duruma göre yan etkileri uygula ---
        switch (command.NewStatus)
        {
            case OrderStatus.PickedUp:
                order.PickedUpAt = now;
                break;

            case OrderStatus.Delivered:
                order.DeliveredAt = now;
                var merchant = await _db.Merchants.FirstOrDefaultAsync(m => m.Id == order.MerchantId, cancellationToken);
                decimal fee = (merchant != null && merchant.CourierCutFee > 0) ? merchant.CourierCutFee : 40.00m;
                order.CourierEarning = fee;
                // Kuryeyi tekrar müsait yap
                if (order.CourierId.HasValue)
                    await FreeCourierAsync(order.CourierId.Value, cancellationToken);
                break;

            case OrderStatus.Cancelled:
                // İptal durumunda kurye varsa serbest bırak
                if (order.CourierId.HasValue)
                    await FreeCourierAsync(order.CourierId.Value, cancellationToken);
                break;
        }

        // --- Durum güncelle ---
        order.Status    = command.NewStatus;
        order.UpdatedBy = "system"; // İleride ICurrentUserService'ten

        await _db.SaveChangesAsync(cancellationToken);

        return new OrderDto(
            order.Id,
            order.MerchantId,
            order.CourierId,
            order.PickupAddressLine,
            order.PickupDistrict,
            order.PickupCity,
            order.PickupLatitude,
            order.PickupLongitude,
            order.DeliveryAddressLine,
            order.DeliveryDistrict,
            order.DeliveryCity,
            order.DeliveryLatitude,
            order.DeliveryLongitude,
            order.RecipientName,
            order.RecipientPhone,
            order.Notes,
            order.Status,
            order.PickedUpAt,
            order.DeliveredAt,
            order.CreatedAt,
            order.CourierEarning,
            order.PaymentMethod,
            order.TotalOrderAmount);
    }

    /// <summary>Kuryenin IsAvailable bayrağını true'ya çeker.</summary>
    private async Task FreeCourierAsync(Guid courierId, CancellationToken cancellationToken)
    {
        var courier = await _db.Couriers
            .FirstOrDefaultAsync(c => c.Id == courierId, cancellationToken);

        if (courier is not null)
        {
            courier.IsAvailable = true;
            courier.UpdatedBy   = "system";
        }
    }
}
