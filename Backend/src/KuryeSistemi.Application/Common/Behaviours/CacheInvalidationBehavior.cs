using KuryeSistemi.Application.Interfaces;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Application.Common.Behaviours;

/// <summary>
/// MediatR Cache Invalidation Pipeline Behavior.
/// ICacheRemoverCommand arayüzünü uygulayan Command'leri dinler.
/// Veritabanı işlemi (Handler) başarıyla tamamlandıktan sonra
/// bayatlayan önbellek anahtarını (CacheKey) Redis üzerinden siler.
/// </summary>
public sealed class CacheInvalidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IDistributedCache _distributedCache;
    private readonly ILogger<CacheInvalidationBehavior<TRequest, TResponse>> _logger;

    public CacheInvalidationBehavior(
        IDistributedCache distributedCache,
        ILogger<CacheInvalidationBehavior<TRequest, TResponse>> logger)
    {
        _distributedCache = distributedCache;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        // İstek ICacheRemoverCommand değilse doğrudan handler'a ilet
        if (request is not ICacheRemoverCommand removerCommand)
        {
            return await next();
        }

        // 1. ÖNCE veritabanı işlemini gerçekleştir (işlem başarısız olursa önbellek silinmez)
        var response = await next();

        // 2. İşlem başarılı olduysa ilgili önbellek anahtarını Redis'ten temizle
        var cacheKey = removerCommand.CacheKey;

        if (!string.IsNullOrEmpty(cacheKey))
        {
            try
            {
                await _distributedCache.RemoveAsync(cacheKey, cancellationToken);
                _logger.LogInformation("--> [REDIS CACHE INVALIDATED] Önbellek silindi: {CacheKey}", cacheKey);
            }
            catch (Exception ex)
            {
                // Redis'teki anlık bir hata veritabanı işlemini iptal etmemeli, loglanıp devam edilmeli
                _logger.LogWarning(ex, "--> [REDIS CACHE ERROR] Önbellek silinirken hata oluştu: {CacheKey}", cacheKey);
            }
        }

        return response;
    }
}
