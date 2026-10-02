using KuryeSistemi.Domain.Common;

namespace KuryeSistemi.Domain.Entities;

/// <summary>
/// İşletme ile kurye arasındaki gün sonu nakit kasa mahsuplaşma (Settlement / Reconciliation) kaydı.
/// Kuryenin güncel bakiyesi sıfırlandığında finansal güvenilirlik ve denetim (audit log) için oluşturulur.
/// </summary>
public sealed class CashSettlement : BaseEntity
{
    /// <summary>Mahsuplaşmayı yapan işletmenin Id'si (Tenant Discriminator).</summary>
    public Guid MerchantId { get; set; }

    /// <summary>Kasa hesabı kapatılan kuryenin Id'si.</summary>
    public Guid CourierId { get; set; }

    /// <summary>
    /// Mahsuplaşılan / sıfırlanan net bakiye tutarı (TL).
    /// Negatifse kurye işletmeye nakit teslim etmiştir; pozitifse işletme kuryeye hakediş ödemiştir.
    /// </summary>
    public decimal SettledAmount { get; set; }

    /// <summary>Bu mahsuplaşma döneminde kuryenin müşterilerden topladığı toplam nakit tutar (TL).</summary>
    public decimal CashCollectedTotal { get; set; }

    /// <summary>Bu dönemde kuryenin hak ettiği toplam teslimat kazancı (TL).</summary>
    public decimal CourierEarningsTotal { get; set; }

    /// <summary>Kuryenin bu mahsuplaşma döneminde başarıyla teslim ettiği toplam paket sayısı.</summary>
    public int DeliveredPackageCount { get; set; }

    /// <summary>Mahsuplaşmanın gerçekleştiği tarih ve saat (UTC).</summary>
    public DateTime SettledAt { get; set; } = DateTime.UtcNow;

    /// <summary>Mahsuplaşma ile ilgili ek açıklama veya işletme notu.</summary>
    public string? Notes { get; set; }

    // -------------------------------------------------------------------------
    // Navigation Properties
    // -------------------------------------------------------------------------

    /// <summary>Mahsuplaşmanın ait olduğu işletme.</summary>
    public Merchant Merchant { get; set; } = null!;

    /// <summary>Mahsuplaşmanın ait olduğu kurye.</summary>
    public Courier Courier { get; set; } = null!;
}
