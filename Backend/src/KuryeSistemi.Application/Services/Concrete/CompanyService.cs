// Services/Concrete/CompanyService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Company;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Services.Concrete;

public sealed class CompanyService : ICompanyService
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasherService _passwordHasher;

    public CompanyService(IApplicationDbContext db, IPasswordHasherService passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<ServiceResult<MyCompanyDto>> GetCompanyAsync(Guid companyId, CancellationToken ct = default)
    {
        if (companyId == Guid.Empty)
            return ServiceResult<MyCompanyDto>.Unauthorized("Firma kimliği bulunamadı.");

        var c = await _db.CourierCompanies.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == companyId && !x.IsDeleted, ct);

        if (c is null)
            return ServiceResult<MyCompanyDto>.NotFound("Firma bulunamadı.");

        return ServiceResult<MyCompanyDto>.Success(new MyCompanyDto(
            c.Id, c.Name, c.Email, c.PhoneNumber, c.CreditBalance, c.CreditWarningThreshold,
            c.IsActive, c.BlockOnZeroCredit, c.LogoUrl, c.CreditBalance <= c.CreditWarningThreshold));
    }

    public async Task<ServiceResult<IReadOnlyList<CompanyUserDto>>> GetUsersAsync(Guid companyId, CancellationToken ct = default)
    {
        var users = await _db.CompanyUsers.AsNoTracking()
            .Where(u => u.CourierCompanyId == companyId && !u.IsDeleted)
            .OrderBy(u => u.FirstName)
            .ToListAsync(ct);

        // İzin varsayılanları (RoleDefaults) bellekte çözülür; sorguya çevrilemez
        var dtos = users.Select(u => new CompanyUserDto(
            u.Id, u.FirstName, u.LastName, u.Email, u.PhoneNumber, u.Role, u.IsActive, u.LastLoginAt,
            new CompanyUserPermissionsDto(
                u.HasPermission(CompanyPermission.ViewReports),
                u.HasPermission(CompanyPermission.ManageFinance),
                u.HasPermission(CompanyPermission.ManageCouriers),
                u.HasPermission(CompanyPermission.ManageOrders),
                u.HasPermission(CompanyPermission.ManageMerchants),
                u.HasPermission(CompanyPermission.EditCompanySettings)))).ToList();

        return ServiceResult<IReadOnlyList<CompanyUserDto>>.Success(dtos);
    }

    public async Task<ServiceResult<CompanyUserCreatedDto>> CreateUserAsync(
        Guid companyId, CreateCompanyUserRequest request, string actor, CancellationToken ct = default)
    {
        if (companyId == Guid.Empty)
            return ServiceResult<CompanyUserCreatedDto>.BadRequest("Firma kimliği bulunamadı (SuperAdmin için X-Company-Id başlığı gerekli).");

        var companyExists = await _db.CourierCompanies.AnyAsync(c => c.Id == companyId && !c.IsDeleted, ct);
        if (!companyExists)
            return ServiceResult<CompanyUserCreatedDto>.NotFound("Firma bulunamadı.");

        var emailNorm = request.Email.Trim().ToLowerInvariant();
        if (await AccountEmailGuard.IsTakenAsync(_db, emailNorm, ct))
            return ServiceResult<CompanyUserCreatedDto>.Conflict("Bu e-posta ile kayıtlı bir kullanıcı zaten var.");

        var user = new CompanyUser
        {
            CourierCompanyId = companyId,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = emailNorm,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            PhoneNumber = request.PhoneNumber?.Trim() ?? string.Empty,
            Role = request.Role,
            IsActive = true,
            CanViewReports = request.CanViewReports,
            CanManageFinance = request.CanManageFinance,
            CanManageCouriers = request.CanManageCouriers,
            CanManageOrders = request.CanManageOrders,
            CanManageMerchants = request.CanManageMerchants,
            CanEditCompanySettings = request.CanEditCompanySettings,
            CreatedBy = actor,
        };

        _db.CompanyUsers.Add(user);
        await _db.SaveChangesAsync(ct);
        return ServiceResult<CompanyUserCreatedDto>.Created(new CompanyUserCreatedDto(user.Id, user.Email, user.Role), "Kullanıcı oluşturuldu.");
    }

    public async Task<ServiceResult> UpdateUserPermissionsAsync(
        Guid companyId, Guid userId, UpdatePermissionsRequest request, string actor, CancellationToken ct = default)
    {
        var user = await _db.CompanyUsers
            .FirstOrDefaultAsync(u => u.Id == userId && u.CourierCompanyId == companyId && !u.IsDeleted, ct);
        if (user is null)
            return ServiceResult.NotFound("Kullanıcı bulunamadı.");

        // null = rol varsayılanına dön; true/false = override
        user.CanViewReports = request.CanViewReports;
        user.CanManageFinance = request.CanManageFinance;
        user.CanManageCouriers = request.CanManageCouriers;
        user.CanManageOrders = request.CanManageOrders;
        user.CanManageMerchants = request.CanManageMerchants;
        user.CanEditCompanySettings = request.CanEditCompanySettings;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = actor;

        await _db.SaveChangesAsync(ct);
        return ServiceResult.Success("İzinler güncellendi.");
    }

    public async Task<ServiceResult> ToggleUserActiveAsync(
        Guid companyId, Guid userId, string actor, CancellationToken ct = default)
    {
        var user = await _db.CompanyUsers
            .FirstOrDefaultAsync(u => u.Id == userId && u.CourierCompanyId == companyId && !u.IsDeleted, ct);
        if (user is null)
            return ServiceResult.NotFound("Kullanıcı bulunamadı.");

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = actor;
        await _db.SaveChangesAsync(ct);

        return ServiceResult.Success(user.IsActive ? "Kullanıcı aktifleştirildi." : "Kullanıcı pasifleştirildi.");
    }
}
