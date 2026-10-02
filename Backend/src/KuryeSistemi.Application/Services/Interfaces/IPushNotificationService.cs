namespace KuryeSistemi.Application.Services.Interfaces;

/// <summary>
/// Anlık mobil bildirim (Push Notification) servisi sözleşmesi.
/// Geliştirme ortamında MockPushNotificationService, canlı ortamda Real/Firebase FCM servisi kullanılır.
/// </summary>
public interface IPushNotificationService
{
    Task<bool> SendNotificationAsync(
        string deviceToken,
        string title,
        string message,
        IDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default);
}
