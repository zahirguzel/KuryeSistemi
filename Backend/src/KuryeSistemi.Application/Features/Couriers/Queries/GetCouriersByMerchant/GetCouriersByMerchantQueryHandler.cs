using KuryeSistemi.Application.Features.Couriers.DTOs;
using KuryeSistemi.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Features.Couriers.Queries.GetCouriersByMerchant;

/// <summary>
/// GetCouriersByMerchantQuery'yi işleyen handler.
/// Sadece belirtilen MerchantId'ye ait kuryeleri getirir.
/// Global Query Filter sayesinde IsDeleted=true olanlar otomatik elenir.
/// </summary>
public sealed class GetCouriersByMerchantQueryHandler
    : IRequestHandler<GetCouriersByMerchantQuery, List<CourierDto>>
{
    private readonly IApplicationDbContext _db;

    public GetCouriersByMerchantQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<CourierDto>> Handle(
        GetCouriersByMerchantQuery query,
        CancellationToken cancellationToken)
    {
        // IQueryable üzerinde dinamik filtre — null gelirse tüm kuryeler döner.
        // EF Core bu koşullu Where'i tek bir SQL sorgusuna çevirir.
        var couriers = _db.Couriers
            .AsNoTracking()
            .Where(c => c.MerchantId == query.MerchantId);

        if (query.IsAvailable.HasValue)
            couriers = couriers.Where(c => c.IsAvailable == query.IsAvailable.Value);

        return await couriers
            .OrderBy(c => c.FirstName)
            .ThenBy(c => c.LastName)
            .Select(c => new CourierDto(
                c.Id,
                c.MerchantId,
                c.FirstName,
                c.LastName,
                c.PhoneNumber,
                c.Email,
                c.VehicleType,
                c.LicensePlate,
                c.VehicleBrand,
                c.VehicleModel,
                c.IsAvailable,
                c.CurrentBalance,
                c.CreatedAt,
                c.IsOnline,
                c.CurrentLatitude,
                c.CurrentLongitude,
                c.LastLocationUpdate))
            .ToListAsync(cancellationToken);
    }
}
