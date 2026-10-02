// Repositories/Interfaces/IOrderRepository.cs

using KuryeSistemi.Application.DTOs.Orders;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.Repositories.Interfaces;

/// <summary>Sayfalı sorgu sonucu: bu sayfanın kayıtları, filtreye uyan toplam, durum sayaçları ve bugün teslim sayısı.</summary>
public sealed record OrderPageResult(
    IReadOnlyList<Order> Items,
    int Total,
    IReadOnlyDictionary<OrderStatus, int> StatusCounts,
    int DeliveredToday);

public interface IOrderRepository : IGenericRepository<Order>
{
    Task<OrderPageResult> GetPagedAsync(OrderListQuery query);
    Task<IReadOnlyList<Order>> GetAllWithDetailsAsync(OrderStatus? status = null, bool todayAndActiveOnly = false, IReadOnlyCollection<Guid>? merchantIds = null);
    Task<IReadOnlyList<Order>> GetActiveOrdersByMerchantAsync(Guid merchantId);
    Task<IReadOnlyList<Order>> GetOrdersByMerchantAsync(Guid merchantId, OrderStatus? status);
    Task<IReadOnlyList<Order>> GetMerchantTodayOrdersAsync(Guid merchantId);
    Task<IReadOnlyList<Order>> GetCourierActiveOrdersAsync(Guid? courierId);
    Task<int> CountActiveOrdersByCourierAsync(Guid courierId);
    Task<IReadOnlyList<Order>> GetDeliveredOrdersByCourierAndDateAsync(Guid courierId, DateTime date);
    Task<IReadOnlyList<Order>> GetDeliveredOrdersByCourierAndDateRangeAsync(Guid courierId, DateTime startDate, DateTime endDate);
}

