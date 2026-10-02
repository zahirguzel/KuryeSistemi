using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

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

        var targetGroups = new HashSet<string> { "firm_admin" };
        if (!string.IsNullOrEmpty(merchantIdClaim))
        {
            targetGroups.Add($"merchant_{merchantIdClaim}");
        }

        var companyIdClaim = Context.User?.FindFirst("companyId")?.Value 
                          ?? Context.User?.FindFirst("courierCompanyId")?.Value
                          ?? Context.User?.FindFirst("CourierCompanyId")?.Value;

        if (!string.IsNullOrEmpty(companyIdClaim))
        {
            targetGroups.Add($"company_{companyIdClaim}");
        }

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
    /// Bağlanan istemciyi rollerine ve tenant claim'lerine göre gruplara ayırır.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var merchantIdClaim = Context.User?.FindFirst("merchantId")?.Value 
                           ?? Context.User?.FindFirst("MerchantId")?.Value;

        if (!string.IsNullOrEmpty(merchantIdClaim))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"merchant_{merchantIdClaim}");
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

        var courierIdClaim = Context.User?.FindFirst("courierId")?.Value 
                          ?? Context.User?.FindFirst("CourierId")?.Value;

        if (!string.IsNullOrEmpty(courierIdClaim))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"courier_{courierIdClaim}");
            await Groups.AddToGroupAsync(Context.ConnectionId, "courier_pool");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
