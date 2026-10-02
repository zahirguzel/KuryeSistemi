// Services/Interfaces/IOrderService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Orders;
using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.Services.Interfaces;

public interface IOrderService
{
    Task<ServiceResult<IReadOnlyList<OrderDto>>> GetAllOrdersAsync(OrderStatus? status = null, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<OrderDto>>> GetActiveOrdersAsync(Guid merchantId, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<OrderDto>>> GetOrdersByMerchantAsync(Guid merchantId, OrderStatus? status, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<OrderDto>>> GetMerchantTodayOrdersAsync(Guid merchantId, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<OrderDto>>> GetCourierActiveOrdersAsync(Guid? courierId, CancellationToken cancellationToken = default);
    Task<ServiceResult<OrderDto>> CreateOrderAsync(CreateOrderRequestDto request, CancellationToken cancellationToken = default);
    Task<ServiceResult<OrderDto>> AssignOrderAsync(Guid orderId, Guid courierId, CancellationToken cancellationToken = default);
    Task<ServiceResult<OrderDto>> ClaimOrderAsync(Guid orderId, Guid courierId, CancellationToken cancellationToken = default);
    Task<ServiceResult<OrderDto>> UpdateStatusAsync(Guid orderId, OrderStatus newStatus, Guid? courierId = null, CancellationToken cancellationToken = default);
}
