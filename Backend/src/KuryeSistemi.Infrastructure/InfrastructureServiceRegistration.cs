using KuryeSistemi.Application.Common.Settings;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Infrastructure.Persistence;
using KuryeSistemi.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KuryeSistemi.Infrastructure;

/// <summary>
/// Infrastructure katmanının DI kayıt extension metodu.
/// </summary>
public static class InfrastructureServiceRegistration
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // JwtSettings → IOptions<JwtSettings>
        services.Configure<JwtSettings>(
            configuration.GetSection(JwtSettings.SectionName));

        // PostgreSQL + EF Core
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                    npgsqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(30),
                        errorCodesToAdd: null);
                }));

        // IApplicationDbContext → AppDbContext (Scoped)
        services.AddScoped<IApplicationDbContext>(
            provider => provider.GetRequiredService<AppDbContext>());

        // IJwtService → JwtService (Scoped)
        services.AddScoped<IJwtService, JwtService>();

        // IPasswordHasherService → PasswordHasherService (Scoped)
        services.AddScoped<IPasswordHasherService, PasswordHasherService>();

        // Hangfire Arka Plan Görev Servisi
        services.AddScoped<IBackgroundJobService, Services.HangfireBackgroundJobService>();
        services.AddScoped<Application.Jobs.OrderTimeoutJob>();

        return services;
    }
}
