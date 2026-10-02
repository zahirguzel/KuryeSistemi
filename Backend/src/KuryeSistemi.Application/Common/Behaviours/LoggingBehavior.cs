using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Application.Common.Behaviours;

/// <summary>
/// MediatR Logging ve Performans İzleme Pipeline Davranışı.
/// Tüm Command ve Query isteklerini yakalayarak parametrelerini,
/// çalışma sürelerini ve 500 ms üzerindeki performans darboğazlarını loglar.
/// </summary>
public sealed class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;

        var isSensitive = requestName.Contains("Login", StringComparison.OrdinalIgnoreCase) ||
                          requestName.Contains("Password", StringComparison.OrdinalIgnoreCase) ||
                          requestName.Contains("Auth", StringComparison.OrdinalIgnoreCase);

        // 1. İstek başlangıcı ve parametreleri logla (şifre içeren istekleri maskele)
        if (isSensitive)
        {
            _logger.LogInformation(
                "--> [REQUEST STARTED] {RequestName} | Parametreler: [GÜVENLİK NEDENİYLE MASKELENDİ]",
                requestName);
        }
        else
        {
            _logger.LogInformation(
                "--> [REQUEST STARTED] {RequestName} | Parametreler: {@Request}",
                requestName, request);
        }

        var stopwatch = Stopwatch.StartNew();

        try
        {
            // 2. İsteği bir sonraki pipeline adımına / handler'a ilet
            var response = await next();

            stopwatch.Stop();
            var elapsedMs = stopwatch.ElapsedMilliseconds;

            // 3. Performans uyarısı (500 ms üzeri işlemler)
            if (elapsedMs > 500)
            {
                _logger.LogWarning(
                    "--> [PERFORMANCE WARNING] Uzun süren istek tespit edildi! {RequestName} ({ElapsedMs} ms)",
                    requestName, elapsedMs);
            }
            else
            {
                _logger.LogInformation(
                    "--> [REQUEST COMPLETED] {RequestName} ({ElapsedMs} ms)",
                    requestName, elapsedMs);
            }

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(
                ex,
                "--> [REQUEST FAILED] {RequestName} ({ElapsedMs} ms) sırasında hata fırlatıldı!",
                requestName, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }
}
