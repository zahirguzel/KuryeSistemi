using KuryeSistemi.Domain.Common;

namespace KuryeSistemi.Domain.Entities;

/// <summary>
/// Ürün entity'si. İşletmenin menü ürünlerini temsil eder.
/// Hızlı Sipariş (POS) ekranında kategori bazlı listelenir.
/// </summary>
public sealed class Product : BaseEntity
{
    // -------------------------------------------------------------------------
    // Multi-Tenant: Hangi işletmeye ait olduğu
    // -------------------------------------------------------------------------

    /// <summary>Ürünün ait olduğu işletmenin Id'si.</summary>
    public Guid MerchantId { get; set; }

    // -------------------------------------------------------------------------
    // Ürün Bilgileri
    // -------------------------------------------------------------------------

    /// <summary>Ürün adı (örn: "Adana Kebap", "Çay").</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Ürün kategorisi (örn: "Ana Yemekler", "İçecekler", "Tatlılar").</summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>Satış fiyatı (TL).</summary>
    public decimal Price { get; set; } = 0.00m;

    /// <summary>Ürün açıklaması (opsiyonel).</summary>
    public string? Description { get; set; }

    /// <summary>
    /// Ürünün aktif/pasif durumu.
    /// Pasif ürünler POS ekranında görünmez.
    /// </summary>
    public bool IsAvailable { get; set; } = true;

    /// <summary>POS ekranında gösterim sırası (küçük → üstte).</summary>
    public int DisplayOrder { get; set; } = 0;

    // -------------------------------------------------------------------------
    // Navigation Properties
    // -------------------------------------------------------------------------

    /// <summary>Ürünün ait olduğu işletme.</summary>
    public Merchant Merchant { get; set; } = null!;
}
