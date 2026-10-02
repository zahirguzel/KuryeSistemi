namespace KuryeSistemi.Domain.Common;

/// <summary>
/// Sistemdeki tüm entity'lerin türeyeceği temel sınıf.
/// Audit alanları (CreatedAt, UpdatedAt) ve soft-delete desteği içerir.
/// </summary>
public abstract class BaseEntity
{
    /// <summary>Birincil anahtar - veritabanı tarafından üretilmez, uygulama katmanında oluşturulur.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Kaydın oluşturulma zamanı (UTC). SaveChanges override'ında otomatik doldurulur.</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>Kaydı oluşturan kullanıcının kimliği (UserId veya sistem adı).</summary>
    public string CreatedBy { get; set; } = string.Empty;

    /// <summary>Son güncelleme zamanı (UTC). İlk kayıtta null olabilir.</summary>
    public DateTime? UpdatedAt { get; set; }

    /// <summary>Son güncellemeyi yapan kullanıcının kimliği.</summary>
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// Soft-delete bayrağı. Global Query Filter aracılığıyla
    /// IsDeleted = true olan kayıtlar sorgulardan otomatik elenir.
    /// </summary>
    public bool IsDeleted { get; set; } = false;
}
