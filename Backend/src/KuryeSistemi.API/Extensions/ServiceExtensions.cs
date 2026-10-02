// Extensions/ServiceExtensions.cs

using KuryeSistemi.API.Services;
using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Jobs;
using KuryeSistemi.Application.Services.Concrete;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Infrastructure.Security;
using KuryeSistemi.Infrastructure.Services;
using KuryeSistemi.Infrastructure.Services.External.Mock;
using KuryeSistemi.Infrastructure.Services.External.Real;

namespace KuryeSistemi.API.Extensions;

public static class ServiceExtensions
{
    /// <summary>
    /// Uygulama iş servislerini ve ortam (Development / Production) bağımlı dış servisleri kaydeder.
    /// </summary>
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IHostEnvironment environment,
        IConfiguration? configuration = null)
    {
        // ── Business Services ────────────────────────────────────────────────
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<ICourierService, CourierService>();
        services.AddScoped<IMerchantService, MerchantService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<ICreditService, CreditService>();
        services.AddScoped<ICompanyService, CompanyService>();
        services.AddScoped<ICompanyAdminService, CompanyAdminService>();
        services.AddSingleton<ILoginAttemptTracker, DistributedLoginAttemptTracker>();

        // ── Infrastructure Services ──────────────────────────────────────────
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IPasswordHasherService, PasswordHasherService>();
        services.AddScoped<IHubNotificationService, SignalRHubNotificationService>();
        services.AddScoped<IBackgroundJobService, HangfireBackgroundJobService>();
        services.AddScoped<OrderTimeoutJob>();
        services.AddScoped<CreditDeductionJob>();
        services.AddScoped<KuryeSistemi.Application.Jobs.SmartAutoRetryJob>();

        // ── Dış Servisler (SMS, E-Posta, Push Bildirim) ─────────────────────
        // Geliştirici (Development) ortamında konsola log basan Mock servisler,
        // Canlı (Production) ortamında ise gerçek sağlayıcı servisleri bağlanır.
        if (environment.IsDevelopment())
        {
            services.AddScoped<ISmsService, MockSmsService>();
            services.AddScoped<IEmailService, MockEmailService>();
            services.AddScoped<IPushNotificationService, MockPushNotificationService>();
        }
        else
        {
            services.AddScoped<ISmsService, RealSmsService>();
            services.AddScoped<IEmailService, RealEmailService>();
            services.AddScoped<IPushNotificationService, RealPushNotificationService>();
        }

        // ── Harita Sağlayıcı Yapılandırması (Options Pattern) ────────────────
        if (configuration != null)
        {
            services.Configure<MapSettings>(configuration.GetSection(MapSettings.SectionName));
        }

        return services;
    }
}
