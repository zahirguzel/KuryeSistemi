namespace KuryeSistemi.Application.Interfaces;

/// <summary>
/// Veritabanında değişiklik yapıp ilgili önbellek verisini geçersiz kılan (invalidation)
/// MediatR Command'leri için sözleşme.
/// Bu arayüzü uygulayan Command'ler başarıyla tamamlandıktan sonra
/// CacheInvalidationBehavior tarafından ilgili CacheKey Redis üzerinden otomatik silinir.
/// </summary>
public interface ICacheRemoverCommand
{
    /// <summary>
    /// Silinecek Redis önbellek anahtarı (örn: "orders:active:merchant:{merchantId}").
    /// </summary>
    string CacheKey { get; }
}
