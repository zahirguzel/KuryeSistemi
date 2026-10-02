using System.Text.Json.Serialization;
using Hangfire;
using KuryeSistemi.API.Extensions;
using KuryeSistemi.API.Filters;
using KuryeSistemi.API.Hubs;
using KuryeSistemi.API.Middlewares;
using KuryeSistemi.Application;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// --- 1. Serilog Yapılandırması ---
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

try
{
    Log.Information("--> [APPLICATION STARTING] KuryeSistemi API başlatılıyor...");

    // --- Üretim güvenlik ön kontrolleri ---
    if (!builder.Environment.IsDevelopment())
    {
        var dbConn = builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty;
        if (string.IsNullOrWhiteSpace(dbConn) ||
            dbConn.Contains("YOUR_DB_PASSWORD", StringComparison.OrdinalIgnoreCase) ||
            dbConn.Contains("Password123", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "GÜVENLİK: Üretimde varsayılan/şablon veritabanı şifresi kullanılamaz. " +
                "Ortam değişkeni tanımlayın: ConnectionStrings__DefaultConnection");
        }

        if (builder.Configuration["AllowedHosts"] is null or "*")
        {
            Log.Warning("--> [GÜVENLİK] AllowedHosts '*' olarak ayarlı. Üretimde alan adlarınızla sınırlayın (ortam değişkeni: AllowedHosts=api.alanadiniz.com).");
        }
    }

    // --- 2. Modüler Servis Kayıtları ---
    // Veritabanı (PostgreSQL, Redis, Hangfire)
    builder.Services.AddDatabase(builder.Configuration);

    // Repositories
    builder.Services.AddRepositories();

    // Business & External Services (Auth, Order, Courier, Merchant, SMS, Email, Push)
    builder.Services.AddApplicationServices(builder.Environment, builder.Configuration);

    // MediatR + FluentValidation
    KuryeSistemi.Application.ApplicationServiceRegistration.AddApplicationServices(builder.Services);

    // Controllers
    builder.Services.AddControllers()
        .AddJsonOptions(opts =>
        {
            opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
            opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });

    // JWT Kimlik Doğrulama & Yetkilendirme
    builder.Services.AddJwtAuthentication(builder.Configuration, builder.Environment);

    // Swagger UI + JWT Desteği
    builder.Services.AddSwaggerWithJwt();

    // CORS Politikası (SignalR & Mobile)
    builder.Services.AddCorsPolicy(builder.Configuration, builder.Environment);

    // SignalR
    builder.Services.AddSignalR()
        .AddJsonProtocol(opts =>
        {
            opts.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            opts.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });

    // Rate Limiting (IP bazlı kaba kuvvet saldırılarına karşı koruma)
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.AddPolicy("login-policy", httpContext =>
        {
            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: ip,
                factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
        });
    });

    // -------------------------------------------------------
    var app = builder.Build();
    // -------------------------------------------------------

    // --- 3. Middleware Pipeline ---
    app.UseSerilogRequestLogging();
    app.UseMiddleware<GlobalExceptionMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseCors(CorsExtensions.PolicyName);
    app.UseRateLimiter();

    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHub<LocationHub>("/hubs/location");

    // Hangfire Dashboard (Güvenlik filtresi ile korunuyor)
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = new[] { new HangfireAuthorizationFilter() }
    });

    // Her 1 dakikada bir sinyali kesilen/uzun süre hareketsiz kalan kuryeleri otomatik çevrimdışı yap
    RecurringJob.AddOrUpdate<KuryeSistemi.Application.Jobs.CourierPresenceJob>(
        "courier-presence-check",
        job => job.ExecuteAsync(),
        "*/1 * * * *");

    // Her 1 dakikada bir, akıllı GPS modunda kurye bulunamamış bekleyen siparişleri yeniden dene
    RecurringJob.AddOrUpdate<KuryeSistemi.Application.Jobs.SmartAutoRetryJob>(
        "smart-auto-retry",
        job => job.ExecuteAsync(),
        "*/1 * * * *");

    // Uygulama açılışında dünden veya geçmiş oturumdan kalan hareketsiz kuryeleri temizle
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<KuryeSistemi.Application.Interfaces.IApplicationDbContext>();
        var staleThreshold = DateTime.UtcNow.AddHours(-12);
        var staleCouriers = await db.Couriers
            .Where(c => c.IsOnline && (c.LastLocationUpdate == null ? c.UpdatedAt < staleThreshold : c.LastLocationUpdate < staleThreshold))
            .ToListAsync();

        if (staleCouriers.Count > 0)
        {
            foreach (var c in staleCouriers)
            {
                c.IsOnline = false;
                c.IsAvailable = false;
                c.UpdatedAt = DateTime.UtcNow;
                c.UpdatedBy = "system:startup_cleanup";
            }
            await db.SaveChangesAsync();
            Log.Information("--> [STARTUP] Dünden/geçmişten kalan {Count} adet hareketsiz kurye otomatik çevrimdışı yapıldı.", staleCouriers.Count);
        }
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "--> [STARTUP] Kurye durum temizleme sırasında hata oluştu.");
    }

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "--> [APPLICATION CRASH] Uygulama başlatılırken kritik hata oluştu!");
    throw;
}
finally
{
    Log.Information("--> [APPLICATION STOPPING] KuryeSistemi API kapatılıyor...");
    Log.CloseAndFlush();
}
