using KuryeSistemi.Application.DTOs.Company;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KuryeSistemi.API.Controllers.Company;

/// <summary>
/// Kurye Firması yönetim controller'ı.
/// CompanyUser veya SuperAdmin JWT ile erişilebilir; firma alt kullanıcılarını ve kontör geçmişini yönetir.
/// İzin matrisi (CompanyPermission) burada, iş mantığı ICompanyService / ICreditService'te uygulanır.
/// </summary>
[Authorize(Roles = "SuperAdmin,CompanyUser_Manager,CompanyUser_Operator,CompanyUser_Accountant,CompanyUser_Support,CompanyUser")]
public class CompanyController : BaseController
{
    private readonly ICompanyService _companyService;
    private readonly ICreditService _creditService;

    public CompanyController(ICompanyService companyService, ICreditService creditService)
    {
        _companyService = companyService;
        _creditService = creditService;
    }

    private string Actor => GetCompanyUserId()?.ToString() ?? GetAdminUserId()?.ToString() ?? "system";

    /// <summary>Kendi firmasının özet bilgisini döner.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMyCompany(CancellationToken ct)
        => CreateActionResult(await _companyService.GetCompanyAsync(ResolveCompanyId(), ct));

    /// <summary>Firma alt kullanıcılarını listeler.</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(CancellationToken ct)
    {
        if (!await HasCompanyPermissionAsync(CompanyPermission.ManageCouriers, ct) &&
            !await HasCompanyPermissionAsync(CompanyPermission.EditCompanySettings, ct))
            return Forbid();

        return CreateActionResult(await _companyService.GetUsersAsync(ResolveCompanyId(), ct));
    }

    /// <summary>Yeni firma alt kullanıcısı oluşturur.</summary>
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateCompanyUserRequest req, CancellationToken ct)
    {
        if (!await HasCompanyPermissionAsync(CompanyPermission.EditCompanySettings, ct))
            return Forbid();

        return CreateActionResult(await _companyService.CreateUserAsync(ResolveCompanyId(), req, Actor, ct));
    }

    /// <summary>Kullanıcı izinlerini günceller.</summary>
    [HttpPut("users/{userId:guid}/permissions")]
    public async Task<IActionResult> UpdateUserPermissions(Guid userId, [FromBody] UpdatePermissionsRequest req, CancellationToken ct)
    {
        if (!await HasCompanyPermissionAsync(CompanyPermission.EditCompanySettings, ct))
            return Forbid();

        return CreateActionResult(await _companyService.UpdateUserPermissionsAsync(ResolveCompanyId(), userId, req, Actor, ct));
    }

    /// <summary>Kullanıcı aktif/pasif durumunu değiştirir.</summary>
    [HttpPatch("users/{userId:guid}/toggle-active")]
    public async Task<IActionResult> ToggleUserActive(Guid userId, CancellationToken ct)
    {
        if (!await HasCompanyPermissionAsync(CompanyPermission.EditCompanySettings, ct))
            return Forbid();

        return CreateActionResult(await _companyService.ToggleUserActiveAsync(ResolveCompanyId(), userId, Actor, ct));
    }

    /// <summary>Kendi firmasının kontör hareketlerini listeler (sayfalı; sayfa boyutu en fazla 200).</summary>
    [HttpGet("credits")]
    public async Task<IActionResult> GetCreditHistory([FromQuery] int page = 1, [FromQuery] int size = 50, CancellationToken ct = default)
    {
        if (!await HasCompanyPermissionAsync(CompanyPermission.ViewReports, ct))
            return Forbid();

        return CreateActionResult(await _creditService.GetHistoryAsync(ResolveCompanyId(), page, size, ct));
    }

    /// <summary>SuperAdmin için firma X-Company-Id başlığından, firma kullanıcısı için JWT claim'inden çözülür.</summary>
    private Guid ResolveCompanyId()
    {
        if (IsAdmin())
        {
            var headerVal = Request.Headers["X-Company-Id"].FirstOrDefault();
            return Guid.TryParse(headerVal, out var headerId) ? headerId : Guid.Empty;
        }

        return GetCourierCompanyId() ?? Guid.Empty;
    }
}
