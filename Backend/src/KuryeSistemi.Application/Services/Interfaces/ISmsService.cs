namespace KuryeSistemi.Application.Services.Interfaces;

/// <summary>
/// SMS gönderim servisi sözleşmesi.
/// Geliştirme ortamında MockSmsService, canlı ortamda Real/NetGsm servisi kullanılır.
/// </summary>
public interface ISmsService
{
    Task<bool> SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default);
}
