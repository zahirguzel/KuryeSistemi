using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Infrastructure.Services.External.Mock;

/// <summary>
/// Geliştirici (Development) ortamı için Sahte SMS Servisi.
/// Gerçek operatöre (NetGsm vb.) istek atmaz, ILogger ile konsola detaylı log basar.
/// </summary>
public class MockSmsService : ISmsService
{
    private readonly ILogger<MockSmsService> _logger;

    public MockSmsService(ILogger<MockSmsService> logger)
    {
        _logger = logger;
    }

    public Task<bool> SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "📱 [MOCK SMS] Numara: {PhoneNumber} | Mesaj: {Message}",
            phoneNumber,
            message);

        return Task.FromResult(true);
    }
}
