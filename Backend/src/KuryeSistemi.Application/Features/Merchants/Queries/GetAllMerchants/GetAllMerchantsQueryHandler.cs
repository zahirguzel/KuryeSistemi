using KuryeSistemi.Application.Features.Merchants.DTOs;
using KuryeSistemi.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Features.Merchants.Queries.GetAllMerchants;

/// <summary>
/// GetAllMerchantsQuery'yi işleyen handler.
/// Global Query Filter sayesinde IsDeleted=true olanlar otomatik elenir.
/// AsNoTracking ile read-only sorgu performansı optimize edilir.
/// </summary>
public sealed class GetAllMerchantsQueryHandler
    : IRequestHandler<GetAllMerchantsQuery, List<MerchantDto>>
{
    private readonly IApplicationDbContext _db;

    public GetAllMerchantsQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<MerchantDto>> Handle(
        GetAllMerchantsQuery query,
        CancellationToken cancellationToken)
    {
        return await _db.Merchants
            .AsNoTracking()
            .OrderBy(m => m.Name)
            .Select(m => new MerchantDto(
                m.Id,
                m.Name,
                m.Email,
                m.PhoneNumber,
                m.Address,
                m.IsActive,
                m.IsOpen,
                m.Latitude,
                m.Longitude,
                m.CreatedAt,
                m.DefaultPackageFee,
                m.DispatchMode,
                m.ReconciliationPeriod,
                m.CourierCutFee,
                m.HexagonSizeMeters,
                m.MaxCourierDistanceKm,
                m.MaxOrdersPerTour,
                m.OrderBatchingTimeMinutes,
                m.CrossRestaurantDistanceMeters))
            .ToListAsync(cancellationToken);
    }
}
