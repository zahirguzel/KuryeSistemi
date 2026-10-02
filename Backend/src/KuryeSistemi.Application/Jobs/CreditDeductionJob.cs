using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Application.Jobs;

/// <summary>
/// Teslim edilen sipariş için firma kontörünü düşen Hangfire görevi. Sipariş teslim akışını
/// geciktirmez ve hata olursa Hangfire tarafından yeniden denenir; düşüm idempotenttir.
/// </summary>
public sealed class CreditDeductionJob
{
    private readonly ICreditService _creditService;
    private readonly ILogger<CreditDeductionJob> _logger;

    public CreditDeductionJob(ICreditService creditService, ILogger<CreditDeductionJob> logger)
    {
        _creditService = creditService;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid orderId)
    {
        var result = await _creditService.DeductForDeliveryAsync(orderId);

        if (!result.IsSuccess)
        {
            _logger.LogWarning("--> [HANGFIRE JOB] Kontör düşülemedi. Sipariş: {OrderId}, Neden: {Message}", orderId, result.Message);

            // Geçici hatalarda (çakışma) Hangfire yeniden denesin
            if (result.StatusCode == 409)
                throw new InvalidOperationException(result.Message);
        }
    }
}
