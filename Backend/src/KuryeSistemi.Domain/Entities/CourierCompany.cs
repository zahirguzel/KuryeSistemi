using KuryeSistemi.Domain.Common;

namespace KuryeSistemi.Domain.Entities;

/// <summary>
/// Kurye firması (Platform Tenant) entity'si.
/// Platform sahibi (Süper Admin) tarafından oluşturulur.
/// Bir kurye firması altında birden fazla Merchant (restoran) çalışabilir.
/// </summary>
public sealed class CourierCompany : BaseEntity
{
    /// <summary>Firmanın ticari unvanı.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Firma birincil iletişim e-postası (unique).</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Firma telefon numarası.</summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>Firma adresi.</summary>
    public string Address { get; set; } = string.Empty;

    /// <summary>Vergi kimlik numarası (opsiyonel, fatura için).</summary>
    public string? TaxNumber { get; set; }

    /// <summary>
    /// Kontör (kredi) bakiyesi.
    /// Platform sahibi firmaya paket/kontör yükler; her teslimatta bir kontör düşülür.
    /// </summary>
    public int CreditBalance { get; set; } = 0;

    /// <summary>
    /// Kontör uyarı eşiği. Bakiye bu değerin altına düştüğünde platform uyarı gönderir.
    /// </summary>
    public int CreditWarningThreshold { get; set; } = 100;

    /// <summary>Firma aktif mi? False = tüm işletmeler ve kuryeler giriş yapamaz.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Kontör bitmesi durumunda yeni sipariş girişi engellensin mi?</summary>
    public bool BlockOnZeroCredit { get; set; } = true;

    /// <summary>Firma logosu URL'si (opsiyonel).</summary>
    public string? LogoUrl { get; set; }

    // -------------------------------------------------------------------------
    // Navigation Properties
    // -------------------------------------------------------------------------

    /// <summary>Bu firmaya ait restoran/işletmeler (Tenants).</summary>
    public ICollection<Merchant> Merchants { get; set; } = new List<Merchant>();

    /// <summary>Bu firmaya ait alt kullanıcılar (Müdür, Operatör vb.).</summary>
    public ICollection<CompanyUser> Users { get; set; } = new List<CompanyUser>();

    /// <summary>Kontör yükleme/düşme geçmişi.</summary>
    public ICollection<CreditTransaction> CreditTransactions { get; set; } = new List<CreditTransaction>();
}
