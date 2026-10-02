using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Infrastructure.Services.External.Real;

/// <summary>
/// Canlı (Production) ortamı için Gerçek SMS Servisi.
/// İleride NetGsm veya benzeri SMS operatör API entegrasyonu buraya eklenecektir.
/// </summary>
public class RealSmsService : ISmsService
{
    private readonly ILogger<RealSmsService> _logger;

    public RealSmsService(ILogger<RealSmsService> logger)
    {
        _logger = logger;
    }

    public Task<bool> SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        // TODO: NetGsm / İletimerkezi HTTP REST API çağrısı buraya entegre edilecek.
        _logger.LogWarning("RealSmsService henüz canlı API entegrasyonuna bağlanmadı. Hedef: {PhoneNumber}", phoneNumber);
        return Task.FromResult(true);
    }
}
