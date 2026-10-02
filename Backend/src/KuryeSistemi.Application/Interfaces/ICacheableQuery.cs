namespace KuryeSistemi.Application.Interfaces;

/// <summary>
/// Önbelleklenebilir MediatR sorguları için sözleşme.
/// Bu arayüzü uygulayan tüm Query'ler CachingBehavior tarafından otomatik olarak
/// Redis üzerinden kontrol edilir; önbellekte varsa veritabanına inmeden dönülür.
/// </summary>
public interface ICacheableQuery
{
    /// <summary>
    /// Redis anahtarı (örn: "orders:active:merchant:{merchantId}").
    /// </summary>
    string CacheKey { get; }

    /// <summary>
    /// Kayar geçerlilik süresi (erişildikçe uzayan TTL).
    /// Null ise varsayılan süre kullanılır.
    /// </summary>
    TimeSpan? SlidingExpiration { get; }
}
