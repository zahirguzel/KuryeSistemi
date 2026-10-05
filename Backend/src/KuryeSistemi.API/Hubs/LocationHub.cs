using System.Security.Claims;
using KuryeSistemi.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.API.Hubs;

/// <summary>
/// Gerçek zamanlı kurye konum yayın Hub'ı.
///
/// Bağlantı URL   : /hubs/location
/// Kimlik doğrulama: JWT Bearer (query param: access_token)
///
/// İstemci → Sunucu  : SendLocationUpdate(courierId, lat, lng)
/// Sunucu  → İstemciler: "ReceiveLocationUpdate" event'i yetkili tenant istemcilerine yayınlanır
/// </summary>
[Authorize]
public sealed class LocationHub : Hub
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LocationHub> _logger;

    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, DateTime> _lastLocationUpdates = new();

    public LocationHub(
        IServiceScopeFactory scopeFactory,
        ILogger<LocationHub> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    /// <summary>
    /// Kurye'nin yeni GPS koordinatını alır ve yetkili istemcilere (işletme ve firma paneli) yayınlar.
    /// Kurye mobil uygulaması bu metodu düzenli aralıklarla (örn: 3-5 sn) çağırır.
    /// </summary>
    [Authorize(Policy = "CourierOnly")]
    public async Task SendLocationUpdate(Guid courierId, double latitude, double longitude)
    {
        // 0. Koordinat geçerlilik ve sınır kontrolü
        if (double.IsNaN(latitude) || double.IsInfinity(latitude) || double.IsNaN(longitude) || double.IsInfinity(longitude) ||
            latitude is < -90 or > 90 || longitude is < -180 or > 180)
        {
            _logger.LogWarning("--> [LocationHub] Geçersiz GPS koordinatları reddedildi: Lat={Lat}, Lng={Lng}", latitude, longitude);
            return;
        }

        // 1. Güvenlik Doğrulaması: Kurye ID'sini kesinlikle JWT claim'inden al (ID Spoofing engeli)
        var claimCourierIdStr = Context.User?.FindFirst("courierId")?.Value 
                             ?? Context.User?.FindFirst("CourierId")?.Value;

        if (string.IsNullOrEmpty(claimCourierIdStr) || !Guid.TryParse(claimCourierIdStr, out var verifiedCourierId))
        {
            _logger.LogWarning("--> [LocationHub] Yetkisiz konum güncellemesi reddedildi: Kurye token claim'i geçersiz veya yok.");
            return;
        }

        // 2. Sıklık kontrolü (Throttle: Kurye başına en fazla ~800ms'de bir işlem)
        if (_lastLocationUpdates.TryGetValue(verifiedCourierId, out var lastUpdate) && (DateTime.UtcNow - lastUpdate).TotalMilliseconds < 800)
        {
            return;
        }
        _lastLocationUpdates[verifiedCourierId] = DateTime.UtcNow;

        // 3. İzole Tenant Gruplarına Yayın (İşletme, Firma Yöneticileri, Firma Grubu)
        var merchantIdClaim = Context.User?.FindFirst("merchantId")?.Value 
                           ?? Context.User?.FindFirst("MerchantId")?.Value;

        // Tenant izolasyonu: konum yalnızca kuryenin işletmesine, bağlı olduğu firmaya (veya firmaya
        // bağlanmamış eski kayıtlar için ortak kovaya) ve SuperAdmin'e yayınlanır.
        var targetGroups = new HashSet<string> { "superadmin" };
        if (IsRealMerchantClaim(merchantIdClaim))
        {
            targetGroups.Add($"merchant_{merchantIdClaim}");
        }

        var companyIdClaim = Context.User?.FindFirst("companyId")?.Value 
                          ?? Context.User?.FindFirst("courierCompanyId")?.Value
                          ?? Context.User?.FindFirst("CourierCompanyId")?.Value
                          ?? (Context.Items.TryGetValue("companyId", out var cachedCompany) ? cachedCompany as string : null);

        targetGroups.Add(!string.IsNullOrEmpty(companyIdClaim) ? $"company_{companyIdClaim}" : "firm_admin");

        await Clients.Groups(targetGroups.ToList()).SendAsync(
            "ReceiveLocationUpdate",
            verifiedCourierId,
            latitude,
            longitude);

        // 4. Arka planda DB güncellemesi (akıllı atama ve harita ilk yüklemesi için)
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var courierService = scope.ServiceProvider.GetRequiredService<KuryeSistemi.Application.Services.Interfaces.ICourierService>();
                await courierService.UpdateLocationAsync(verifiedCourierId, latitude, longitude);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "--> [LocationHub] Kurye konum DB güncelleme hatası: {CourierId}", verifiedCourierId);
            }
        });
    }

    /// <summary>
    /// Ortak filo kuryelerinin token'ında merchantId boş Guid gelir; bu değer gerçek bir işletme grubu değildir
    /// ve tüm firmaların filo kuryelerini aynı gruba toplayıp konum yayınlarını sızdırır.
    /// </summary>
    private static bool IsRealMerchantClaim(string? claim)
        => Guid.TryParse(claim, out var id) && id != Guid.Empty;

    /// <summary>
    /// Bağlanan istemciyi rollerine ve tenant claim'lerine göre gruplara ayırır.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var merchantIdClaim = Context.User?.FindFirst("merchantId")?.Value 
                           ?? Context.User?.FindFirst("MerchantId")?.Value;

        if (IsRealMerchantClaim(merchantIdClaim))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"merchant_{merchantIdClaim}");
        }

        if (Context.User?.IsInRole("SuperAdmin") == true)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "superadmin");
        }

        var isFirmUser = Context.User?.IsInRole("CourierFirm") == true 
                      || Context.User?.IsInRole("Admin") == true 
                      || Context.User?.IsInRole("FirmAdmin") == true
                      || Context.User?.IsInRole("SuperAdmin") == true
                      || Context.User?.IsInRole("CompanyUser") == true
                      || Context.User?.Claims.Any(c => c.Type == ClaimTypes.Role && (c.Value.StartsWith("CompanyUser") || c.Value == "SuperAdmin")) == true;

        if (isFirmUser)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "firm_admin");
        }

        var companyIdClaim = Context.User?.FindFirst("companyId")?.Value 
                          ?? Context.User?.FindFirst("courierCompanyId")?.Value
                          ?? Context.User?.FindFirst("CourierCompanyId")?.Value;

        if (!string.IsNullOrEmpty(companyIdClaim))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"company_{companyIdClaim}");
        }
        else if (isFirmUser && IsRealMerchantClaim(merchantIdClaim) && Context.User?.IsInRole("SuperAdmin") != true)
        {
            // Eski tip firma hesabı (CourierFirm/FirmAdmin) bir işletme kaydıdır ve token'ında firma kimliği yoktur.
            // Firmaya bağlı restoran/kurye yayınları yalnızca company_{id} grubuna gittiğinden, firmanın
            // kendi işletme kaydından çözülüp gruba eklenir; aksi halde canlı olay hiç alınmaz.
            var ownCompanyId = await ResolveMerchantCompanyIdAsync(merchantIdClaim!);
            if (ownCompanyId.HasValue)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"company_{ownCompanyId.Value}");
            }
        }

        var courierIdClaim = Context.User?.FindFirst("courierId")?.Value 
                          ?? Context.User?.FindFirst("CourierId")?.Value;

        if (!string.IsNullOrEmpty(courierIdClaim))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"courier_{courierIdClaim}");

            // Havuz bildirimi kuryenin bağlı olduğu firmanın havuzuna gider (tenant izolasyonu).
            var courierCompanyId = !string.IsNullOrEmpty(companyIdClaim) && Guid.TryParse(companyIdClaim, out var parsedCompId)
                ? (Guid?)parsedCompId
                : await ResolveCourierCompanyIdAsync(courierIdClaim);

            if (courierCompanyId.HasValue)
            {
                Context.Items["companyId"] = courierCompanyId.Value.ToString();
                await Groups.AddToGroupAsync(Context.ConnectionId, $"courier_pool_{courierCompanyId.Value}");
            }
            else
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "courier_pool");
            }
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Sıklık sınırlayıcı sözlüğünün sonsuz büyümesini önle
        var courierIdClaim = Context.User?.FindFirst("courierId")?.Value
                          ?? Context.User?.FindFirst("CourierId")?.Value;
        if (Guid.TryParse(courierIdClaim, out var courierId))
        {
            _lastLocationUpdates.TryRemove(courierId, out _);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>İşletme kaydının bağlı olduğu kurye firması. Bağlı değilse veya okunamazsa null.</summary>
    private async Task<Guid?> ResolveMerchantCompanyIdAsync(string merchantIdClaim)
    {
        if (!Guid.TryParse(merchantIdClaim, out var merchantId))
            return null;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            return await db.Merchants.AsNoTracking()
                .Where(m => m.Id == merchantId)
                .Select(m => m.CourierCompanyId)
                .FirstOrDefaultAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [LocationHub] İşletme firma bilgisi okunamadı: {MerchantId}", merchantId);
            return null;
        }
    }

    /// <summary>Kuryenin işletmesinin bağlı olduğu kurye firması. Bağlı değilse veya okunamazsa null.</summary>
    private async Task<Guid?> ResolveCourierCompanyIdAsync(string courierIdClaim)
    {
        if (!Guid.TryParse(courierIdClaim, out var courierId))
            return null;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            return await db.Couriers.AsNoTracking()
                .Where(c => c.Id == courierId)
                .Select(c => (Guid?)c.CourierCompanyId)
                .FirstOrDefaultAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [LocationHub] Kurye firma bilgisi okunamadı: {CourierId}", courierId);
            return null;
        }
    }
}
