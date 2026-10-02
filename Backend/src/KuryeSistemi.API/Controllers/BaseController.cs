// Controllers/BaseController.cs

using System.Security.Claims;
using KuryeSistemi.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;

namespace KuryeSistemi.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BaseController : ControllerBase
{
    protected Guid GetMerchantId()
    {
        var claim = User.FindFirst("MerchantId")?.Value
                 ?? User.FindFirst("merchantId")?.Value
                 ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

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
