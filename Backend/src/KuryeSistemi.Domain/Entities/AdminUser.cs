using KuryeSistemi.Domain.Common;

namespace KuryeSistemi.Domain.Entities;

/// <summary>
/// Süper Admin entity'si.
/// Platform sahibinin yönetim hesabı. Veritabanında ayrı tutulur;
/// Merchant tablosuyla karışmaz. Kurye firmaları açar, kontör yükler,
/// raporları izler.
/// </summary>
public sealed class AdminUser : BaseEntity
{
    /// <summary>Admin adı soyadı.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>Admin giriş e-postası (platform genelinde unique).</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Şifre hash'i (BCrypt).</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Hesap aktif mi?</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Son giriş zamanı (UTC).</summary>
    public DateTime? LastLoginAt { get; set; }
}
