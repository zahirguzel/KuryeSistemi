// Extensions/CorsExtensions.cs

namespace KuryeSistemi.API.Extensions;

public static class CorsExtensions
{
    public const string PolicyName = "KuryeSistemiCors";

    public static IServiceCollection AddCorsPolicy(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment? environment = null)
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?.Where(o => !string.IsNullOrWhiteSpace(o))
            .ToArray();

        services.AddCors(options =>
        {
            options.AddPolicy(PolicyName, policy =>
            {
                if (environment?.IsDevelopment() == true)
                {
                    // Geliştirmede: listedeki origin'ler + herhangi bir localhost portu
                    // (Flutter web / Vite her çalıştırmada farklı port seçebilir).
                    var listed = allowedOrigins ?? Array.Empty<string>();
                    policy.SetIsOriginAllowed(origin =>
                              listed.Contains(origin, StringComparer.OrdinalIgnoreCase) ||
                              (Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                               (uri.Host == "localhost" || uri.Host == "127.0.0.1")))
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
                }
                else if (allowedOrigins != null && allowedOrigins.Length > 0)
                {
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
                }
                else
                {
                    // Canlı ortamda açıkça belirtilmemişse güvenli varsayılan yerel kökenler
                    policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
                }
            });
        });

        return services;
    }
}
