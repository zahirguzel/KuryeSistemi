using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Infrastructure.Services.External.Mock;

/// <summary>
/// Geliştirici (Development) ortamı için Sahte E-Posta Servisi.
/// Gerçek SMTP/SendGrid sunucusuna bağlanmaz, ILogger ile konsola log basar.
/// </summary>
public class MockEmailService : IEmailService
{
    private readonly ILogger<MockEmailService> _logger;

    public MockEmailService(ILogger<MockEmailService> logger)
    {
        _logger = logger;
    }

    public Task<bool> SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "📧 [MOCK EMAIL] Alıcı: {ToEmail} | Konu: {Subject} | HTML: {IsHtml} | Gövde: {Body}",
            toEmail,
            subject,
            isHtml,
            body);

        return Task.FromResult(true);
    }
}
