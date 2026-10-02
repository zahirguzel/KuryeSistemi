namespace KuryeSistemi.Application.Interfaces;

/// <summary>
/// Realtime bildirim (SignalR Hub) soyutlaması.
/// Application katmanının API katmanına doğrudan bağımlı olmadan
/// gerçek zamanlı bildirimleri istemcilere iletmesini sağlar.
/// </summary>
public interface IHubNotificationService
{
    /// <summary>
    /// Sipariş durumu değiştiğinde (örn: zaman aşımı ile iptal edildiğinde, kurye atandığında, havuza düştüğünde)
    /// ilgili işletmeye, kuryeye ve bağlı istemcilere SignalR üzerinden anlık bildirim yayınlar.
    /// </summary>
    Task SendOrderStatusChangedAsync(
        Guid merchantId,
        Guid orderId,
        string newStatus,
        string message,
        Guid? courierId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Kurye mesai veya müsaitlik durumu değiştiğinde SignalR üzerinden anlık bildirim yayınlar.
    /// </summary>
    Task SendCourierStatusChangedAsync(
        Guid courierId,
        bool isOnline,
        bool isAvailable,
        string message,
        Guid? merchantId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Kurye canlı konumunu ilgili tenant gruplarına yayınlar.
    /// </summary>
    Task SendCourierLocationUpdatedAsync(
        Guid courierId,
        double latitude,
        double longitude,
        Guid? merchantId = null,
        CancellationToken cancellationToken = default);
}
