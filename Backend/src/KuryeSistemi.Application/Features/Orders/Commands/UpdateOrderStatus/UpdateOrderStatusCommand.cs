using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Domain.Enums;
using MediatR;

namespace KuryeSistemi.Application.Features.Orders.Commands.UpdateOrderStatus;

/// <summary>
/// Sipariş durumunu güncelleyen komut.
/// Geçerli geçişler (State Machine):
///   Assigned  → PickedUp
///   PickedUp  → Delivered
///   Pending | Assigned → Cancelled
/// </summary>
public sealed record UpdateOrderStatusCommand(
    Guid        OrderId,
    OrderStatus NewStatus
) : IRequest<OrderDto>;
