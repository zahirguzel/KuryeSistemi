using KuryeSistemi.Domain.Common;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Domain.Entities;

/// <summary>
/// Kurye entity'si. Araç bilgileri ve işletme bağlantısı içerir.
/// NOT: Anlık GPS konumu bu tabloda tutulmaz. Canlı konum takibi
///      Redis üzerinden ayrı bir servis ile yönetilecektir.
/// </summary>
public sealed class Courier : BaseEntity
{
    // -------------------------------------------------------------------------
    // Multi-Tenant: Kuryenin hangi işletmeye ait olduğu
    // -------------------------------------------------------------------------

    /// <summary>Kuryenin bağlı olduğu işletmenin Id'si (Tenant Discriminator).</summary>
    public Guid MerchantId { get; set; }

    // -------------------------------------------------------------------------
    // Kişisel Bilgiler
    // -------------------------------------------------------------------------

    /// <summary>Kuryenin adı.</summary>
    public string FirstName { get; set; } = string.Empty;

    /// <summary>Kuryenin soyadı.</summary>
    public string LastName { get; set; } = string.Empty;

    /// <summary>Kurye iletişim telefonu (unique olması beklenir).</summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>Kurye e-posta adresi.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Kurye giriş şifresinin hash'i.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    // -------------------------------------------------------------------------
    // Araç Bilgileri
    // -------------------------------------------------------------------------

    /// <summary>Araç tipi (Motosiklet, Otomobil, Van vb.).</summary>
    public VehicleType VehicleType { get; set; }

    /// <summary>Araç plakası (örn: 34 ABC 123).</summary>
    public string LicensePlate { get; set; } = string.Empty;

    /// <summary>Araç markası (örn: Honda, Ford).</summary>
    public string VehicleBrand { get; set; } = string.Empty;

    /// <summary>Araç modeli (örn: CB500, Transit).</summary>
    public string VehicleModel { get; set; } = string.Empty;

    // -------------------------------------------------------------------------
    // Operasyonel Durum
    // -------------------------------------------------------------------------

    /// <summary>
    /// Kurye o anda müsait mi?
    /// False: aktif bir siparişle meşgul ya da çevrimdışı.
    /// </summary>
    public bool IsAvailable { get; set; } = true;

    /// <summary>
    /// Kurye mesaide / çevrimiçi mi?
    /// Mobil uygulamada "Mesaiyi Başlat" kaydırıldığında true, bitirildiğinde false olur.
    /// </summary>
    public bool IsOnline { get; set; } = false;

    /// <summary>
    /// Kuryenin son bilinen anlık enlem (Latitude) GPS koordinatı.
    /// </summary>
    public double? CurrentLatitude { get; set; }

    /// <summary>
    /// Kuryenin son bilinen anlık boylam (Longitude) GPS koordinatı.
    /// </summary>
    public double? CurrentLongitude { get; set; }

    /// <summary>
    /// Son konum bildirim zamanı (UTC).
    /// </summary>
    public DateTime? LastLocationUpdate { get; set; }

    /// <summary>
    /// Kuryenin güncel kasa / mahsuplaşma bakiyesi (TL).
    /// Pozitif (> 0): Kurye işletmeden hak ediş alacaklıdır.
    /// Negatif (< 0): Kurye müşterilerden nakit tahsil ettiği için işletmeye borçludur.
    /// Sıfır (= 0): Hesap tam dengededir.
    /// </summary>
    public decimal CurrentBalance { get; set; } = 0.00m;

    // -------------------------------------------------------------------------
    // Navigation Properties
    // -------------------------------------------------------------------------

    /// <summary>Kuryenin bağlı olduğu işletme.</summary>
    public Merchant Merchant { get; set; } = null!;

    /// <summary>Kuryeye atanmış siparişler.</summary>
    public ICollection<Order> Orders { get; set; } = new List<Order>();

    /// <summary>Kuryenin kasa mahsuplaşma geçmiş kayıtları.</summary>
    public ICollection<CashSettlement> CashSettlements { get; set; } = new List<CashSettlement>();
}
