using System.Text.Json;
using KuryeSistemi.Application.Interfaces;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Application.Common.Behaviours;

/// <summary>
/// MediatR Caching Pipeline Behavior.
/// ICacheableQuery uygulayan tüm istekleri yakalar.
/// Önbellek (Redis) üzerinde veri varsa doğrudan döner (Cache Hit),
/// yoksa veritabanına gider (Cache Miss) ve sonucu önbelleğe yazar.
/// </summary>
public sealed class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IDistributedCache _distributedCache;
    private readonly ILogger<CachingBehavior<TRequest, TResponse>> _logger;

    public CachingBehavior(
        IDistributedCache distributedCache,
        ILogger<CachingBehavior<TRequest, TResponse>> logger)
    {
        _distributedCache = distributedCache;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        // İstek ICacheableQuery değilse doğrudan handler'a ilet
        if (request is not ICacheableQuery cacheableQuery)
        {
            return await next();
        }

        var cacheKey = cacheableQuery.CacheKey;

        // 1. Önbellekte veriyi ara (Cache Hit kontrolü)
        try
        {
            var cachedData = await _distributedCache.GetStringAsync(cacheKey, cancellationToken);

            if (!string.IsNullOrEmpty(cachedData))
            {
                var deserialized = JsonSerializer.Deserialize<TResponse>(cachedData);
                if (deserialized is not null)
                {
                    _logger.LogInformation("--> [REDIS CACHE HIT] Anahtar: {CacheKey}", cacheKey);
                    return deserialized;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [REDIS CACHE ERROR] Önbellek okuma sırasında hata oluştu: {CacheKey}", cacheKey);
        }

        _logger.LogInformation("--> [REDIS CACHE MISS] Veritabanından çekiliyor: {CacheKey}", cacheKey);

        // 2. Önbellekte yoksa asıl Handler'ı çalıştır
        var response = await next();

        // 3. Dönen sonucu önbelleğe yaz
        if (response is not null)
        {
            try
            {
                var cacheOptions = new DistributedCacheEntryOptions();

                if (cacheableQuery.SlidingExpiration.HasValue)
                {
                    cacheOptions.SetSlidingExpiration(cacheableQuery.SlidingExpiration.Value);
                }
                else
                {
                    // Varsayılan olarak 5 dakika sakla
                    cacheOptions.SetAbsoluteExpiration(TimeSpan.FromMinutes(5));
                }

                var serialized = JsonSerializer.Serialize(response);
                await _distributedCache.SetStringAsync(cacheKey, serialized, cacheOptions, cancellationToken);

                _logger.LogInformation("--> [REDIS CACHE SET] Veri önbelleğe yazıldı: {CacheKey}", cacheKey);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "--> [REDIS CACHE ERROR] Önbelleğe yazma sırasında hata oluştu: {CacheKey}", cacheKey);
            }
        }

        return response;
    }
}
