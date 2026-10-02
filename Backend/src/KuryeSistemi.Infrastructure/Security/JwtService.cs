using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using KuryeSistemi.Application.Common.Settings;
using KuryeSistemi.Application.Interfaces;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace KuryeSistemi.Infrastructure.Security;

/// <summary>
/// IJwtService implementasyonu.
/// HS256 algoritmasıyla imzalı JWT token üretir.
/// Claim'ler: sub (MerchantId), email, jti (benzersiz token ID), iat, exp, role.
/// </summary>
public sealed class JwtService : IJwtService
{
    private readonly JwtSettings _settings;

    public JwtService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    public string GenerateToken(Guid merchantId, string email, Guid? courierId = null, string role = "Merchant", Guid? courierCompanyId = null)
    {
        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   courierId.HasValue ? courierId.Value.ToString() : merchantId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
            new("merchantId", merchantId.ToString()),
            new(ClaimTypes.Role, role)
        };

        if (courierId.HasValue)
        {
            claims.Add(new Claim("courierId", courierId.Value.ToString()));
            claims.Add(new Claim("CourierId", courierId.Value.ToString()));
        }

        if (courierCompanyId.HasValue)
        {
            claims.Add(new Claim("courierCompanyId", courierCompanyId.Value.ToString()));
            claims.Add(new Claim("CourierCompanyId", courierCompanyId.Value.ToString()));
            claims.Add(new Claim("companyId", courierCompanyId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer:             _settings.Issuer,
            audience:           _settings.Audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddMinutes(_settings.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateCompanyUserToken(Guid companyUserId, Guid courierCompanyId, string email, string role)
    {
        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   companyUserId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
            new("companyUserId",    companyUserId.ToString()),
            new("courierCompanyId", courierCompanyId.ToString()),
            new(ClaimTypes.Role,    role),
            new(ClaimTypes.Role,    "CompanyUser")
        };

        var token = new JwtSecurityToken(
            issuer:             _settings.Issuer,
            audience:           _settings.Audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddMinutes(_settings.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateAdminToken(Guid adminUserId, string email)
    {
        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   adminUserId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
            new("adminUserId", adminUserId.ToString()),
            new(ClaimTypes.Role, "SuperAdmin")
        };

        var token = new JwtSecurityToken(
            issuer:             _settings.Issuer,
            audience:           _settings.Audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddMinutes(_settings.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

