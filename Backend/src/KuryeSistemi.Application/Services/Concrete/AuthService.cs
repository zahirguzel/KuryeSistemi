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
    private readonly ILoginAttemptTracker _loginAttempts;

    private const string InvalidCredentialsMessage = "E-posta veya şifre hatalı.";

    public AuthService(
        IMerchantRepository merchantRepository,
        ICourierRepository courierRepository,
        IApplicationDbContext db,
        IJwtService jwtService,
        IPasswordHasherService passwordHasherService,
        IOptions<JwtSettings> jwtSettings,
        ILoginAttemptTracker loginAttempts)
    {
        _merchantRepository = merchantRepository;
        _courierRepository = courierRepository;
        _db = db;
        _jwtService = jwtService;
        _passwordHasherService = passwordHasherService;
        _jwtSettings = jwtSettings.Value;
        _loginAttempts = loginAttempts;
    }

    /// <summary>
    /// Giriş. Hesap bazlı kilit (5 hatalı denemede 15 dk) IP rate limit'ini tamamlar: dağıtık bir saldırı
    /// tek bir hesabı deneyemez. Yalnızca "e-posta/şifre hatalı" sonucu sayaca işlenir.
    /// </summary>
    public async Task<ServiceResult<AuthTokenDto>> LoginAsync(
        LoginRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return ServiceResult<AuthTokenDto>.BadRequest("E-posta ve şifre zorunludur.");

        var accountKey = request.Email.Trim().ToLowerInvariant();

        var lockout = await _loginAttempts.GetLockoutRemainingAsync(accountKey, cancellationToken);
        if (lockout.HasValue)
        {
            var minutes = Math.Max(1, (int)Math.Ceiling(lockout.Value.TotalMinutes));
            return ServiceResult<AuthTokenDto>.Fail(
                $"Çok fazla hatalı giriş denemesi. Lütfen {minutes} dakika sonra tekrar deneyin.", 429);
        }

        var result = await AuthenticateAsync(request, cancellationToken);

        if (result.IsSuccess)
            await _loginAttempts.ResetAsync(accountKey, cancellationToken);
        else if (result.StatusCode == 401 && result.Message == InvalidCredentialsMessage)
            await _loginAttempts.RegisterFailureAsync(accountKey, cancellationToken);

        return result;
    }

    private async Task<ServiceResult<AuthTokenDto>> AuthenticateAsync(
        LoginRequestDto request,
        CancellationToken cancellationToken)
    {
        const string invalidMessage = InvalidCredentialsMessage;

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
            if (courier.IsDeleted)
                return ServiceResult<AuthTokenDto>.Unauthorized("Kurye hesabı silinmiş veya bulunamadı.");

            if (string.IsNullOrEmpty(courier.PasswordHash))
                return ServiceResult<AuthTokenDto>.Unauthorized("Kurye hesabı şifresi henüz tanımlanmamış.");

            if (!_passwordHasherService.VerifyPassword(request.Password, courier.PasswordHash))
                return ServiceResult<AuthTokenDto>.Unauthorized(invalidMessage);

            // Kurye firmasının aktiflik kontrolü (Firma pasifse kurye giremez)
            var courierCompany = await _db.CourierCompanies.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courier.CourierCompanyId && !c.IsDeleted, cancellationToken);

            if (courierCompany is null || !courierCompany.IsActive)
            {
                return ServiceResult<AuthTokenDto>.Unauthorized("Bağlı olduğunuz kurye lojistik firmasının aboneliği aktif değil.");
            }

            // Eğer kurye belirli bir restorana özel tahsis edilmişse ve restoran pasifse, genel havuz kuryesine devret
            var effectiveMerchantId = courier.MerchantId ?? Guid.Empty;
            if (courier.MerchantId.HasValue && courier.MerchantId.Value != Guid.Empty)
            {
                var assignedMerchant = await _merchantRepository.GetByIdAsync(courier.MerchantId.Value);
                if (assignedMerchant is null || !assignedMerchant.IsActive)
                {
                    effectiveMerchantId = Guid.Empty; // Havuz kuryesi olarak çalışmaya devam etsin
                }
            }

            var token = _jwtService.GenerateToken(
                effectiveMerchantId,
                courier.Email,
                courier.Id,
                role: "Courier",
                courierCompanyId: courier.CourierCompanyId);

            var dto = new AuthTokenDto(
                token,
                MerchantId:       effectiveMerchantId,
                MerchantName:     $"{courier.FirstName} {courier.LastName}",
                Email:            courier.Email,
                ExpiresAt:        DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
                CourierId:        courier.Id,
                Roles:            new[] { "Courier" },
                CourierCompanyId: courier.CourierCompanyId);

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
            admin.PasswordChangedAt = DateTime.UtcNow;
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
            companyUser.PasswordChangedAt = DateTime.UtcNow;
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
            courier.PasswordChangedAt = DateTime.UtcNow;
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
            merchant.PasswordChangedAt = DateTime.UtcNow;
            merchant.UpdatedAt = DateTime.UtcNow;
            _merchantRepository.Update(merchant);
            await _merchantRepository.SaveChangesAsync();
            return ServiceResult.Success("Şifreniz başarıyla güncellendi.");
        }

        return ServiceResult.NotFound("Kullanıcı hesabı bulunamadı.");
    }
}
