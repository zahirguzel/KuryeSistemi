using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Application.Jobs;

/// <summary>
/// Hangfire tarafından 15 dakika gecikmeyle tetiklenen arka plan görevi.
/// Siparişe kurye atanıp atanmadığını denetler.
/// Kurye atanmamışsa (Pending/Preparing/Ready) siparişi iptal eder ve SignalR üzerinden bildirim gönderir.
/// </summary>
public sealed class OrderTimeoutJob
{
    private readonly IApplicationDbContext _db;
    private readonly IOrderService _orderService;
    private readonly IHubNotificationService _notificationService;
    private readonly ILogger<OrderTimeoutJob> _logger;

    public OrderTimeoutJob(
        IApplicationDbContext db,
        IOrderService orderService,
        IHubNotificationService notificationService,
        ILogger<OrderTimeoutJob> logger)
    {
        _db = db;
        _orderService = orderService;
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// Hangfire gecikmeli çağrısının çalıştırdığı metot.
    /// </summary>
    /// <param name="orderId">Denetlenecek sipariş ID'si.</param>
    public async Task ExecuteAsync(Guid orderId)
    {
        _logger.LogInformation("--> [HANGFIRE JOB] Sipariş zaman aşımı denetleniyor: {OrderId}", orderId);

        var order = await _db.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null)
        {
            _logger.LogWarning("--> [HANGFIRE JOB] Sipariş bulunamadı: {OrderId}", orderId);
            return;
        }

        // Eğer siparişe kurye atanmamışsa ve aktif hazırlık/bekleme durumundaysa iptal et
        if (!order.CourierId.HasValue && (order.Status == OrderStatus.Pending || order.Status == OrderStatus.Preparing || order.Status == OrderStatus.Ready))
        {
            _logger.LogWarning(
                "--> [HANGFIRE TIMEOUT] Sipariş {OrderId} kurye atanmadığı için zaman aşımına uğradı! Otomatik iptal ediliyor...",
                orderId);

            // Doğrudan OrderService üzerinden güncelle (state machine & kurye kuralları işletilir)
            await _orderService.UpdateStatusAsync(order.Id, OrderStatus.Cancelled);

            // SignalR üzerinden işletmeye anlık bildirim ilet
            await _notificationService.SendOrderStatusChangedAsync(
                order.MerchantId,
                order.Id,
                OrderStatus.Cancelled.ToString(),
                "15 dakika boyunca kurye atanmadığı için sipariş otomatik olarak iptal edildi.");
        }
        else
        {
            _logger.LogInformation(
                "--> [HANGFIRE JOB OK] Sipariş {OrderId} kurye atanmış veya zaten işlem görmüş (Durum: {Status}). İptale gerek yok.",
                orderId, order.Status);
        }
    }
}
