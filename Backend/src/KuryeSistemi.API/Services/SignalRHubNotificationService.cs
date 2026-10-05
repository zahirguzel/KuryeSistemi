using System.Collections.Concurrent;
using KuryeSistemi.API.Hubs;
using KuryeSistemi.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.API.Services;

/// <summary>
/// LocationHub üzerinden SignalR istemcilerine sipariş ve kurye durum güncellemelerini yayınlar.
/// </summary>
public sealed class SignalRHubNotificationService : IHubNotificationService
{
    private readonly IHubContext<LocationHub> _hubContext;
    private readonly ILogger<SignalRHubNotificationService> _logger;
    private readonly IServiceScopeFactory? _scopeFactory;

    // İşletme → firma eşlemesi kısa süreli önbelleğe alınır (her bildirimde DB'ye gitmemek için)
    private static readonly ConcurrentDictionary<Guid, (Guid? CompanyId, DateTime ExpiresAt)> CompanyCache = new();

    public SignalRHubNotificationService(
        IHubContext<LocationHub> hubContext,
        ILogger<SignalRHubNotificationService> logger,
        IServiceScopeFactory? scopeFactory = null)
    {
        _hubContext = hubContext;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    /// <summary>İşletmenin bağlı olduğu kurye firması. Bağlı değilse (eski kayıt) null.</summary>
    private async Task<Guid?> ResolveCompanyIdAsync(Guid? merchantId)
    {
        if (_scopeFactory is null || !merchantId.HasValue || merchantId.Value == Guid.Empty)
            return null;

        if (CompanyCache.TryGetValue(merchantId.Value, out var hit) && hit.ExpiresAt > DateTime.UtcNow)
            return hit.CompanyId;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var companyId = await db.Merchants.AsNoTracking()
                .Where(m => m.Id == merchantId.Value)
                .Select(m => m.CourierCompanyId)
                .FirstOrDefaultAsync();

            CompanyCache[merchantId.Value] = (companyId, DateTime.UtcNow.AddMinutes(5));
            return companyId;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [SIGNALR] İşletme firma eşlemesi okunamadı: {MerchantId}", merchantId);
            return null;
        }
    }

    /// <summary>Kuryenin bağlı olduğu kurye firması (restoranı olmayan ortak filo kuryeleri için).</summary>
    private async Task<Guid?> ResolveCompanyIdForCourierAsync(Guid courierId)
    {
        if (_scopeFactory is null || courierId == Guid.Empty)
            return null;

        if (CompanyCache.TryGetValue(courierId, out var hit) && hit.ExpiresAt > DateTime.UtcNow)
            return hit.CompanyId;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var companyId = await db.Couriers.AsNoTracking()
                .Where(c => c.Id == courierId)
                .Select(c => (Guid?)c.CourierCompanyId)
                .FirstOrDefaultAsync();

            CompanyCache[courierId] = (companyId, DateTime.UtcNow.AddMinutes(5));
            return companyId;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [SIGNALR] Kurye firma eşlemesi okunamadı: {CourierId}", courierId);
            return null;
        }
    }

    /// <summary>
    /// Firma tarafı hedef grupları (tenant izolasyonu):
    ///  - "superadmin": platform sahibi her şeyi görür
    ///  - "company_{id}": işletme bir firmaya bağlıysa yalnızca o firmanın kullanıcıları
    ///  - "firm_admin": firmaya bağlanmamış (eski) işletmeler için ortak kova
    /// </summary>
    private IEnumerable<string> BuildFirmGroups(Guid? companyId)
    {
        yield return "superadmin";

        if (companyId.HasValue)
            yield return $"company_{companyId.Value}";
        else
            yield return "firm_admin";
    }

    private static string PoolGroup(Guid? companyId)
        => companyId.HasValue ? $"courier_pool_{companyId.Value}" : "courier_pool";

    public async Task SendOrderStatusChangedAsync(
        Guid merchantId,
        Guid orderId,
        string newStatus,
        string message,
        Guid? courierId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var now = DateTime.UtcNow;
            var payload = new Dictionary<string, object>
            {
                ["orderId"] = orderId.ToString(),
                ["OrderId"] = orderId.ToString(),
                ["merchantId"] = merchantId.ToString(),
                ["MerchantId"] = merchantId.ToString(),
                ["status"] = newStatus,
                ["Status"] = newStatus,
                ["message"] = message,
                ["Message"] = message,
                ["timestamp"] = now.ToString("o"),
                ["Timestamp"] = now.ToString("o")
            };

            if (courierId.HasValue && courierId.Value != Guid.Empty)
            {
                payload["courierId"] = courierId.Value.ToString();
                payload["CourierId"] = courierId.Value.ToString();
            }

            var companyId = await ResolveCompanyIdAsync(merchantId);
            var targetGroups = new HashSet<string> { $"merchant_{merchantId}" };
            foreach (var g in BuildFirmGroups(companyId)) targetGroups.Add(g);

            // Atanmış kurye varsa doğrudan kurye kanalına gönder
            if (courierId.HasValue && courierId.Value != Guid.Empty)
            {
                targetGroups.Add($"courier_{courierId.Value}");
            }

            // Havuzdaki sipariş veya kurye atanmamışsa tüm kurye havuzuna yayınla (kurye telefonlarında alarm çalsın)
            // Eğer courierId == Guid.Empty ise özel olarak kurye havuzu dışı (yönetici manuel ataması) tutulur
            var statusLower = newStatus.ToLowerInvariant();
            if (courierId != Guid.Empty && (statusLower == "pending" || statusLower == "created" || !courierId.HasValue))
            {
                targetGroups.Add(PoolGroup(companyId));
            }

            await _hubContext.Clients.Groups(targetGroups.ToList()).SendAsync(
                "ReceiveOrderStatusUpdate",
                payload,
                cancellationToken);

            _logger.LogInformation(
                "--> [SIGNALR BROADCAST] Sipariş durumu güncellendi: {OrderId} -> {Status} (Merchant: {MerchantId}, Courier: {CourierId})",
                orderId, newStatus, merchantId, courierId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [SIGNALR ERROR] Bildirim gönderilirken hata oluştu: {OrderId}", orderId);
        }
    }

    public async Task SendCourierSosAsync(
        Guid courierId,
        string courierName,
        string courierPhone,
        double? latitude,
        double? longitude,
        string? note,
        Guid? merchantId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new Dictionary<string, object?>
            {
                ["courierId"] = courierId.ToString(),
                ["courierName"] = courierName,
                ["phoneNumber"] = courierPhone,
                ["latitude"] = latitude,
                ["longitude"] = longitude,
                ["note"] = note,
                ["timestamp"] = DateTime.UtcNow.ToString("o"),
            };

            var companyId = await ResolveCompanyIdAsync(merchantId) ?? await ResolveCompanyIdForCourierAsync(courierId);
            var targetGroups = new HashSet<string>();
            if (merchantId.HasValue) targetGroups.Add($"merchant_{merchantId.Value}");
            foreach (var g in BuildFirmGroups(companyId)) targetGroups.Add(g);

            await _hubContext.Clients.Groups(targetGroups.ToList()).SendAsync(
                "ReceiveCourierSos", payload, cancellationToken);

            _logger.LogWarning(
                "--> [SIGNALR SOS] Kurye acil çağrısı: {CourierId} ({Name}) Konum: {Lat},{Lng}",
                courierId, courierName, latitude, longitude);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "--> [SIGNALR ERROR] SOS bildirimi gönderilemedi: {CourierId}", courierId);
        }
    }

    public async Task SendMerchantStatusChangedAsync(
        Guid merchantId,
        bool isOpen,
        string merchantName,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new Dictionary<string, object>
            {
                ["merchantId"] = merchantId.ToString(),
                ["MerchantId"] = merchantId.ToString(),
                ["isOpen"] = isOpen,
                ["IsOpen"] = isOpen,
                ["name"] = merchantName,
                ["Name"] = merchantName,
                ["timestamp"] = DateTime.UtcNow.ToString("o"),
            };

            var companyId = await ResolveCompanyIdAsync(merchantId);
            var targetGroups = new HashSet<string> { $"merchant_{merchantId}" };
            foreach (var g in BuildFirmGroups(companyId)) targetGroups.Add(g);

            await _hubContext.Clients.Groups(targetGroups.ToList()).SendAsync(
                "ReceiveMerchantStatusUpdate",
                payload,
                cancellationToken);

            _logger.LogInformation(
                "--> [SIGNALR BROADCAST] İşletme durumu güncellendi: {MerchantId} -> Açık:{IsOpen}", merchantId, isOpen);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [SIGNALR ERROR] İşletme durum bildirimi gönderilirken hata oluştu: {MerchantId}", merchantId);
        }
    }

    public async Task SendCourierStatusChangedAsync(
        Guid courierId,
        bool isOnline,
        bool isAvailable,
        string message,
        Guid? merchantId = null,
        CancellationToken cancellationToken = default,
        bool? isOnBreak = null)
    {
        try
        {
            var now = DateTime.UtcNow;
            var payload = new Dictionary<string, object>
            {
                ["courierId"] = courierId.ToString(),
                ["CourierId"] = courierId.ToString(),
                ["isOnline"] = isOnline,
                ["IsOnline"] = isOnline,
                ["isAvailable"] = isAvailable,
                ["IsAvailable"] = isAvailable,
                ["message"] = message,
                ["Message"] = message,
                ["timestamp"] = now.ToString("o"),
                ["Timestamp"] = now.ToString("o")
            };

            // Mola bilgisi yalnızca biliniyorsa gönderilir; diğer durum yayınları istemcideki mola durumunu ezmez
            if (isOnBreak.HasValue)
            {
                payload["isOnBreak"] = isOnBreak.Value;
                payload["IsOnBreak"] = isOnBreak.Value;
            }

            var companyId = await ResolveCompanyIdAsync(merchantId) ?? await ResolveCompanyIdForCourierAsync(courierId);
            var targetGroups = new List<string>();
            if (merchantId.HasValue) targetGroups.Add($"merchant_{merchantId.Value}");
            targetGroups.AddRange(BuildFirmGroups(companyId));

            await _hubContext.Clients.Groups(targetGroups).SendAsync(
                "ReceiveCourierStatusUpdate",
                payload,
                cancellationToken);

            _logger.LogInformation(
                "--> [SIGNALR BROADCAST] Kurye durumu güncellendi: {CourierId} -> Online:{IsOnline}, Available:{IsAvailable}",
                courierId, isOnline, isAvailable);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [SIGNALR ERROR] Kurye durum bildirimi gönderilirken hata oluştu: {CourierId}", courierId);
        }
    }

    public async Task SendCourierLocationUpdatedAsync(
        Guid courierId,
        double latitude,
        double longitude,
        Guid? merchantId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var companyId = await ResolveCompanyIdAsync(merchantId) ?? await ResolveCompanyIdForCourierAsync(courierId);
            var targetGroups = new List<string>();
            if (merchantId.HasValue) targetGroups.Add($"merchant_{merchantId.Value}");
            targetGroups.AddRange(BuildFirmGroups(companyId));

            await _hubContext.Clients.Groups(targetGroups).SendAsync(
                "ReceiveLocationUpdate",
                courierId,
                latitude,
                longitude,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [SIGNALR ERROR] Kurye GPS konumu gönderilirken hata oluştu: {CourierId}", courierId);
        }
    }
}
