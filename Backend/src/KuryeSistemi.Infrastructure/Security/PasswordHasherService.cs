using KuryeSistemi.Application.Interfaces;

namespace KuryeSistemi.Infrastructure.Security;

/// <summary>
/// BCrypt algoritmasını kullanan şifre hashleme ve doğrulama servisi.
/// Eski düz metin şifreler için geçiş dönemi fallback desteği içerir.
/// </summary>
public sealed class PasswordHasherService : IPasswordHasherService
{
    public string HashPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ArgumentException("Şifre boş olamaz.", nameof(password));
        }

        return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(passwordHash))
        {
            return false;
        }

        // Yalnızca geçerli BCrypt hash formatları ($2a$, $2b$, $2y$) doğrulanır.
        if (passwordHash.StartsWith("$2a$") || passwordHash.StartsWith("$2b$") || passwordHash.StartsWith("$2y$"))
        {
            try
            {
                return BCrypt.Net.BCrypt.Verify(password, passwordHash);
            }
            catch
            {
                return false;
            }
        }

        return false;
    }
}
