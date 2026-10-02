using FluentAssertions;
using KuryeSistemi.Infrastructure.Security;
using Xunit;

namespace KuryeSistemi.Tests.Security;

public class PasswordSecurityTests
{
    [Fact]
    public void VerifyPassword_WhenPlainTextMatches_ShouldReturnFalse_BecausePlaintextFallbackIsRemoved()
    {
        // Arrange
        var hasher = new PasswordHasherService();
        var plaintextPassword = "MySecretPassword123";
        // Bir saldırgan veya eski düz metin kaydı DB'de "MySecretPassword123" olarak kayıtlı
        var rawDbHash = "MySecretPassword123";

        // Act
        var isValid = hasher.VerifyPassword(plaintextPassword, rawDbHash);

        // Assert: Artık düz metin eşitlik kabul edilmemeli, yalnızca geçerli BCrypt hash'leri kabul edilmeli
        isValid.Should().BeFalse("Düz metin şifre karşılaştırması güvenlik açığı teşkil ettiğinden kaldırılmıştır.");
    }

    [Fact]
    public void VerifyPassword_WhenProperlyHashedWithBCrypt_ShouldReturnTrue()
    {
        // Arrange
        var hasher = new PasswordHasherService();
        var password = "SecurePassword123!";
        var hash = hasher.HashPassword(password);

        // Act
        var isValid = hasher.VerifyPassword(password, hash);

        // Assert
        isValid.Should().BeTrue();
    }
}
