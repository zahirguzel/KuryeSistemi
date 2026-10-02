using KuryeSistemi.API.Hubs;
using KuryeSistemi.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace KuryeSistemi.API.Services;

/// <summary>
/// LocationHub üzerinden SignalR istemcilerine sipariş ve kurye durum güncellemelerini yayınlar.
/// </summary>
public sealed class SignalRHubNotificationService : IHubNotificationService
{
    private readonly IHubContext<LocationHub> _hubContext;
    private readonly ILogger<SignalRHubNotificationService> _logger;

    public SignalRHubNotificationService(
        IHubContext<LocationHub> hubContext,
        ILogger<SignalRHubNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

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

            var targetGroups = new HashSet<string> { $"merchant_{merchantId}", "firm_admin" };

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
                targetGroups.Add("courier_pool");
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

    public async Task SendCourierStatusChangedAsync(
        Guid courierId,
        bool isOnline,
        bool isAvailable,
        string message,
        Guid? merchantId = null,
        CancellationToken cancellationToken = default)
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

            var targetGroups = merchantId.HasValue
                ? new List<string> { $"merchant_{merchantId.Value}", "firm_admin" }
                : new List<string> { "firm_admin" };

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
            var targetGroups = merchantId.HasValue
                ? new List<string> { $"merchant_{merchantId.Value}", "firm_admin" }
                : new List<string> { "firm_admin" };

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
