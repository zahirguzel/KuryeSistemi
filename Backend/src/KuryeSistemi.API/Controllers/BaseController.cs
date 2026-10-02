// Controllers/BaseController.cs

using System.Security.Claims;
using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BaseController : ControllerBase
{
    protected Guid GetMerchantId()
    {
        // NOT: ClaimTypes.NameIdentifier ("sub") bilerek kullanılmaz. Firma/SuperAdmin tokenlarında "sub",
        // işletme değil kullanıcı kimliğidir; işletme ID'si sanılırsa yanlış tenant sorgulanır.
        var claim = User.FindFirst("MerchantId")?.Value
                 ?? User.FindFirst("merchantId")?.Value;

        if (!string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out var merchantId) && merchantId != Guid.Empty)
            return merchantId;

        // Firma kullanıcısı veya Süper Admin ise X-Merchant-Id header'ı veya Guid.Empty
        if (IsFirmOrAdmin())
        {
            var headerVal = Request?.Headers["X-Merchant-Id"].FirstOrDefault();
            if (!string.IsNullOrEmpty(headerVal) && Guid.TryParse(headerVal, out var hId))
                return hId;

            return Guid.Empty;
        }

        throw new UnauthorizedAccessException("İşletme ID bulunamadı. Lütfen tekrar giriş yapın.");
    }

    protected Guid? GetCourierId()
    {
        var claim = User.FindFirst("CourierId")?.Value
                 ?? User.FindFirst("courierId")?.Value
                 ?? User.FindFirst("courier_id")?.Value;

        if (!string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out var courierId))
            return courierId;

        return null;
    }

    /// <summary>CompanyUser ID'sini JWT claim'inden okur.</summary>
    protected Guid? GetCompanyUserId()
    {
        var claim = User.FindFirst("companyUserId")?.Value;
        if (!string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out var id))
            return id;
        return null;
    }

    /// <summary>CourierCompany ID'sini JWT claim'inden okur (CompanyUser tokenında gelir).</summary>
    protected Guid? GetCourierCompanyId()
    {
        var claim = User.FindFirst("courierCompanyId")?.Value;
        if (!string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out var id))
            return id;
        return null;
    }

    /// <summary>AdminUser ID'sini JWT claim'inden okur.</summary>
    protected Guid? GetAdminUserId()
    {
        var claim = User.FindFirst("adminUserId")?.Value;
        if (!string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out var id))
            return id;
        return null;
    }

    protected bool IsFirmOrAdmin()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value
                ?? User.FindFirst("role")?.Value
                ?? User.FindFirst("roles")?.Value;

        if (string.Equals(role, "CourierFirm", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(role, "FirmAdmin", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
            return true;

        if (role?.StartsWith("CompanyUser", StringComparison.OrdinalIgnoreCase) == true)
            return true;

        return User.IsInRole("CourierFirm") || User.IsInRole("Admin") ||
               User.IsInRole("FirmAdmin")   || User.IsInRole("SuperAdmin") ||
               User.IsInRole("CompanyUser") ||
               User.Claims.Any(c => c.Type == ClaimTypes.Role && (c.Value.StartsWith("CompanyUser") || c.Value == "SuperAdmin"));
    }

    protected bool IsAdmin() =>
        User.IsInRole("SuperAdmin") ||
        (User.FindFirst(ClaimTypes.Role)?.Value?.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) ?? false);

    protected bool IsCompanyUser() =>
        User.IsInRole("CompanyUser") ||
        (User.FindFirst(ClaimTypes.Role)?.Value?.StartsWith("CompanyUser", StringComparison.OrdinalIgnoreCase) ?? false);

    protected Guid ResolveTenantId(Guid? requestedMerchantId = null)
    {
        if (IsFirmOrAdmin() && requestedMerchantId.HasValue && requestedMerchantId.Value != Guid.Empty)
        {
            return requestedMerchantId.Value;
        }

        var callerMerchantId = GetMerchantId();
        return callerMerchantId;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Tenant (Firma) Kapsamı — firma kullanıcıları yalnızca kendi firmalarının
    // işletmelerine / kurye / siparişlerine erişebilir.
    // Kural: işletmenin CourierCompanyId'si boşsa (eski/bağlanmamış kayıt) tüm firmalara açıktır;
    // doluysa yalnızca o firmanın kullanıcılarına ve SuperAdmin'e açıktır.
    // ──────────────────────────────────────────────────────────────────────────

    private IApplicationDbContext? ScopeDb
        => HttpContext?.RequestServices?.GetService(typeof(IApplicationDbContext)) as IApplicationDbContext;

    private Guid? TryGetOwnMerchantId()
    {
        var claim = User.FindFirst("MerchantId")?.Value ?? User.FindFirst("merchantId")?.Value;
        return Guid.TryParse(claim, out var id) && id != Guid.Empty ? id : null;
    }

    /// <summary>Çağıranın bağlı olduğu kurye firması (CompanyUser claim'i veya eski tip firma hesabının kendi işletme kaydı).</summary>
    protected async Task<Guid?> ResolveCallerCompanyIdAsync(CancellationToken ct = default)
    {
        var claimCompany = GetCourierCompanyId();
        if (claimCompany.HasValue && claimCompany.Value != Guid.Empty)
            return claimCompany;

        var db = ScopeDb;
        var ownId = TryGetOwnMerchantId();
        if (db is null || !ownId.HasValue)
            return null;

        return await db.Merchants.AsNoTracking()
            .Where(m => m.Id == ownId.Value)
            .Select(m => m.CourierCompanyId)
            .FirstOrDefaultAsync(ct);
    }

    /// <summary>Çağıran, verilen işletmenin verilerine erişebilir mi?</summary>
    protected async Task<bool> CanAccessMerchantAsync(Guid merchantId, CancellationToken ct = default)
    {
        if (merchantId == Guid.Empty) return false;
        if (IsAdmin()) return true;

        // Standart işletme: yalnızca kendisi
        if (!IsFirmOrAdmin())
            return TryGetOwnMerchantId() == merchantId;

        var db = ScopeDb;
        if (db is null) return true; // DI olmayan (birim test) ortam: eski davranış

        var target = await db.Merchants.AsNoTracking()
            .Where(m => m.Id == merchantId)
            .Select(m => new { m.CourierCompanyId })
            .FirstOrDefaultAsync(ct);

        if (target is null) return false;

        var callerCompanyId = await ResolveCallerCompanyIdAsync(ct);
        return target.CourierCompanyId == null || target.CourierCompanyId == callerCompanyId;
    }

    /// <summary>Çağıran, verilen kuryenin verilerine erişebilir mi?</summary>
    protected async Task<bool> CanAccessCourierAsync(KuryeSistemi.Domain.Entities.Courier courier, CancellationToken ct = default)
    {
        if (IsAdmin()) return true;

        var callerCompanyId = await ResolveCallerCompanyIdAsync(ct);
        if (callerCompanyId.HasValue && courier.CourierCompanyId == callerCompanyId.Value)
            return true;

        if (courier.MerchantId.HasValue)
            return await CanAccessMerchantAsync(courier.MerchantId.Value, ct);

        return false;
    }

    /// <summary>
    /// Firma alt kullanıcısının (CompanyUser) ilgili iznine sahip olup olmadığını kontrol eder.
    /// SuperAdmin, işletme ve eski tip firma hesapları için true döner (rol politikasıyla zaten yetkilidir).
    /// </summary>
    protected async Task<bool> HasCompanyPermissionAsync(
        KuryeSistemi.Domain.Entities.CompanyPermission permission,
        CancellationToken ct = default)
    {
        if (!IsCompanyUser()) return true;

        var userId = GetCompanyUserId();
        if (!userId.HasValue) return false;

        var db = ScopeDb;
        if (db is null) return true;

        var user = await db.CompanyUsers.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId.Value, ct);

        return user is not null && user.IsActive && user.HasPermission(permission);
    }

    /// <summary>Çağıranın erişebildiği işletme ID'leri. null = kısıtsız (SuperAdmin).</summary>
    protected async Task<HashSet<Guid>?> GetAccessibleMerchantIdsAsync(CancellationToken ct = default)
    {
        if (IsAdmin()) return null;

        if (!IsFirmOrAdmin())
        {
            var own = TryGetOwnMerchantId();
            return own.HasValue ? new HashSet<Guid> { own.Value } : new HashSet<Guid>();
        }

        var db = ScopeDb;
        if (db is null) return null;

        var callerCompanyId = await ResolveCallerCompanyIdAsync(ct);
        var ids = await db.Merchants.AsNoTracking()
            .Where(m => m.CourierCompanyId == null || m.CourierCompanyId == callerCompanyId)
            .Select(m => m.Id)
            .ToListAsync(ct);

        return ids.ToHashSet();
    }

    protected Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                 ?? User.FindFirst("sub")?.Value;
        if (Guid.TryParse(claim, out var userId))
            return userId;

        return Guid.Empty;
    }

    protected string GetUserEmail()
    {
        return User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value
            ?? string.Empty;
    }

    protected IActionResult CreateActionResult<T>(ServiceResult<T> result)
    {
        return StatusCode(result.StatusCode, result);
    }

    protected IActionResult CreateActionResult(ServiceResult result)
    {
        return StatusCode(result.StatusCode, result);
    }
}
