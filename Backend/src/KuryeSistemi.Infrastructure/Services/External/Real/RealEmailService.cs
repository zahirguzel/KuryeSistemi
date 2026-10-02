using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Infrastructure.Services.External.Real;

/// <summary>
/// Canlı (Production) ortamı için Gerçek E-Posta Servisi.
/// İleride SMTP / SendGrid / Amazon SES entegrasyonu buraya eklenecektir.
/// </summary>
public class RealEmailService : IEmailService
{
    private readonly ILogger<RealEmailService> _logger;

    public RealEmailService(ILogger<RealEmailService> logger)
    {
        _logger = logger;
    }

    public Task<bool> SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true, CancellationToken cancellationToken = default)
    {
        // TODO: SMTP / MailKit / SendGrid entegrasyonu buraya eklenecek.
        _logger.LogWarning("RealEmailService henüz canlı SMTP/API sunucusuna bağlanmadı. Alıcı: {ToEmail}", toEmail);
        return Task.FromResult(true);
    }
}
