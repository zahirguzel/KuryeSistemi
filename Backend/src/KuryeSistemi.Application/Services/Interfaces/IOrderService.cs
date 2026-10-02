// Services/Interfaces/IOrderService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Orders;
using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.Services.Interfaces;

public interface IOrderService
{
    Task<ServiceResult<OrderPageDto>> GetOrdersPagedAsync(OrderListQuery query, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<OrderDto>>> GetAllOrdersAsync(OrderStatus? status = null, bool todayAndActiveOnly = false, IReadOnlyCollection<Guid>? merchantIds = null, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<OrderDto>>> GetActiveOrdersAsync(Guid merchantId, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<OrderDto>>> GetOrdersByMerchantAsync(Guid merchantId, OrderStatus? status, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<OrderDto>>> GetMerchantTodayOrdersAsync(Guid merchantId, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<OrderDto>>> GetCourierActiveOrdersAsync(Guid? courierId, CancellationToken cancellationToken = default);
    Task<ServiceResult<OrderDto>> CreateOrderAsync(CreateOrderRequestDto request, CancellationToken cancellationToken = default);
    Task<ServiceResult<OrderDto>> AssignOrderAsync(Guid orderId, Guid courierId, CancellationToken cancellationToken = default);
    Task<ServiceResult<OrderDto>> ClaimOrderAsync(Guid orderId, Guid courierId, CancellationToken cancellationToken = default);
    /// <summary>Akıllı GPS modunda kurye atanamamış bekleyen siparişleri yeniden dener. Atanan sayıyı döner.</summary>
    Task<int> RetryUnassignedSmartAutoOrdersAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<OrderDto>> UpdateStatusAsync(Guid orderId, OrderStatus newStatus, Guid? courierId = null, CancellationToken cancellationToken = default);
}
