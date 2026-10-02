namespace KuryeSistemi.Application.Interfaces;

/// <summary>
/// Şifre hashleme ve doğrulama işlemleri için soyut servis sözleşmesi.
/// DIP (Dependency Inversion Principle) gereği Application katmanında yer alır.
/// </summary>
public interface IPasswordHasherService
{
    /// <summary>
    /// Verilen düz metin şifreyi güvenli bir şekilde hash'ler.
    /// </summary>
    /// <param name="password">Düz metin şifre.</param>
    /// <returns>Tuzlanmış ve hash'lenmiş şifre dizisi.</returns>
    string HashPassword(string password);

    /// <summary>
    /// Düz metin şifrenin saklanan hash (veya eski geçiş dönemi metni) ile uyuşup uyuşmadığını doğrular.
    /// </summary>
    /// <param name="password">Kullanıcının girdiği düz metin şifre.</param>
    /// <param name="passwordHash">Veritabanında kayıtlı hash.</param>
    /// <returns>Doğrulama başarılı ise true.</returns>
    bool VerifyPassword(string password, string passwordHash);
}
