using KuryeSistemi.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Application.Jobs;

/// <summary>
/// Hangfire tarafından düzenli (örn: her 1-2 dakika) çalıştırılan arka plan görevi.
/// Kuryelerin anlık GPS veya sinyal gönderimlerini denetler.
/// Son 5 dakika içinde sinyal göndermemiş (uygulamayı kapatmış veya mesaiyi açık unutmuş)
/// kuryeleri otomatik olarak çevrimdışı (offline) ve meşgul/kapalı durumuna çeker.
/// </summary>
public sealed class CourierPresenceJob
{
    private readonly IApplicationDbContext _db;
    private readonly IHubNotificationService _notificationService;
    private readonly ILogger<CourierPresenceJob> _logger;

    public CourierPresenceJob(
        IApplicationDbContext db,
        IHubNotificationService notificationService,
        ILogger<CourierPresenceJob> logger)
    {
        _db = db;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task ExecuteAsync()
    {
        // Çevrimiçi görünüp 60 dakikadan uzun süredir hiçbir sinyal/işlem yapmayan kuryeleri çevrimdışı yap
        var timeoutThreshold = DateTime.UtcNow.AddMinutes(-60);

        var inactiveCouriers = await _db.Couriers
            .Where(c => c.IsOnline && (c.LastLocationUpdate == null ? c.UpdatedAt < timeoutThreshold : c.LastLocationUpdate < timeoutThreshold))
            .ToListAsync();

        if (inactiveCouriers.Count == 0) return;

        foreach (var courier in inactiveCouriers)
        {
            _logger.LogInformation(
                "--> [PRESENCE TIMEOUT] Kurye {FirstName} {LastName} ({Id}) uzun süredir sinyal göndermediği için çevrimdışı yapıldı.",
                courier.FirstName, courier.LastName, courier.Id);

            courier.IsOnline = false;
            courier.IsAvailable = false;
            courier.UpdatedAt = DateTime.UtcNow;
            courier.UpdatedBy = "system:presence_timeout";

            await _notificationService.SendCourierStatusChangedAsync(
                courier.Id,
                false,
                false,
                $"⚪ {courier.FirstName} {courier.LastName} uzun süre hareketsiz kaldığı için mesaisi sonlandırıldı.",
                courier.MerchantId);
        }

        await _db.SaveChangesAsync();
    }
}
