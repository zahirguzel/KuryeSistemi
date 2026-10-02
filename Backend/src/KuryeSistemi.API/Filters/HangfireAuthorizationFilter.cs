using System.Security.Cryptography;
using System.Text;
using Hangfire.Dashboard;

namespace KuryeSistemi.API.Filters;

/// <summary>
/// Hangfire Dashboard erişim kontrolü.
///  - Geliştirme ortamı: açık.
///  - Üretim: tarayıcı Authorization: Bearer başlığı gönderemediği için HTTP Basic kimlik doğrulaması kullanılır.
///    Kullanıcı adı / şifre yapılandırmadan okunur (Hangfire:DashboardUser, Hangfire:DashboardPassword;
///    ortam değişkeni: Hangfire__DashboardUser / Hangfire__DashboardPassword). Tanımlı değilse erişim KAPALIDIR.
///  - SuperAdmin / Admin rolüyle gelen (ör. Bearer taşıyan) istekler de kabul edilir.
/// </summary>
public sealed class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        var env = httpContext.RequestServices.GetService<IWebHostEnvironment>();
        if (env != null && env.IsDevelopment())
        {
            return true;
        }

        var user = httpContext.User;
        if (user.Identity?.IsAuthenticated == true && (user.IsInRole("SuperAdmin") || user.IsInRole("Admin")))
        {
            return true;
        }

        var config = httpContext.RequestServices.GetService<IConfiguration>();
        var expectedUser = config?["Hangfire:DashboardUser"];
        var expectedPass = config?["Hangfire:DashboardPassword"];

        if (!string.IsNullOrEmpty(expectedUser) && !string.IsNullOrEmpty(expectedPass) &&
            TryReadBasicCredentials(httpContext.Request.Headers.Authorization.ToString(), out var u, out var p) &&
            FixedTimeEquals(u, expectedUser) && FixedTimeEquals(p, expectedPass))
        {
            return true;
        }

        // Tarayıcıya kimlik doğrulama penceresi göster
        httpContext.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Hangfire\"";
        return false;
    }

    private static bool TryReadBasicCredentials(string header, out string username, out string password)
    {
        username = password = string.Empty;
        if (string.IsNullOrWhiteSpace(header) || !header.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            return false;

        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(header["Basic ".Length..].Trim()));
            var idx = decoded.IndexOf(':');
            if (idx < 0) return false;
            username = decoded[..idx];
            password = decoded[(idx + 1)..];
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool FixedTimeEquals(string a, string b)
        => CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
}
