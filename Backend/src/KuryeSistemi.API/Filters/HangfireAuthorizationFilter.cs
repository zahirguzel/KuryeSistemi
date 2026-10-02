using Hangfire.Dashboard;

namespace KuryeSistemi.API.Filters;

/// <summary>
/// Hangfire Dashboard erişim kontrol filtresi.
/// Geliştirme ortamında veya Admin / CourierFirm rolüne sahip yetkili kullanıcılara izin verir.
/// </summary>
public sealed class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // Geliştirme ortamında dashboard'a erişime izin ver
        var env = httpContext.RequestServices.GetService<IWebHostEnvironment>();
        if (env != null && env.IsDevelopment())
        {
            return true;
        }

        // Prodüksiyon ortamında kimlik doğrulaması ve rol kontrolü
        var user = httpContext.User;
        if (user.Identity == null || !user.Identity.IsAuthenticated)
        {
            return false;
        }

        return user.IsInRole("Admin") || user.IsInRole("CourierFirm");
    }
}
