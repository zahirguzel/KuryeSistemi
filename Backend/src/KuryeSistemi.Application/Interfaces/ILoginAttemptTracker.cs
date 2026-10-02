namespace KuryeSistemi.Application.Interfaces;

/// <summary>
/// Hesap bazlı hatalı giriş takibi ve geçici kilitleme (IP bazlı rate limit'i tamamlar).
/// Altyapı (önbellek) erişilemezse giriş akışını bozmamak için güvenli şekilde devre dışı kalır.
/// </summary>
public interface ILoginAttemptTracker
{
    /// <summary>Hesap kilitliyse kalan süreyi, değilse null döner.</summary>
    Task<TimeSpan?> GetLockoutRemainingAsync(string accountKey, CancellationToken ct = default);

    /// <summary>Hatalı girişi kaydeder; eşik aşılırsa hesabı kilitler.</summary>
    Task RegisterFailureAsync(string accountKey, CancellationToken ct = default);

    /// <summary>Başarılı girişte sayaçları sıfırlar.</summary>
    Task ResetAsync(string accountKey, CancellationToken ct = default);
}
