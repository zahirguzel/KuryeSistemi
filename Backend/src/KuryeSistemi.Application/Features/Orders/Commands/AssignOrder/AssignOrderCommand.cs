using KuryeSistemi.Application.Features.Orders.DTOs;
using MediatR;

namespace KuryeSistemi.Application.Features.Orders.Commands.AssignOrder;

/// <summary>
/// Bir siparişe kurye atama komutu.
/// Bu command çalıştığında:
///   - Order.CourierId güncellenir
///   - Order.Status → Assigned (1) yapılır
///   - Courier.IsAvailable → false yapılır
/// </summary>
public sealed record AssignOrderCommand(
    Guid OrderId,
    Guid CourierId
) : IRequest<OrderDto>;
