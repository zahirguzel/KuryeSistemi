using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Infrastructure.Services.External.Real;

/// <summary>
/// Canlı (Production) ortamı için Gerçek Push Bildirim Servisi.
/// İleride Firebase Cloud Messaging (FCM / FirebaseAdmin SDK) entegrasyonu buraya eklenecektir.
/// </summary>
public class RealPushNotificationService : IPushNotificationService
{
    private readonly ILogger<RealPushNotificationService> _logger;

    public RealPushNotificationService(ILogger<RealPushNotificationService> logger)
    {
        _logger = logger;
    }

    public Task<bool> SendNotificationAsync(
        string deviceToken,
        string title,
        string message,
        IDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default)
    {
        // TODO: FirebaseAdmin FCM HTTP v1 API entegrasyonu buraya eklenecek.
        _logger.LogWarning("RealPushNotificationService henüz canlı FCM servisine bağlanmadı. Token: {DeviceToken}", deviceToken);
        return Task.FromResult(true);
    }
}
