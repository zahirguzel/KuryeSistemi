using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Features.Orders.Commands.CreateOrder;

/// <summary>
/// CreateOrderCommand'ı işleyen handler.
/// İşletme varlığını doğrular, OrderStatus'u zorla Pending olarak atar
/// ve yeni Order kaydını oluşturur.
/// </summary>
public sealed class CreateOrderCommandHandler
    : IRequestHandler<CreateOrderCommand, OrderDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IBackgroundJobService _jobService;

    public CreateOrderCommandHandler(
        IApplicationDbContext db,
        IBackgroundJobService jobService)
    {
        _db = db;
        _jobService = jobService;
    }

    public async Task<OrderDto> Handle(
        CreateOrderCommand command,
        CancellationToken cancellationToken)
    {
        // --- İşletme var mı? (Tenant doğrulaması) ---
        var merchantExists = await _db.Merchants
            .AnyAsync(m => m.Id == command.MerchantId, cancellationToken);

        if (!merchantExists)
            throw new InvalidOperationException(
                $"MerchantId '{command.MerchantId}' bulunamadı.");

        // --- Sipariş oluştur ---
        // Status dışarıdan alınmaz; state machine gereği Pending olarak sabitlenir.
        var order = new Order
        {
            MerchantId          = command.MerchantId,
            CourierId           = null, // Kurye ataması ayrı bir Command ile yapılacak
            Status              = OrderStatus.Pending,
            // Alım Adresi
            PickupAddressLine   = command.PickupAddressLine.Trim(),
            PickupDistrict      = command.PickupDistrict.Trim(),
            PickupCity          = command.PickupCity.Trim(),
            PickupLatitude      = command.PickupLatitude,
            PickupLongitude     = command.PickupLongitude,
            // Teslim Adresi
            DeliveryAddressLine = command.DeliveryAddressLine.Trim(),
            DeliveryDistrict    = command.DeliveryDistrict.Trim(),
            DeliveryCity        = command.DeliveryCity.Trim(),
            DeliveryLatitude    = command.DeliveryLatitude,
            DeliveryLongitude   = command.DeliveryLongitude,
            // Alıcı
            RecipientName       = command.RecipientName.Trim(),
            RecipientPhone      = command.RecipientPhone.Trim(),
            Notes               = command.Notes?.Trim(),
            PaymentMethod       = command.PaymentMethod,
            TotalOrderAmount    = command.TotalOrderAmount,
            CreatedBy           = "system" // İleride ICurrentUserService'ten alınacak
        };

        _db.Orders.Add(order);
        await _db.SaveChangesAsync(cancellationToken);

        // --- 15 dakika kurye atanmazsa otomatik iptal eden gecikmeli görevi planla ---
        _jobService.ScheduleUnassignedOrderCheck(order.Id, TimeSpan.FromMinutes(15));

        return MapToDto(order);
    }

    private static OrderDto MapToDto(Order order) => new(
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
