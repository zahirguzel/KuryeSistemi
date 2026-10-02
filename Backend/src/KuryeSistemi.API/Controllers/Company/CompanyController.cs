using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.API.Controllers.Company;

/// <summary>
/// Kurye Firması yönetim controller'ı.
/// CompanyUser veya SuperAdmin JWT ile erişilebilir.
/// Firma alt kullanıcılarını, işletmeleri, kontör geçmişini yönetir.
/// </summary>
[Authorize(Roles = "SuperAdmin,CompanyUser_Manager,CompanyUser_Operator,CompanyUser_Accountant,CompanyUser_Support,CompanyUser")]
public class CompanyController : BaseController
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasherService _passwordHasher;

    public CompanyController(IApplicationDbContext db, IPasswordHasherService passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Firma Bilgileri
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>Kendi firmasının özet bilgisini döner.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMyCompany(CancellationToken ct)
    {
        var companyId = ResolveCompanyId();
        if (companyId == Guid.Empty)
            return Unauthorized(ServiceResult.Unauthorized("Firma kimliği bulunamadı."));

        var company = await _db.CourierCompanies
            .FirstOrDefaultAsync(c => c.Id == companyId && !c.IsDeleted, ct);

        if (company is null) return NotFound(ServiceResult.NotFound("Firma bulunamadı."));

        return Ok(ServiceResult<object>.Success(new
        {
            company.Id, company.Name, company.Email, company.PhoneNumber,
            company.CreditBalance, company.CreditWarningThreshold,
            company.IsActive, company.BlockOnZeroCredit, company.LogoUrl
        }));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Alt Kullanıcı Yönetimi
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>Firma alt kullanıcılarını listeler.</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(CancellationToken ct)
    {
        if (!await HasPermissionAsync(CompanyPermission.ManageCouriers, ct) &&
            !await HasPermissionAsync(CompanyPermission.EditCompanySettings, ct))
            return Forbid();

        var companyId = ResolveCompanyId();
        var users = await _db.CompanyUsers
            .Where(u => u.CourierCompanyId == companyId && !u.IsDeleted)
            .OrderBy(u => u.FirstName)
            .Select(u => new
            {
                u.Id, u.FirstName, u.LastName, u.Email, u.PhoneNumber,
                u.Role, u.IsActive, u.LastLoginAt,
                Permissions = new
                {
                    ViewReports    = u.CanViewReports    ?? RoleDefaults.CanViewReports(u.Role),
                    ManageFinance  = u.CanManageFinance  ?? RoleDefaults.CanManageFinance(u.Role),
                    ManageCouriers = u.CanManageCouriers ?? RoleDefaults.CanManageCouriers(u.Role),
                    ManageOrders   = u.CanManageOrders   ?? RoleDefaults.CanManageOrders(u.Role),
                    ManageMerchants = u.CanManageMerchants ?? RoleDefaults.CanManageMerchants(u.Role),
                    EditSettings   = u.CanEditCompanySettings ?? RoleDefaults.CanEditCompanySettings(u.Role),
                }
            })
            .ToListAsync(ct);

        return Ok(ServiceResult<object>.Success(users));
    }

    /// <summary>Yeni firma alt kullanıcısı oluşturur.</summary>
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateCompanyUserRequest req, CancellationToken ct)
    {
        if (!await HasPermissionAsync(CompanyPermission.EditCompanySettings, ct))
            return Forbid();

        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(ServiceResult.BadRequest("E-posta ve şifre zorunludur."));

        var emailNorm = req.Email.Trim().ToLowerInvariant();
        if (await _db.CompanyUsers.AnyAsync(u => u.Email == emailNorm && !u.IsDeleted, ct))
            return Conflict(ServiceResult.Conflict("Bu e-posta ile kayıtlı bir kullanıcı zaten var."));

        var companyId = ResolveCompanyId();
        var createdBy = GetCompanyUserId()?.ToString() ?? GetAdminUserId()?.ToString() ?? "system";

        var user = new CompanyUser
        {
            CourierCompanyId     = companyId,
            FirstName            = req.FirstName.Trim(),
            LastName             = req.LastName.Trim(),
            Email                = emailNorm,
            PasswordHash         = _passwordHasher.HashPassword(req.Password),
            PhoneNumber          = req.PhoneNumber?.Trim() ?? string.Empty,
            Role                 = req.Role,
            IsActive             = true,
            CanViewReports       = req.CanViewReports,
            CanManageFinance     = req.CanManageFinance,
            CanManageCouriers    = req.CanManageCouriers,
            CanManageOrders      = req.CanManageOrders,
            CanManageMerchants   = req.CanManageMerchants,
            CanEditCompanySettings = req.CanEditCompanySettings,
            CreatedBy            = createdBy,
        };

        _db.CompanyUsers.Add(user);
        await _db.SaveChangesAsync(ct);
        return StatusCode(201, ServiceResult<object>.Success(new { user.Id, user.Email, user.Role }, "Kullanıcı oluşturuldu."));
    }

    /// <summary>Kullanıcı izinlerini günceller.</summary>
    [HttpPut("users/{userId:guid}/permissions")]
    public async Task<IActionResult> UpdateUserPermissions(Guid userId, [FromBody] UpdatePermissionsRequest req, CancellationToken ct)
    {
        if (!await HasPermissionAsync(CompanyPermission.EditCompanySettings, ct))
            return Forbid();

        var companyId = ResolveCompanyId();
        var user = await _db.CompanyUsers
            .FirstOrDefaultAsync(u => u.Id == userId && u.CourierCompanyId == companyId && !u.IsDeleted, ct);

        if (user is null) return NotFound(ServiceResult.NotFound("Kullanıcı bulunamadı."));

        // null = rol varsayılanına dön; true/false = override
        user.CanViewReports       = req.CanViewReports;
        user.CanManageFinance     = req.CanManageFinance;
        user.CanManageCouriers    = req.CanManageCouriers;
        user.CanManageOrders      = req.CanManageOrders;
        user.CanManageMerchants   = req.CanManageMerchants;
        user.CanEditCompanySettings = req.CanEditCompanySettings;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = GetCompanyUserId()?.ToString();

        await _db.SaveChangesAsync(ct);
        return Ok(ServiceResult.Success("İzinler güncellendi."));
    }

    /// <summary>Kullanıcı aktif/pasif durumunu değiştirir.</summary>
    [HttpPatch("users/{userId:guid}/toggle-active")]
    public async Task<IActionResult> ToggleUserActive(Guid userId, CancellationToken ct)
    {
        if (!await HasPermissionAsync(CompanyPermission.EditCompanySettings, ct))
            return Forbid();

        var companyId = ResolveCompanyId();
        var user = await _db.CompanyUsers
            .FirstOrDefaultAsync(u => u.Id == userId && u.CourierCompanyId == companyId && !u.IsDeleted, ct);

        if (user is null) return NotFound(ServiceResult.NotFound("Kullanıcı bulunamadı."));

        user.IsActive  = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = GetCompanyUserId()?.ToString();
        await _db.SaveChangesAsync(ct);

        return Ok(ServiceResult.Success(user.IsActive ? "Kullanıcı aktifleştirildi." : "Kullanıcı pasifleştirildi."));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Kontör Geçmişi
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>Kendi firmasının kontör hareketlerini listeler.</summary>
    [HttpGet("credits")]
    public async Task<IActionResult> GetCreditHistory([FromQuery] int page = 1, [FromQuery] int size = 50, CancellationToken ct = default)
    {
        if (!await HasPermissionAsync(CompanyPermission.ViewReports, ct))
            return Forbid();

        var companyId = ResolveCompanyId();
        var query = _db.CreditTransactions
            .Where(t => t.CourierCompanyId == companyId)
            .OrderByDescending(t => t.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * size)
            .Take(size)
            .Select(t => new { t.Id, t.Type, t.Amount, t.BalanceAfter, t.Notes, t.OrderId, t.CreatedAt })
            .ToListAsync(ct);

        return Ok(ServiceResult<object>.Success(new { Total = total, Page = page, Size = size, Items = items }));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Yardımcı Metotlar
    // ──────────────────────────────────────────────────────────────────────────

    private Guid ResolveCompanyId()
    {
        // SuperAdmin kendi firması olmadığı için CompanyId header veya query'den alınabilir
        if (IsAdmin())
        {
            var headerVal = Request.Headers["X-Company-Id"].FirstOrDefault();
            if (Guid.TryParse(headerVal, out var hId)) return hId;
            return Guid.Empty;
        }

        return GetCourierCompanyId() ?? Guid.Empty;
    }

    private async Task<bool> HasPermissionAsync(CompanyPermission permission, CancellationToken ct)
    {
        if (IsAdmin()) return true; // SuperAdmin her şeyi yapabilir

        var userId = GetCompanyUserId();
        if (!userId.HasValue) return false;

        var user = await _db.CompanyUsers
            .FirstOrDefaultAsync(u => u.Id == userId.Value && !u.IsDeleted, ct);

        return user?.HasPermission(permission) ?? false;
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────

public record CreateCompanyUserRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string? PhoneNumber,
    CompanyUserRole Role = CompanyUserRole.Operator,
    bool? CanViewReports = null,
    bool? CanManageFinance = null,
    bool? CanManageCouriers = null,
    bool? CanManageOrders = null,
    bool? CanManageMerchants = null,
    bool? CanEditCompanySettings = null);

public record UpdatePermissionsRequest(
    bool? CanViewReports,
    bool? CanManageFinance,
    bool? CanManageCouriers,
    bool? CanManageOrders,
    bool? CanManageMerchants,
    bool? CanEditCompanySettings);
