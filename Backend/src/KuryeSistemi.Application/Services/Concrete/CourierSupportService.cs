// Services/Concrete/CourierSupportService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Couriers;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace KuryeSistemi.Application.Services.Concrete;

public sealed class CourierSupportService : ICourierSupportService
{
    public static readonly TimeSpan SosCooldown = TimeSpan.FromMinutes(1);

    private readonly ICourierRepository _courierRepository;
    private readonly IApplicationDbContext _db;
    private readonly IHubNotificationService _notificationService;
    private readonly IAuditService _auditService;
    private readonly IMemoryCache _cache;

    public CourierSupportService(
        ICourierRepository courierRepository,
        IApplicationDbContext db,
        IHubNotificationService notificationService,
        IAuditService auditService,
        IMemoryCache cache)
    {
        _courierRepository = courierRepository;
        _db = db;
        _notificationService = notificationService;
        _auditService = auditService;
        _cache = cache;
    }

    public async Task<ServiceResult<CourierSupportInfoDto>> GetSupportInfoAsync(Guid courierId, CancellationToken ct = default)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return ServiceResult<CourierSupportInfoDto>.NotFound("Kurye bulunamadı.");

        var company = await _db.CourierCompanies.AsNoTracking()
            .Where(c => c.Id == courier.CourierCompanyId)
            .Select(c => new { c.Name, c.PhoneNumber })
            .FirstOrDefaultAsync(ct);

        var phone = string.IsNullOrWhiteSpace(company?.PhoneNumber) ? null : company!.PhoneNumber.Trim();
        return ServiceResult<CourierSupportInfoDto>.Success(new CourierSupportInfoDto(phone, company?.Name ?? string.Empty));
    }

    public async Task<ServiceResult<CourierSosResultDto>> RaiseSosAsync(Guid courierId, SosRequest request, CancellationToken ct = default)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return ServiceResult<CourierSosResultDto>.NotFound("Kurye bulunamadı.");

        var cacheKey = $"sos:{courierId}";
        if (_cache.TryGetValue(cacheKey, out _))
        {
            return ServiceResult<CourierSosResultDto>.Fail(
                "Acil çağrınız az önce iletildi. Yeni bir çağrı için 1 dakika bekleyin.", 429);
        }

        var lat = request.Latitude ?? courier.CurrentLatitude;
        var lng = request.Longitude ?? courier.CurrentLongitude;
        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        var fullName = $"{courier.FirstName} {courier.LastName}".Trim();

        _cache.Set(cacheKey, true, SosCooldown);

        await _notificationService.SendCourierSosAsync(
            courier.Id, fullName, courier.PhoneNumber, lat, lng, note, courier.MerchantId, ct);

        await _auditService.LogAsync(
            courier.Id, courier.Email, "Courier", courier.MerchantId,
            "CourierSos", "Courier", courier.Id.ToString(),
            $"Konum: {lat?.ToString("F5") ?? "-"},{lng?.ToString("F5") ?? "-"} | Not: {note ?? "-"}",
            cancellationToken: ct);

        return ServiceResult<CourierSosResultDto>.Success(
            new CourierSosResultDto(DateTime.UtcNow), "Acil çağrınız dispeçere iletildi.");
    }
}
