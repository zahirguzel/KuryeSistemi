// Extensions/AuthExtensions.cs

using System.Text;
using KuryeSistemi.Application.Common.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace KuryeSistemi.API.Extensions;

public static class AuthExtensions
{
    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        // JwtSettings configuration binding
        var jwtSettingsSection = configuration.GetSection(JwtSettings.SectionName);
        services.Configure<JwtSettings>(jwtSettingsSection);

        var jwtSettings = jwtSettingsSection.Get<JwtSettings>();
        if (jwtSettings == null || string.IsNullOrWhiteSpace(jwtSettings.SecretKey) || jwtSettings.SecretKey.Length < 32)
        {
            throw new InvalidOperationException("KRİTİK HATA: JwtSettings:SecretKey tanımlanmamış veya en az 32 karakter uzunluğunda değil! Uygulama başlatılamaz.");
        }

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = !environment.IsDevelopment();
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,
                RoleClaimType = System.Security.Claims.ClaimTypes.Role,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
                ClockSkew = TimeSpan.Zero
            };

            // SignalR / WebSockets access_token desteği
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;

                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }

                    return Task.CompletedTask;
                },
                OnAuthenticationFailed = context =>
                {
                    var logger = context.HttpContext.RequestServices
                        .GetRequiredService<ILogger<JwtBearerEvents>>();
                    logger.LogDebug("JWT doğrulama başarısız: {Error}", context.Exception.Message);
                    return Task.CompletedTask;
                }
            };
        });

        // ── Rol Politikaları (Policies) ──────────────────────────────────
        services.AddAuthorization(options =>
        {
            var firmAndAdminRoles = new[]
            {
                "CourierFirm", "Admin", "FirmAdmin", "SuperAdmin",
                "CompanyUser", "CompanyUser_Manager", "CompanyUser_Operator",
                "CompanyUser_Accountant", "CompanyUser_Support"
            };

            // Firma yöneticisi veya Sistem Yöneticisi
            options.AddPolicy("FirmOrAdmin", policy =>
                policy.RequireRole(firmAndAdminRoles));

            // İşletme (Restoran/Mağaza) veya Firma/Admin
            options.AddPolicy("MerchantOnly", policy =>
                policy.RequireRole(firmAndAdminRoles.Concat(new[] { "Merchant" }).ToArray()));

            // Yalnızca Kurye
            options.AddPolicy("CourierOnly", policy =>
                policy.RequireRole("Courier"));
        });

        return services;
    }
}
