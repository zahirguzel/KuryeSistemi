using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.DTOs.Orders;

/// <summary>
/// Sunucu taraflı sipariş listeleme sorgusu. Tenant kapsamı (MerchantIds) controller tarafından
/// çağıranın erişim hakkına göre doldurulur; null = kısıtsız (SuperAdmin).
/// </summary>
public sealed record OrderListQuery(
    IReadOnlyCollection<Guid>? MerchantIds,
    Guid? MerchantId = null,
    IReadOnlyCollection<OrderStatus>? Statuses = null,
    string? Search = null,
    DateTime? FromUtc = null,
    DateTime? ToUtc = null,
    bool SortDesc = true,
    int Page = 1,
    int Size = 50);

/// <summary>Sayfalı sipariş listesi + durum bazlı sayaçlar (durum filtresi hariç diğer filtrelerle hesaplanır).</summary>
public sealed record OrderPageDto(
    IReadOnlyList<OrderDto> Items,
    int Total,
    int Page,
    int Size,
    int TotalPages,
    IReadOnlyDictionary<string, int> StatusCounts,
    int DeliveredToday);
