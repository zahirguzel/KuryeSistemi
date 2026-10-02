namespace KuryeSistemi.Application.Interfaces;

/// <summary>
/// Arka plan görevleri (Background Jobs / Hangfire) yönetim sözleşmesi.
/// Application katmanı Hangfire paketine doğrudan bağımlı olmadan
/// bu arayüz aracılığıyla gecikmeli veya yinelenen görevler planlar.
/// </summary>
public interface IBackgroundJobService
{
    /// <summary>
    /// Sipariş oluşturulduktan sonra belirli bir süre (örn: 15 dk) kurye atanıp atanmadığını
    /// kontrol eden gecikmeli görevi planlar.
    /// </summary>
    /// <param name="orderId">Kontrol edilecek sipariş ID'si.</param>
    /// <param name="delay">Gecikme süresi (örn: TimeSpan.FromMinutes(15)).</param>
    void ScheduleUnassignedOrderCheck(Guid orderId, TimeSpan delay);

    /// <summary>Teslim edilen sipariş için firma kontörü düşümünü arka planda kuyruğa alır (idempotent).</summary>
    void EnqueueDeliveryCreditDeduction(Guid orderId);
}
