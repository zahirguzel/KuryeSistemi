// Extensions/DatabaseExtensions.cs

using Hangfire;
using Hangfire.PostgreSql;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.API.Extensions;

public static class DatabaseExtensions
{
    public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();

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

        // IApplicationDbContext → AppDbContext
        services.AddScoped<IApplicationDbContext>(
            provider => provider.GetRequiredService<AppDbContext>());

        // Redis Distributed Cache
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration.GetConnectionString("Redis") ?? "localhost:6379";
            options.InstanceName = "KuryeSistemi:";
        });

        // Hangfire (PostgreSQL Storage)
        services.AddHangfire(config => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(
                c => c.UseNpgsqlConnection(configuration.GetConnectionString("DefaultConnection")),
                new PostgreSqlStorageOptions
                {
                    QueuePollInterval = TimeSpan.FromSeconds(15),
                    InvisibilityTimeout = TimeSpan.FromMinutes(5),
                    SchemaName = "hangfire",
                    PrepareSchemaIfNecessary = true
                }));

        services.AddHangfireServer();

        return services;
    }
}
