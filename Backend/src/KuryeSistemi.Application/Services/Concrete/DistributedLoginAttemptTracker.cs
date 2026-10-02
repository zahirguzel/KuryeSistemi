// Services/Concrete/DistributedLoginAttemptTracker.cs

using System.Text.Json;
using KuryeSistemi.Application.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Application.Services.Concrete;

/// <summary>
/// Hatalı giriş sayaçlarını dağıtık önbellekte (Redis) tutar; birden çok API örneğinde tutarlıdır.
/// Önbellek erişilemezse hata yutulur ve giriş engellenmez (yalnızca IP rate limit devrede kalır).
/// </summary>
public sealed class DistributedLoginAttemptTracker : ILoginAttemptTracker
{
    public const int MaxFailures = 5;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    private readonly IDistributedCache _cache;
    private readonly ILogger<DistributedLoginAttemptTracker> _logger;

    public DistributedLoginAttemptTracker(IDistributedCache cache, ILogger<DistributedLoginAttemptTracker> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    private sealed record State(int Failures, DateTime? LockedUntilUtc);

    private static string Key(string accountKey) => $"login-fail:{accountKey.Trim().ToLowerInvariant()}";

    public async Task<TimeSpan?> GetLockoutRemainingAsync(string accountKey, CancellationToken ct = default)
    {
        try
        {
            var state = await ReadAsync(accountKey, ct);
            if (state?.LockedUntilUtc is { } until && until > DateTime.UtcNow)
                return until - DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [LOGIN] Kilit durumu okunamadı; kontrol atlandı.");
        }
        return null;
    }

    public async Task RegisterFailureAsync(string accountKey, CancellationToken ct = default)
    {
        try
        {
            var state = await ReadAsync(accountKey, ct) ?? new State(0, null);

            // Süresi dolmuş kilit sonrası sayaç sıfırdan başlar
            if (state.LockedUntilUtc is { } expired && expired <= DateTime.UtcNow)
                state = new State(0, null);

            var failures = state.Failures + 1;
            DateTime? lockedUntil = failures >= MaxFailures ? DateTime.UtcNow.Add(LockoutDuration) : null;

            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = lockedUntil is null ? Window : LockoutDuration
            };

            await _cache.SetStringAsync(Key(accountKey), JsonSerializer.Serialize(new State(failures, lockedUntil)), options, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [LOGIN] Hatalı giriş sayacı yazılamadı.");
        }
    }

    public async Task ResetAsync(string accountKey, CancellationToken ct = default)
    {
        try
        {
            await _cache.RemoveAsync(Key(accountKey), ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "--> [LOGIN] Hatalı giriş sayacı sıfırlanamadı.");
        }
    }

    private async Task<State?> ReadAsync(string accountKey, CancellationToken ct)
    {
        var json = await _cache.GetStringAsync(Key(accountKey), ct);
        return string.IsNullOrEmpty(json) ? null : JsonSerializer.Deserialize<State>(json);
    }
}
