// Services/Concrete/CompanyAdminService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Company;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Services.Concrete;

public sealed class CompanyAdminService : ICompanyAdminService
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasherService _passwordHasher;

    public CompanyAdminService(IApplicationDbContext db, IPasswordHasherService passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<ServiceResult<IReadOnlyList<CompanyListItemDto>>> GetCompaniesAsync(CancellationToken ct = default)
    {
        var companies = await _db.CourierCompanies.AsNoTracking()
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.Name)
            .Select(c => new CompanyListItemDto(
                c.Id, c.Name, c.Email, c.PhoneNumber,
                c.CreditBalance, c.CreditWarningThreshold,
                c.IsActive, c.BlockOnZeroCredit,
                c.Merchants.Count(m => !m.IsDeleted),
                c.Users.Count(u => !u.IsDeleted),
                c.CreatedAt))
            .ToListAsync(ct);

        return ServiceResult<IReadOnlyList<CompanyListItemDto>>.Success(companies);
    }

    public async Task<ServiceResult<CompanyDetailDto>> GetCompanyAsync(Guid id, CancellationToken ct = default)
    {
        var company = await _db.CourierCompanies.AsNoTracking()
            .Include(c => c.Merchants.Where(m => !m.IsDeleted))
            .Include(c => c.Users.Where(u => !u.IsDeleted))
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);

        if (company is null)
            return ServiceResult<CompanyDetailDto>.NotFound("Firma bulunamadı.");

        var dto = new CompanyDetailDto(
            company.Id, company.Name, company.Email, company.PhoneNumber, company.Address, company.TaxNumber,
            company.CreditBalance, company.CreditWarningThreshold, company.IsActive, company.BlockOnZeroCredit,
            company.LogoUrl, company.CreatedAt,
            company.Merchants.Select(m => new CompanyMerchantItemDto(m.Id, m.Name, m.Email, m.IsActive)).ToList(),
            company.Users.Select(u => new CompanyUserSummaryDto(u.Id, u.FirstName, u.LastName, u.Email, u.Role, u.IsActive)).ToList());

        return ServiceResult<CompanyDetailDto>.Success(dto);
    }

    public async Task<ServiceResult<CompanyCreatedDto>> CreateCompanyAsync(
        CreateCompanyRequest request, string actor, CancellationToken ct = default)
    {
        var emailNorm = request.Email.Trim().ToLowerInvariant();
        if (await _db.CourierCompanies.AnyAsync(c => c.Email == emailNorm && !c.IsDeleted, ct))
            return ServiceResult<CompanyCreatedDto>.Conflict("Bu e-posta ile kayıtlı bir firma zaten var.");

        var company = new CourierCompany
        {
            Name = request.Name.Trim(),
            Email = emailNorm,
            PhoneNumber = request.PhoneNumber?.Trim() ?? string.Empty,
            Address = request.Address?.Trim() ?? string.Empty,
            TaxNumber = request.TaxNumber?.Trim(),
            CreditBalance = request.InitialCredit,
            CreditWarningThreshold = request.WarningThreshold > 0 ? request.WarningThreshold : 100,
            BlockOnZeroCredit = request.BlockOnZeroCredit,
            IsActive = true,
            CreatedBy = actor,
        };
        _db.CourierCompanies.Add(company);

        // İlk kontör hareketi (firma ile aynı SaveChanges içinde; yeni kayıt olduğundan çakışma olmaz)
        if (request.InitialCredit > 0)
        {
            _db.CreditTransactions.Add(new CreditTransaction
            {
                CourierCompanyId = company.Id,
                Type = CreditTransactionType.TopUp,
                Amount = request.InitialCredit,
                BalanceAfter = request.InitialCredit,
                ReferenceNumber = $"INITIAL-{DateTime.UtcNow:yyyyMMdd}",
                Notes = "Firma açılış kontörü",
                CreatedBy = actor,
            });
        }

        await _db.SaveChangesAsync(ct);
        return ServiceResult<CompanyCreatedDto>.Created(new CompanyCreatedDto(company.Id, company.Name), "Firma oluşturuldu.");
    }

    public async Task<ServiceResult> UpdateCompanyAsync(
        Guid id, UpdateCompanyRequest request, string actor, CancellationToken ct = default)
    {
        var company = await _db.CourierCompanies.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
        if (company is null)
            return ServiceResult.NotFound("Firma bulunamadı.");

        if (!string.IsNullOrWhiteSpace(request.Name)) company.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber)) company.PhoneNumber = request.PhoneNumber.Trim();
        if (!string.IsNullOrWhiteSpace(request.Address)) company.Address = request.Address.Trim();
        if (request.TaxNumber is not null) company.TaxNumber = request.TaxNumber;
        if (request.WarningThreshold.HasValue) company.CreditWarningThreshold = request.WarningThreshold.Value;
        if (request.BlockOnZeroCredit.HasValue) company.BlockOnZeroCredit = request.BlockOnZeroCredit.Value;
        if (!string.IsNullOrWhiteSpace(request.LogoUrl)) company.LogoUrl = request.LogoUrl;

        company.UpdatedAt = DateTime.UtcNow;
        company.UpdatedBy = actor;
        await _db.SaveChangesAsync(ct);
        return ServiceResult.Success("Firma güncellendi.");
    }

    public async Task<ServiceResult> ToggleCompanyActiveAsync(Guid id, string actor, CancellationToken ct = default)
    {
        var company = await _db.CourierCompanies.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
        if (company is null)
            return ServiceResult.NotFound("Firma bulunamadı.");

        company.IsActive = !company.IsActive;
        company.UpdatedAt = DateTime.UtcNow;
        company.UpdatedBy = actor;
        await _db.SaveChangesAsync(ct);

        return ServiceResult.Success(company.IsActive ? "Firma aktifleştirildi." : "Firma pasifleştirildi.");
    }

    public async Task<ServiceResult<IReadOnlyList<AdminUserDto>>> GetAdminsAsync(CancellationToken ct = default)
    {
        var admins = await _db.AdminUsers.AsNoTracking()
            .Where(a => !a.IsDeleted)
            .Select(a => new AdminUserDto(a.Id, a.FullName, a.Email, a.IsActive, a.LastLoginAt, a.CreatedAt))
            .ToListAsync(ct);

        return ServiceResult<IReadOnlyList<AdminUserDto>>.Success(admins);
    }

    public async Task<ServiceResult<AdminCreatedDto>> CreateAdminAsync(
        CreateAdminRequest request, string actor, CancellationToken ct = default)
    {
        var emailNorm = request.Email.Trim().ToLowerInvariant();
        if (await AccountEmailGuard.IsTakenAsync(_db, emailNorm, ct))
            return ServiceResult<AdminCreatedDto>.Conflict("Bu e-posta ile kayıtlı bir hesap zaten var.");

        var admin = new AdminUser
        {
            FullName = request.FullName.Trim(),
            Email = emailNorm,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            IsActive = true,
            CreatedBy = actor,
        };

        _db.AdminUsers.Add(admin);
        await _db.SaveChangesAsync(ct);
        return ServiceResult<AdminCreatedDto>.Created(new AdminCreatedDto(admin.Id, admin.Email), "Admin oluşturuldu.");
    }
}
