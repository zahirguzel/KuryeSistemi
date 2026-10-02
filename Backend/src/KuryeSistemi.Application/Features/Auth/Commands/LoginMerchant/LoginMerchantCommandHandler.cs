using KuryeSistemi.Application.Common.Settings;
using KuryeSistemi.Application.Features.Auth.DTOs;
using KuryeSistemi.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KuryeSistemi.Application.Features.Auth.Commands.LoginMerchant;

/// <summary>
/// LoginMerchantCommand'ı işleyen handler.
///
/// İş Akışı:
///   1. Email ile Merchants tablosunda ara.
///   2. Bulunursa ve aktifse şifreyi doğrula → merchant.Role ile JWT üret.
///   3. Merchants tablosunda bulunamazsa Couriers tablosunda ara.
///   4. Hiçbirinde bulunamazsa 401 fırlat.
/// </summary>
public sealed class LoginMerchantCommandHandler
    : IRequestHandler<LoginMerchantCommand, AuthTokenDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IJwtService           _jwtService;
    private readonly IPasswordHasherService _passwordHasherService;
    private readonly JwtSettings           _jwtSettings;

    public LoginMerchantCommandHandler(
        IApplicationDbContext    db,
        IJwtService              jwtService,
        IPasswordHasherService   passwordHasherService,
        IOptions<JwtSettings>    jwtSettings)
    {
        _db                    = db;
        _jwtService            = jwtService;
        _passwordHasherService = passwordHasherService;
        _jwtSettings           = jwtSettings.Value;
    }

    public async Task<AuthTokenDto> Handle(
        LoginMerchantCommand command,
        CancellationToken cancellationToken)
    {
        const string invalidMessage = "E-posta veya şifre hatalı.";

        // --- 1. Merchants tablosunda ara ---
        var merchant = await _db.Merchants
            .FirstOrDefaultAsync(
                m => m.Email == command.Email.ToLowerInvariant(),
                cancellationToken);

        if (merchant is not null && merchant.IsActive)
        {
            if (!_passwordHasherService.VerifyPassword(command.Password, merchant.PasswordHash))
                throw new UnauthorizedAccessException(invalidMessage);

            // Düz metin şifreyi BCrypt'e yükselt
            if (!merchant.PasswordHash.StartsWith("$2a$") && 
                !merchant.PasswordHash.StartsWith("$2b$") && 
                !merchant.PasswordHash.StartsWith("$2y$"))
            {
                merchant.PasswordHash = _passwordHasherService.HashPassword(command.Password);
                merchant.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(cancellationToken);
            }

            // merchant.Role: "Merchant" veya "CourierFirm"
            var role      = string.IsNullOrWhiteSpace(merchant.Role) ? "Merchant" : merchant.Role;
            var token     = _jwtService.GenerateToken(merchant.Id, merchant.Email, role: role);
            var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes);

            return new AuthTokenDto(
                token,
                merchant.Id,
                merchant.Name,
                merchant.Email,
                expiresAt,
                CourierId: null,
                Roles: new[] { role });
        }

        // --- 2. Couriers tablosunda ara ---
        var courier = await _db.Couriers
            .FirstOrDefaultAsync(
                c => c.Email == command.Email.ToLowerInvariant(),
                cancellationToken);

        if (courier is not null)
        {
            bool isPasswordValid;

            if (string.IsNullOrEmpty(courier.PasswordHash))
            {
                courier.PasswordHash = _passwordHasherService.HashPassword(command.Password);
                courier.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(cancellationToken);
                isPasswordValid = true;
            }
            else
            {
                isPasswordValid = _passwordHasherService.VerifyPassword(command.Password, courier.PasswordHash);

                if (isPasswordValid &&
                    !courier.PasswordHash.StartsWith("$2a$") && 
                    !courier.PasswordHash.StartsWith("$2b$") && 
                    !courier.PasswordHash.StartsWith("$2y$"))
                {
                    courier.PasswordHash = _passwordHasherService.HashPassword(command.Password);
                    courier.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync(cancellationToken);
                }
            }

            if (!isPasswordValid)
                throw new UnauthorizedAccessException(invalidMessage);

            var effectiveMerchantId = courier.MerchantId ?? Guid.Empty;
            var token     = _jwtService.GenerateToken(effectiveMerchantId, courier.Email, courier.Id, role: "Courier", courierCompanyId: courier.CourierCompanyId);
            var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes);

            return new AuthTokenDto(
                token,
                effectiveMerchantId,
                $"{courier.FirstName} {courier.LastName}",
                courier.Email,
                expiresAt,
                CourierId: courier.Id,
                Roles: new[] { "Courier" },
                CourierCompanyId: courier.CourierCompanyId);
        }

        throw new UnauthorizedAccessException(invalidMessage);
    }
}
