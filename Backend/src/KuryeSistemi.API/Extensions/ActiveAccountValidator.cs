// Extensions/ActiveAccountValidator.cs

using KuryeSistemi.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;

namespace KuryeSistemi.API.Extensions;

/// <summary>
/// JWT imzası geçerli olsa bile hesabın hâlâ kullanılabilir olduğunu doğrular:
/// pasife alınan/silinen hesap, pasif firma ve şifre değişiminden önce üretilmiş token'lar reddedilir.
/// Hesap durumu kısa süreli önbelleğe alınır; etkisi en geç <see cref="CacheTtl"/> içinde görülür.
/// Silinmiş kayıtlar global soft-delete filtresi nedeniyle bulunamaz ve pasif sayılır.
/// </summary>
public static class ActiveAccountValidator
{
    public static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(30);

    /// <summary>Hesabın önbelleğe alınan durumu. Token'a bağlı değildir (iat her istekte karşılaştırılır).</summary>
    private sealed record AccountState(bool Active, DateTime? PasswordChangedAtUtc);

    public static async Task<bool> IsActiveAsync(
        ClaimsPrincipal principal,
        IApplicationDbContext db,
        IMemoryCache cache,
        CancellationToken ct = default)
    {
        var (kind, id) = ResolveIdentity(principal);
        if (kind is null) return false; // tanınmayan token tipi

        var cacheKey = $"acct-state:{kind}:{id}";
        if (!cache.TryGetValue(cacheKey, out AccountState? state) || state is null)
        {
            state = await QueryAsync(kind, id, db, ct);
            cache.Set(cacheKey, state, CacheTtl);
        }

        if (!state.Active) return false;

        // Şifre değiştirildiyse, değişimden önce (saniye hassasiyetiyle) üretilmiş token geçersizdir
        if (state.PasswordChangedAtUtc is { } changedAt)
        {
            var iat = principal.FindFirst("iat")?.Value;
            if (!long.TryParse(iat, out var issuedAtSeconds)) return false;

            var changedAtSeconds = new DateTimeOffset(DateTime.SpecifyKind(changedAt, DateTimeKind.Utc)).ToUnixTimeSeconds();
            if (issuedAtSeconds < changedAtSeconds) return false;
        }

        return true;
    }

    internal static (string? Kind, Guid Id) ResolveIdentity(ClaimsPrincipal p)
    {
        if (TryGuid(p, "adminUserId", out var adminId)) return ("admin", adminId);
        if (TryGuid(p, "companyUserId", out var cuId)) return ("companyUser", cuId);
        if (TryGuid(p, "courierId", out var courierId) || TryGuid(p, "CourierId", out courierId)) return ("courier", courierId);
        if ((TryGuid(p, "merchantId", out var mId) || TryGuid(p, "MerchantId", out mId)) && mId != Guid.Empty)
            return ("merchant", mId);
        return (null, Guid.Empty);
    }

    private static async Task<AccountState> QueryAsync(string kind, Guid id, IApplicationDbContext db, CancellationToken ct)
    {
        AccountState? state = kind switch
        {
            "admin" => await db.AdminUsers.AsNoTracking()
                .Where(a => a.Id == id && a.IsActive)
                .Select(a => new AccountState(true, a.PasswordChangedAt))
                .FirstOrDefaultAsync(ct),

            "companyUser" => await db.CompanyUsers.AsNoTracking()
                .Where(u => u.Id == id && u.IsActive && u.CourierCompany.IsActive)
                .Select(u => new AccountState(true, u.PasswordChangedAt))
                .FirstOrDefaultAsync(ct),

            "courier" => await db.Couriers.AsNoTracking()
                .Where(c => c.Id == id && db.CourierCompanies.Any(f => f.Id == c.CourierCompanyId && f.IsActive))
                .Select(c => new AccountState(true, c.PasswordChangedAt))
                .FirstOrDefaultAsync(ct),

            _ => await db.Merchants.AsNoTracking()
                .Where(m => m.Id == id && m.IsActive)
                .Select(m => new AccountState(true, m.PasswordChangedAt))
                .FirstOrDefaultAsync(ct),
        };

        return state ?? new AccountState(false, null);
    }

    private static bool TryGuid(ClaimsPrincipal p, string type, out Guid id)
    {
        id = Guid.Empty;
        var v = p.FindFirst(type)?.Value;
        return !string.IsNullOrEmpty(v) && Guid.TryParse(v, out id);
    }
}
