// Repositories/Interfaces/IOrderRepository.cs

using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.Repositories.Interfaces;

public interface IOrderRepository : IGenericRepository<Order>
{
    Task<IReadOnlyList<Order>> GetAllWithDetailsAsync(OrderStatus? status = null, bool todayAndActiveOnly = false);
    Task<IReadOnlyList<Order>> GetActiveOrdersByMerchantAsync(Guid merchantId);
    Task<IReadOnlyList<Order>> GetOrdersByMerchantAsync(Guid merchantId, OrderStatus? status);
    Task<IReadOnlyList<Order>> GetMerchantTodayOrdersAsync(Guid merchantId);
    Task<IReadOnlyList<Order>> GetCourierActiveOrdersAsync(Guid? courierId);
    Task<int> CountActiveOrdersByCourierAsync(Guid courierId);
    Task<IReadOnlyList<Order>> GetDeliveredOrdersByCourierAndDateAsync(Guid courierId, DateTime date);
    Task<IReadOnlyList<Order>> GetDeliveredOrdersByCourierAndDateRangeAsync(Guid courierId, DateTime startDate, DateTime endDate);
}

