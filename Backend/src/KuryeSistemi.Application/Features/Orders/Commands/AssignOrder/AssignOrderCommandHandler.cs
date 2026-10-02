using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Features.Orders.Commands.AssignOrder;

/// <summary>
/// AssignOrderCommand'ı işleyen handler.
///
/// İş Kuralları:
///   1. Sipariş mevcut ve Pending durumunda olmalıdır (sadece Pending atanabilir).
///   2. Kurye mevcut ve IsAvailable = true olmalıdır.
///   3. Atama sonrası Courier.IsAvailable = false yapılır.
///   4. Order.Status → Assigned, Order.CourierId set edilir.
/// </summary>
public sealed class AssignOrderCommandHandler
    : IRequestHandler<AssignOrderCommand, OrderDto>
{
    private readonly IApplicationDbContext _db;

    public AssignOrderCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<OrderDto> Handle(
        AssignOrderCommand command,
        CancellationToken cancellationToken)
    {
        // --- Sipariş var mı? ---
        var order = await _db.Orders
            .FirstOrDefaultAsync(o => o.Id == command.OrderId, cancellationToken);

        if (order is null)
            throw new InvalidOperationException(
                $"Sipariş '{command.OrderId}' bulunamadı.");

        // --- State Machine: Sadece Pending sipariş atanabilir ---
        if (order.Status != OrderStatus.Pending)
            throw new InvalidOperationException(
                $"Sipariş '{command.OrderId}' Pending durumunda değil. " +
                $"Mevcut durum: {order.Status}. Sadece Pending siparişlere kurye atanabilir.");

        // --- Kurye var mı? ---
        var courier = await _db.Couriers
            .FirstOrDefaultAsync(c => c.Id == command.CourierId, cancellationToken);

        if (courier is null)
            throw new InvalidOperationException(
                $"Kurye '{command.CourierId}' bulunamadı.");

        // --- Kurye müsait mi? ---
        if (!courier.IsAvailable)
            throw new InvalidOperationException(
                $"Kurye '{courier.FirstName} {courier.LastName}' şu anda müsait değil. " +
                $"Aktif bir siparişi bulunuyor olabilir.");

        // --- Tenant kontrolü: Kurye ve sipariş aynı işletmeye mi ait? ---
        if (courier.MerchantId.HasValue && courier.MerchantId.Value != order.MerchantId)
            throw new InvalidOperationException(
                "Kurye, bu siparişin ait olduğu işletmeye kayıtlı değil.");

        // --- Atama işlemi ---
        order.CourierId    = courier.Id;
        order.Status       = OrderStatus.Assigned;
        order.UpdatedBy    = "system"; // İleride ICurrentUserService'ten

        // --- Kuryeyi meşgul et ---
        courier.IsAvailable = false;
        courier.UpdatedBy   = "system";

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
}
