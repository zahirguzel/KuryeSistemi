using System.Text.Json;
using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Infrastructure.Services.External.Mock;

/// <summary>
/// Geliştirici (Development) ortamı için Sahte Push Bildirim Servisi.
/// Firebase Cloud Messaging (FCM) servisine bağlanmaz, ILogger ile konsola log basar.
/// </summary>
public class MockPushNotificationService : IPushNotificationService
{
    private readonly ILogger<MockPushNotificationService> _logger;

    public MockPushNotificationService(ILogger<MockPushNotificationService> logger)
    {
        _logger = logger;
    }

    public Task<bool> SendNotificationAsync(
        string deviceToken,
        string title,
        string message,
        IDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default)
    {
        var dataJson = data != null ? JsonSerializer.Serialize(data) : "{}";

        _logger.LogInformation(
            "🔔 [MOCK PUSH] DeviceToken: {DeviceToken} | Başlık: {Title} | Mesaj: {Message} | Ek Veri: {Data}",
            deviceToken,
            title,
            message,
            dataJson);

        return Task.FromResult(true);
    }
}
