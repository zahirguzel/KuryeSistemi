namespace KuryeSistemi.Application.Services.Interfaces;

/// <summary>
/// E-posta gönderim servisi sözleşmesi.
/// Geliştirme ortamında MockEmailService, canlı ortamda Real/SMTP servisi kullanılır.
/// </summary>
public interface IEmailService
{
    Task<bool> SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true, CancellationToken cancellationToken = default);
}
