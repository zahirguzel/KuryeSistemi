using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Application.Jobs;

/// <summary>
/// Hangfire ile dakikada bir çalışır. Akıllı GPS (SmartAuto) modundaki işletmelerin, sipariş geldiği anda
/// uygun kurye bulunamadığı için atamasız kalmış siparişlerini yeniden dener.
/// </summary>
public sealed class SmartAutoRetryJob
{
    private readonly IOrderService _orderService;
    private readonly ILogger<SmartAutoRetryJob> _logger;

    public SmartAutoRetryJob(IOrderService orderService, ILogger<SmartAutoRetryJob> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    public async Task ExecuteAsync()
    {
        var assigned = await _orderService.RetryUnassignedSmartAutoOrdersAsync();
        if (assigned > 0)
            _logger.LogInformation("--> [SMART RETRY] {Count} bekleyen sipariş akıllı dağıtımla kuryeye atandı.", assigned);
    }
}
