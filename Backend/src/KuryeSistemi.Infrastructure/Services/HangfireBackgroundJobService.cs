using Hangfire;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Jobs;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Infrastructure.Services;

/// <summary>
/// Hangfire tabanlı arka plan görev yöneticisi.
/// IBackgroundJobService arayüzünü uygulayarak gecikmeli sipariş kontrol görevlerini Hangfire'a kaydeder.
/// </summary>
public sealed class HangfireBackgroundJobService : IBackgroundJobService
{
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly ILogger<HangfireBackgroundJobService> _logger;

    public HangfireBackgroundJobService(
        IBackgroundJobClient backgroundJobClient,
        ILogger<HangfireBackgroundJobService> logger)
    {
        _backgroundJobClient = backgroundJobClient;
        _logger = logger;
    }

    public void ScheduleUnassignedOrderCheck(Guid orderId, TimeSpan delay)
    {
        var jobId = _backgroundJobClient.Schedule<OrderTimeoutJob>(
            job => job.ExecuteAsync(orderId),
            delay);

        _logger.LogInformation(
            "--> [HANGFIRE SCHEDULED] Sipariş {OrderId} için gecikmeli denetim görevi planlandı. JobId: {JobId}, Süre: {Delay}",
            orderId, jobId, delay);
    }

    public void EnqueueDeliveryCreditDeduction(Guid orderId)
    {
        _backgroundJobClient.Enqueue<CreditDeductionJob>(job => job.ExecuteAsync(orderId));
    }
}
