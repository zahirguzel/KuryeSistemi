using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.API.Controllers.Admin;

/// <summary>
/// Süper Admin işlemleri. Yalnızca SuperAdmin rolüne sahip JWT ile erişilebilir.
/// Kurye firması oluşturma, kontör yükleme, kullanıcı yönetimi içerir.
/// </summary>
[Authorize(Roles = "SuperAdmin")]
public class AdminController : BaseController
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasherService _passwordHasher;

    public AdminController(IApplicationDbContext db, IPasswordHasherService passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Kurye Firmaları
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>Tüm kurye firmalarını listeler.</summary>
    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies(CancellationToken ct)
    {
        var companies = await _db.CourierCompanies
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id, c.Name, c.Email, c.PhoneNumber,
                c.CreditBalance, c.CreditWarningThreshold,
                c.IsActive, c.BlockOnZeroCredit,
                MerchantCount = c.Merchants.Count(m => !m.IsDeleted),
                UserCount     = c.Users.Count(u => !u.IsDeleted),
                c.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(ServiceResult<object>.Success(companies));
    }

    /// <summary>Tek bir kurye firması detayı.</summary>
    [HttpGet("companies/{id:guid}")]
    public async Task<IActionResult> GetCompany(Guid id, CancellationToken ct)
    {
        var company = await _db.CourierCompanies
            .Include(c => c.Merchants.Where(m => !m.IsDeleted))
            .Include(c => c.Users.Where(u => !u.IsDeleted))
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);

        if (company is null)
            return NotFound(ServiceResult.NotFound("Firma bulunamadı."));

        return Ok(ServiceResult<object>.Success(new
        {
            company.Id, company.Name, company.Email, company.PhoneNumber,
            company.Address, company.TaxNumber, company.CreditBalance,
            company.CreditWarningThreshold, company.IsActive, company.BlockOnZeroCredit,
            company.LogoUrl, company.CreatedAt,
            Merchants = company.Merchants.Select(m => new { m.Id, m.Name, m.Email, m.IsActive }),
            Users     = company.Users.Select(u => new { u.Id, u.FirstName, u.LastName, u.Email, u.Role, u.IsActive }),
        }));
    }

    /// <summary>Yeni kurye firması oluşturur.</summary>
    [HttpPost("companies")]
    public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(ServiceResult.BadRequest("Firma adı ve e-posta zorunludur."));

        var emailNorm = req.Email.Trim().ToLowerInvariant();
        if (await _db.CourierCompanies.AnyAsync(c => c.Email == emailNorm && !c.IsDeleted, ct))
            return Conflict(ServiceResult.Conflict("Bu e-posta ile kayıtlı bir firma zaten var."));

        var adminId = GetAdminUserId()?.ToString() ?? "system";

        var company = new CourierCompany
        {
            Name                  = req.Name.Trim(),
            Email                 = emailNorm,
            PhoneNumber           = req.PhoneNumber?.Trim() ?? string.Empty,
            Address               = req.Address?.Trim() ?? string.Empty,
            TaxNumber             = req.TaxNumber?.Trim(),
            CreditBalance         = req.InitialCredit,
            CreditWarningThreshold = req.WarningThreshold > 0 ? req.WarningThreshold : 100,
            BlockOnZeroCredit     = req.BlockOnZeroCredit,
            IsActive              = true,
            CreatedBy             = adminId,
        };
        _db.CourierCompanies.Add(company);

        // İlk kontör hareketi
        if (req.InitialCredit > 0)
        {
            _db.CreditTransactions.Add(new CreditTransaction
            {
                CourierCompanyId = company.Id,
                Type             = CreditTransactionType.TopUp,
                Amount           = req.InitialCredit,
                BalanceAfter     = req.InitialCredit,
                ReferenceNumber  = $"INITIAL-{DateTime.UtcNow:yyyyMMdd}",
                Notes            = "Firma açılış kontörü",
                CreatedBy        = adminId,
            });
        }

        await _db.SaveChangesAsync(ct);
        return StatusCode(201, ServiceResult<object>.Success(new { company.Id, company.Name }, "Firma oluşturuldu."));
    }

    /// <summary>Firma bilgilerini günceller.</summary>
    [HttpPut("companies/{id:guid}")]
    public async Task<IActionResult> UpdateCompany(Guid id, [FromBody] UpdateCompanyRequest req, CancellationToken ct)
    {
        var company = await _db.CourierCompanies.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
        if (company is null) return NotFound(ServiceResult.NotFound("Firma bulunamadı."));

        if (!string.IsNullOrWhiteSpace(req.Name))         company.Name = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.PhoneNumber))  company.PhoneNumber = req.PhoneNumber.Trim();
        if (!string.IsNullOrWhiteSpace(req.Address))      company.Address = req.Address.Trim();
        if (req.TaxNumber is not null)                    company.TaxNumber = req.TaxNumber;
        if (req.WarningThreshold.HasValue)                company.CreditWarningThreshold = req.WarningThreshold.Value;
        if (req.BlockOnZeroCredit.HasValue)               company.BlockOnZeroCredit = req.BlockOnZeroCredit.Value;
        if (!string.IsNullOrWhiteSpace(req.LogoUrl))      company.LogoUrl = req.LogoUrl;

        company.UpdatedAt = DateTime.UtcNow;
        company.UpdatedBy = GetAdminUserId()?.ToString();
        await _db.SaveChangesAsync(ct);
        return Ok(ServiceResult.Success("Firma güncellendi."));
    }

    /// <summary>Firmanın aktif/pasif durumunu değiştirir.</summary>
    [HttpPatch("companies/{id:guid}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid id, CancellationToken ct)
    {
        var company = await _db.CourierCompanies.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
        if (company is null) return NotFound(ServiceResult.NotFound("Firma bulunamadı."));

        company.IsActive  = !company.IsActive;
        company.UpdatedAt = DateTime.UtcNow;
        company.UpdatedBy = GetAdminUserId()?.ToString();
        await _db.SaveChangesAsync(ct);

        var msg = company.IsActive ? "Firma aktifleştirildi." : "Firma pasifleştirildi.";
        return Ok(ServiceResult.Success(msg));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Kontör Yönetimi
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>Firmaya kontör yükler.</summary>
    [HttpPost("companies/{id:guid}/credit/topup")]
    public async Task<IActionResult> TopUpCredit(Guid id, [FromBody] CreditTopUpRequest req, CancellationToken ct)
    {
        if (req.Amount <= 0)
            return BadRequest(ServiceResult.BadRequest("Yüklenecek kontör miktarı 0'dan büyük olmalıdır."));

        var company = await _db.CourierCompanies.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
        if (company is null) return NotFound(ServiceResult.NotFound("Firma bulunamadı."));

        company.CreditBalance += req.Amount;
        var adminId = GetAdminUserId()?.ToString() ?? "system";

        _db.CreditTransactions.Add(new CreditTransaction
        {
            CourierCompanyId = company.Id,
            Type             = CreditTransactionType.TopUp,
            Amount           = req.Amount,
            BalanceAfter     = company.CreditBalance,
            ReferenceNumber  = req.ReferenceNumber,
            Notes            = req.Notes,
            CreatedBy        = adminId,
        });

        company.UpdatedAt = DateTime.UtcNow;
        company.UpdatedBy = adminId;
        await _db.SaveChangesAsync(ct);

        return Ok(ServiceResult<object>.Success(new { company.CreditBalance }, $"{req.Amount} kontör yüklendi."));
    }

    /// <summary>Manuel kontör düzeltmesi (pozitif veya negatif).</summary>
    [HttpPost("companies/{id:guid}/credit/adjust")]
    public async Task<IActionResult> AdjustCredit(Guid id, [FromBody] CreditAdjustRequest req, CancellationToken ct)
    {
        var company = await _db.CourierCompanies.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
        if (company is null) return NotFound(ServiceResult.NotFound("Firma bulunamadı."));

        company.CreditBalance += req.Amount;
        if (company.CreditBalance < 0) company.CreditBalance = 0;

        var adminId = GetAdminUserId()?.ToString() ?? "system";

        _db.CreditTransactions.Add(new CreditTransaction
        {
            CourierCompanyId = company.Id,
            Type             = CreditTransactionType.ManualAdjustment,
            Amount           = req.Amount,
            BalanceAfter     = company.CreditBalance,
            Notes            = req.Reason,
            CreatedBy        = adminId,
        });

        company.UpdatedAt = DateTime.UtcNow;
        company.UpdatedBy = adminId;
        await _db.SaveChangesAsync(ct);

        return Ok(ServiceResult<object>.Success(new { company.CreditBalance }, "Kontör ayarlandı."));
    }

    /// <summary>Firma kontör geçmişi.</summary>
    [HttpGet("companies/{id:guid}/credit/history")]
    public async Task<IActionResult> GetCreditHistory(Guid id, [FromQuery] int page = 1, [FromQuery] int size = 50, CancellationToken ct = default)
    {
        if (!(await _db.CourierCompanies.AnyAsync(c => c.Id == id && !c.IsDeleted, ct)))
            return NotFound(ServiceResult.NotFound("Firma bulunamadı."));

        var query = _db.CreditTransactions
            .Where(t => t.CourierCompanyId == id)
            .OrderByDescending(t => t.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * size)
            .Take(size)
            .Select(t => new
            {
                t.Id, t.Type, t.Amount, t.BalanceAfter,
                t.ReferenceNumber, t.Notes, t.OrderId, t.CreatedAt, t.CreatedBy
            })
            .ToListAsync(ct);

        return Ok(ServiceResult<object>.Success(new { Total = total, Page = page, Size = size, Items = items }));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Kendi Admin Hesabı Yönetimi
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>Tüm admin kullanıcılarını listeler.</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetAdmins(CancellationToken ct)
    {
        var admins = await _db.AdminUsers
            .Where(a => !a.IsDeleted)
            .Select(a => new { a.Id, a.FullName, a.Email, a.IsActive, a.LastLoginAt, a.CreatedAt })
            .ToListAsync(ct);

        return Ok(ServiceResult<object>.Success(admins));
    }

    /// <summary>Yeni Süper Admin hesabı oluşturur.</summary>
    [HttpPost("users")]
    public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(ServiceResult.BadRequest("E-posta ve şifre zorunludur."));

        var emailNorm = req.Email.Trim().ToLowerInvariant();
        if (await _db.AdminUsers.AnyAsync(a => a.Email == emailNorm && !a.IsDeleted, ct))
            return Conflict(ServiceResult.Conflict("Bu e-posta ile kayıtlı bir admin zaten var."));

        var admin = new AdminUser
        {
            FullName     = req.FullName.Trim(),
            Email        = emailNorm,
            PasswordHash = _passwordHasher.HashPassword(req.Password),
            IsActive     = true,
            CreatedBy    = GetAdminUserId()?.ToString() ?? "system",
        };

        _db.AdminUsers.Add(admin);
        await _db.SaveChangesAsync(ct);
        return StatusCode(201, ServiceResult<object>.Success(new { admin.Id, admin.Email }, "Admin oluşturuldu."));
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────

public record CreateCompanyRequest(
    string Name,
    string Email,
    string? PhoneNumber,
    string? Address,
    string? TaxNumber,
    int InitialCredit = 0,
    int WarningThreshold = 100,
    bool BlockOnZeroCredit = true);

public record UpdateCompanyRequest(
    string? Name,
    string? PhoneNumber,
    string? Address,
    string? TaxNumber,
    int? WarningThreshold,
    bool? BlockOnZeroCredit,
    string? LogoUrl);

public record CreditTopUpRequest(int Amount, string? ReferenceNumber, string? Notes);
public record CreditAdjustRequest(int Amount, string? Reason);
public record CreateAdminRequest(string FullName, string Email, string Password);
