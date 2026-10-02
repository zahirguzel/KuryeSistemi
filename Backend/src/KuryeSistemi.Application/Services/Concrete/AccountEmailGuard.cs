// Services/Concrete/AccountEmailGuard.cs

using KuryeSistemi.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Services.Concrete;

/// <summary>
/// Giriş e-postası tüm hesap tablolarında (admin, firma kullanıcısı, işletme, kurye) tekil olmalıdır:
/// AuthService e-postayı bu sırayla arar, çakışan kayıt erişilemez hale gelir.
/// </summary>
internal static class AccountEmailGuard
{
    public static async Task<bool> IsTakenAsync(IApplicationDbContext db, string normalizedEmail, CancellationToken ct)
    {
        return await db.AdminUsers.AnyAsync(a => a.Email == normalizedEmail, ct)
            || await db.CompanyUsers.AnyAsync(u => u.Email == normalizedEmail, ct)
            || await db.Merchants.AnyAsync(m => m.Email == normalizedEmail, ct)
            || await db.Couriers.AnyAsync(c => c.Email == normalizedEmail, ct);
    }
}
