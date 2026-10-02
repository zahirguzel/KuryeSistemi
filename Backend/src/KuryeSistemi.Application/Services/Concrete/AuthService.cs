// Services/Concrete/AuthService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.Common.Settings;
using KuryeSistemi.Application.DTOs.Auth;
using KuryeSistemi.Application.Features.Auth.DTOs;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KuryeSistemi.Application.Services.Concrete;

public class AuthService : IAuthService
{
    private readonly IMerchantRepository _merchantRepository;
    private readonly ICourierRepository _courierRepository;
    private readonly IApplicationDbContext _db;
    private readonly IJwtService _jwtService;
    private readonly IPasswordHasherService _passwordHasherService;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        IMerchantRepository merchantRepository,
        ICourierRepository courierRepository,
        IApplicationDbContext db,
        IJwtService jwtService,
        IPasswordHasherService passwordHasherService,
        IOptions<JwtSettings> jwtSettings)
    {
        _merchantRepository = merchantRepository;
        _courierRepository = courierRepository;
        _db = db;
        _jwtService = jwtService;
        _passwordHasherService = passwordHasherService;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<ServiceResult<AuthTokenDto>> LoginAsync(
        LoginRequestDto request,
        CancellationToken cancellationToken = default)
    {
        const string invalidMessage = "E-posta veya şifre hatalı.";

        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ServiceResult<AuthTokenDto>.BadRequest("E-posta ve şifre zorunludur.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // ─── 1. Süper Admin kontrolü ──────────────────────────────────────────
        var adminUser = await _db.AdminUsers
            .FirstOrDefaultAsync(a => a.Email == normalizedEmail && !a.IsDeleted, cancellationToken);

        if (adminUser is not null && adminUser.IsActive)
        {
            if (!_passwordHasherService.VerifyPassword(request.Password, adminUser.PasswordHash))
                return ServiceResult<AuthTokenDto>.Unauthorized(invalidMessage);

            adminUser.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            var token = _jwtService.GenerateAdminToken(adminUser.Id, adminUser.Email);
            var dto = new AuthTokenDto(
                token,
                MerchantId:       Guid.Empty,
                MerchantName:     adminUser.FullName,
                Email:            adminUser.Email,
                ExpiresAt:        DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
                Roles:            new[] { "SuperAdmin" });

            return ServiceResult<AuthTokenDto>.Success(dto, "Giriş başarılı.");
        }

        // ─── 2. Kurye Firması Alt Kullanıcısı (CompanyUser) ──────────────────
        var companyUser = await _db.CompanyUsers
            .Include(u => u.CourierCompany)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail && !u.IsDeleted, cancellationToken);

        if (companyUser is not null && companyUser.IsActive && companyUser.CourierCompany.IsActive)
        {
            if (!_passwordHasherService.VerifyPassword(request.Password, companyUser.PasswordHash))
                return ServiceResult<AuthTokenDto>.Unauthorized(invalidMessage);

            companyUser.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            // Rol stringini CompanyUserRole enum'undan türet
            var roleString = $"CompanyUser_{companyUser.Role}";
            var token = _jwtService.GenerateCompanyUserToken(
                companyUser.Id,
                companyUser.CourierCompanyId,
                companyUser.Email,
                roleString);

            var dto = new AuthTokenDto(
                token,
                MerchantId:       Guid.Empty,
                MerchantName:     $"{companyUser.FirstName} {companyUser.LastName}",
                Email:            companyUser.Email,
                ExpiresAt:        DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
                Roles:            new[] { roleString, "CompanyUser" },
                CompanyUserId:    companyUser.Id,
                CourierCompanyId: companyUser.CourierCompanyId);

            return ServiceResult<AuthTokenDto>.Success(dto, "Giriş başarılı.");
        }

        // ─── 3. İşletme (Merchant / Restoran) ───────────────────────────────
        var merchant = await _merchantRepository.GetByEmailAsync(normalizedEmail);
        if (merchant is not null && merchant.IsActive)
        {
            var isPasswordValid = _passwordHasherService.VerifyPassword(request.Password, merchant.PasswordHash);
            if (!isPasswordValid)
                return ServiceResult<AuthTokenDto>.Unauthorized(invalidMessage);

            // Geriye dönük uyumluluk: Eski düz metin şifreyi BCrypt ile güvenli hale yükselt
            if (!merchant.PasswordHash.StartsWith("$2a$") &&
                !merchant.PasswordHash.StartsWith("$2b$") &&
                !merchant.PasswordHash.StartsWith("$2y$"))
            {
                merchant.PasswordHash = _passwordHasherService.HashPassword(request.Password);
                merchant.UpdatedAt = DateTime.UtcNow;
                _merchantRepository.Update(merchant);
                await _merchantRepository.SaveChangesAsync();
            }

            var role  = string.IsNullOrWhiteSpace(merchant.Role) ? "Merchant" : merchant.Role;
            var token = _jwtService.GenerateToken(merchant.Id, merchant.Email, role: role);

            var dto = new AuthTokenDto(
                token,
                MerchantId:       merchant.Id,
                MerchantName:     merchant.Name,
                Email:            merchant.Email,
                ExpiresAt:        DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
                CourierId:        null,
                Roles:            new[] { role });

            return ServiceResult<AuthTokenDto>.Success(dto, "Giriş başarılı.");
        }

        // ─── 4. Kurye ────────────────────────────────────────────────────────
        var courier = await _courierRepository.GetByEmailAsync(normalizedEmail);
        if (courier is not null)
        {
            if (string.IsNullOrEmpty(courier.PasswordHash))
                return ServiceResult<AuthTokenDto>.Unauthorized("Kurye hesabı şifresi henüz tanımlanmamış.");

            if (!_passwordHasherService.VerifyPassword(request.Password, courier.PasswordHash))
                return ServiceResult<AuthTokenDto>.Unauthorized(invalidMessage);

            var token = _jwtService.GenerateToken(courier.MerchantId, courier.Email, courier.Id, role: "Courier");

            var dto = new AuthTokenDto(
                token,
                MerchantId:   courier.MerchantId,
                MerchantName: $"{courier.FirstName} {courier.LastName}",
                Email:        courier.Email,
                ExpiresAt:    DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
                CourierId:    courier.Id,
                Roles:        new[] { "Courier" });

            return ServiceResult<AuthTokenDto>.Success(dto, "Giriş başarılı.");
        }

        return ServiceResult<AuthTokenDto>.Unauthorized(invalidMessage);
    }

    public async Task<ServiceResult> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            return ServiceResult.BadRequest("Mevcut şifre ve yeni şifre boş olamaz.");

        if (request.NewPassword.Length < 6)
            return ServiceResult.BadRequest("Yeni şifre en az 6 karakter olmalıdır.");

        // 1. Süper Admin kontrolü
        var admin = await _db.AdminUsers.FirstOrDefaultAsync(a => a.Id == userId && !a.IsDeleted, cancellationToken);
        if (admin is not null)
        {
            if (!_passwordHasherService.VerifyPassword(request.CurrentPassword, admin.PasswordHash))
                return ServiceResult.BadRequest("Mevcut şifreniz hatalı.");

            admin.PasswordHash = _passwordHasherService.HashPassword(request.NewPassword);
            admin.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            return ServiceResult.Success("Şifreniz başarıyla güncellendi.");
        }

        // 2. CompanyUser kontrolü
        var companyUser = await _db.CompanyUsers.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);
        if (companyUser is not null)
        {
            if (!_passwordHasherService.VerifyPassword(request.CurrentPassword, companyUser.PasswordHash))
                return ServiceResult.BadRequest("Mevcut şifreniz hatalı.");

            companyUser.PasswordHash = _passwordHasherService.HashPassword(request.NewPassword);
            companyUser.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            return ServiceResult.Success("Şifreniz başarıyla güncellendi.");
        }

        // 3. Kurye kontrolü
        var courier = await _courierRepository.GetByIdAsync(userId);
        if (courier is not null)
        {
            if (!string.IsNullOrEmpty(courier.PasswordHash) &&
                !_passwordHasherService.VerifyPassword(request.CurrentPassword, courier.PasswordHash))
                return ServiceResult.BadRequest("Mevcut şifreniz hatalı.");

            courier.PasswordHash = _passwordHasherService.HashPassword(request.NewPassword);
            courier.UpdatedAt = DateTime.UtcNow;
            _courierRepository.Update(courier);
            await _courierRepository.SaveChangesAsync();
            return ServiceResult.Success("Şifreniz başarıyla güncellendi.");
        }

        // 4. İşletme kontrolü
        var merchant = await _merchantRepository.GetByIdAsync(userId);
        if (merchant is not null)
        {
            if (!_passwordHasherService.VerifyPassword(request.CurrentPassword, merchant.PasswordHash))
                return ServiceResult.BadRequest("Mevcut şifreniz hatalı.");

            merchant.PasswordHash = _passwordHasherService.HashPassword(request.NewPassword);
            merchant.UpdatedAt = DateTime.UtcNow;
            _merchantRepository.Update(merchant);
            await _merchantRepository.SaveChangesAsync();
            return ServiceResult.Success("Şifreniz başarıyla güncellendi.");
        }

        return ServiceResult.NotFound("Kullanıcı hesabı bulunamadı.");
    }
}
