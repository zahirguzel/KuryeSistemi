// Repositories/OrderRepository.cs

using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using KuryeSistemi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Infrastructure.Repositories;

public class OrderRepository : GenericRepository<Order>, IOrderRepository
{
    public OrderRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Order>> GetAllWithDetailsAsync(OrderStatus? status = null)
    {
        var query = _dbSet
            .AsNoTracking()
            .Include(o => o.Courier)
            .Include(o => o.Merchant)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status.Value);
        }

        return await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Order>> GetActiveOrdersByMerchantAsync(Guid merchantId)
    {
        var activeStatuses = new[] { OrderStatus.Pending, OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.Assigned, OrderStatus.PickedUp };

        return await _dbSet
            .AsNoTracking()
            .Include(o => o.Courier)
            .Include(o => o.Merchant)
            .Where(o => o.MerchantId == merchantId && activeStatuses.Contains(o.Status))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Order>> GetOrdersByMerchantAsync(Guid merchantId, OrderStatus? status)
    {
        var query = _dbSet
            .AsNoTracking()
            .Include(o => o.Courier)
            .Include(o => o.Merchant)
            .Where(o => o.MerchantId == merchantId);

        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status.Value);
        }

        return await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Order>> GetMerchantTodayOrdersAsync(Guid merchantId)
    {
        var nowTurkey = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TurkeyTz).Date;
        var startOfDayUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(nowTurkey, DateTimeKind.Unspecified), TurkeyTz);
        var endOfDayUtc = startOfDayUtc.AddDays(1);
        var activeStatuses = new[] { OrderStatus.Pending, OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.Assigned, OrderStatus.PickedUp };

        return await _dbSet
            .AsNoTracking()
            .Include(o => o.Courier)
            .Include(o => o.Merchant)
            .Where(o => o.MerchantId == merchantId &&
                       ((o.CreatedAt >= startOfDayUtc && o.CreatedAt < endOfDayUtc) || activeStatuses.Contains(o.Status)))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Order>> GetCourierActiveOrdersAsync(Guid? courierId)
    {
        return await _dbSet
            .AsNoTracking()
            .Include(o => o.Merchant)
            .Include(o => o.Courier)
            .Where(o =>
                (courierId.HasValue && o.CourierId == courierId.Value && (o.Status == OrderStatus.Assigned || o.Status == OrderStatus.PickedUp)) ||
                (o.CourierId == null && (o.Status == OrderStatus.Pending || o.Status == OrderStatus.Ready) && o.Merchant.DispatchMode == DispatchMode.Pool))
            .OrderByDescending(o => courierId.HasValue && o.CourierId == courierId.Value)
            .ThenByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<int> CountActiveOrdersByCourierAsync(Guid courierId)
    {
        return await _dbSet
            .CountAsync(o => o.CourierId == courierId &&
                             (o.Status == OrderStatus.Assigned || o.Status == OrderStatus.PickedUp));
    }

    public async Task<Order?> GetWithDetailsAsync(Guid id)
    {
        return await _dbSet
            .Include(o => o.Courier)
            .Include(o => o.Merchant)
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    private static readonly TimeZoneInfo TurkeyTz =
        TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "Turkey Standard Time" : "Europe/Istanbul");

    public async Task<IReadOnlyList<Order>> GetDeliveredOrdersByCourierAndDateAsync(Guid courierId, DateTime date)
    {
        var dtUtc = date.Kind == DateTimeKind.Utc ? date : DateTime.SpecifyKind(date, DateTimeKind.Utc);
        var localDate = TimeZoneInfo.ConvertTimeFromUtc(dtUtc, TurkeyTz).Date;
        var startUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localDate, DateTimeKind.Unspecified), TurkeyTz);
        var endUtc = startUtc.AddDays(1);

        return await _dbSet
            .AsNoTracking()
            .Where(o => o.CourierId == courierId
                     && o.Status == OrderStatus.Delivered
                     && o.DeliveredAt.HasValue
                     && o.DeliveredAt.Value >= startUtc
                     && o.DeliveredAt.Value < endUtc)
            .OrderByDescending(o => o.DeliveredAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Order>> GetDeliveredOrdersByCourierAndDateRangeAsync(Guid courierId, DateTime startDate, DateTime endDate)
    {
        var startDtUtc = startDate.Kind == DateTimeKind.Utc ? startDate : DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        var endDtUtc = endDate.Kind == DateTimeKind.Utc ? endDate : DateTime.SpecifyKind(endDate, DateTimeKind.Utc);

        var localStart = TimeZoneInfo.ConvertTimeFromUtc(startDtUtc, TurkeyTz).Date;
        var localEnd = TimeZoneInfo.ConvertTimeFromUtc(endDtUtc, TurkeyTz).Date;

        var startUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localStart, DateTimeKind.Unspecified), TurkeyTz);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localEnd, DateTimeKind.Unspecified), TurkeyTz).AddDays(1);

        return await _dbSet
            .AsNoTracking()
            .Where(o => o.CourierId == courierId
                     && o.Status == OrderStatus.Delivered
                     && o.DeliveredAt.HasValue
                     && o.DeliveredAt.Value >= startUtc
                     && o.DeliveredAt.Value < endUtc)
            .OrderByDescending(o => o.DeliveredAt)
            .ToListAsync();
    }
}

