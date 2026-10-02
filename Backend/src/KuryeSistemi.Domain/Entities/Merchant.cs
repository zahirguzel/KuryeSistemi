using KuryeSistemi.Domain.Common;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Domain.Entities;

/// <summary>
/// İşletme (Tenant) entity'si. Multi-tenant mimaride her işletme bu tablodan yönetilir.
/// Merchant, diğer entity'lerin Tenant kaynağı olduğundan kendisi MerchantId taşımaz.
/// </summary>
public sealed class Merchant : BaseEntity
{
    // -------------------------------------------------------------------------
    // Multi-Tenant: Hangi kurye firmasına bağlı? (SaaS Tenant Hierarchy)
    // -------------------------------------------------------------------------

    /// <summary>
    /// Bu işletmenin bağlı olduğu kurye firması ID'si.
    /// Null = bağımsız (eski kayıt veya direkt platform müşterisi).
    /// </summary>
    public Guid? CourierCompanyId { get; set; }

    /// <summary>Bağlı olduğu kurye firması (navigation).</summary>
    public CourierCompany? CourierCompany { get; set; }

    /// <summary>İşletmenin ticari unvanı.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>İşletme iletişim e-postası (unique).</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Giriş için şifre hash'i (BCrypt). Düz metin asla saklanmaz.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// Kullanıcı rolü: "Merchant" (Restoran İşletmecisi) veya "CourierFirm" (Kurye Firması Yöneticisi).
    /// Bu alan JWT token'a claim olarak eklenir ve frontend rol bazlı yönlendirme yapar.
    /// </summary>
    public string Role { get; set; } = "Merchant";

    /// <summary>İşletme telefon numarası.</summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>İşletmenin kayıtlı adresi.</summary>
    public string Address { get; set; } = string.Empty;

    /// <summary>İşletme aktif/pasif durumu (abonelik yönetimi için).</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Bu işletmenin paket başı kurye teslimat hakediş ücreti (TL).
    /// Sipariş teslim edildiğinde bu değer baz alınarak hakediş mühürlenir.
    /// </summary>
    public decimal DefaultPackageFee { get; set; } = 75.00m;

    /// <summary>
    /// Kuryenin paket başı alacağı net hak ediş payı (TL).
    /// Örn: Restorandan 100 TL paket ücreti alınırken kuryeye 40 TL ödenir.
    /// </summary>
    public decimal CourierCutFee { get; set; } = 40.00m;

    /// <summary>
    /// Siparişlerin kuryelere dağıtım stratejisi (Havuz, Manuel Atama veya Akıllı GPS).
    /// </summary>
    public DispatchMode DispatchMode { get; set; } = DispatchMode.Pool;

    /// <summary>H3 Altıgen (Hexagon) hücre arama çapı (metre cinsinden, varsayılan: 1120m).</summary>
    public int HexagonSizeMeters { get; set; } = 1120;

    /// <summary>Kurye otomatik atama alanı sınır yarıçapı (km cinsinden, varsayılan: 6 km).</summary>
    public int MaxCourierDistanceKm { get; set; } = 6;

    /// <summary>Kuryenin tek bir turda eşzamanlı taşıyabileceği maksimum paket sayısı (batching, varsayılan: 2).</summary>
    public int MaxOrdersPerTour { get; set; } = 2;

    /// <summary>Aynı güzergahtaki siparişleri birleştirmek için bekleme/toplama süresi (dakika, varsayılan: 15 dk).</summary>
    public int OrderBatchingTimeMinutes { get; set; } = 15;

    /// <summary>Yakındaki başka bir restorandan paket birleştirme (multi-merchant bundling) mesafesi (metre, varsayılan: 200m).</summary>
    public int CrossRestaurantDistanceMeters { get; set; } = 200;

    /// <summary>
    /// Kurye lojistik firması ile işletme arasındaki kasa mahsuplaşma sıklığı (Günlük, Haftalık, Aylık).
    /// </summary>
    public ReconciliationPeriod ReconciliationPeriod { get; set; } = ReconciliationPeriod.Daily;

    /// <summary>İşletmenin anlık açık/kapalı durumu (müşteri ve kurye tarafına yansır).</summary>
    public bool IsOpen { get; set; } = true;

    /// <summary>
    /// Restoran GPS enlem değeri. Canlı Saha Radarı harita merkezi olarak kullanılır.
    /// Null ise frontend varsayılan konumu (İskenderun merkezi) kullanır.
    /// </summary>
    public double? Latitude { get; set; }

    /// <summary>
    /// Restoran GPS boylam değeri. Canlı Saha Radarı harita merkezi olarak kullanılır.
    /// Null ise frontend varsayılan konumu (İskenderun merkezi) kullanır.
    /// </summary>
    public double? Longitude { get; set; }

    // -------------------------------------------------------------------------
    // Navigation Properties
    // -------------------------------------------------------------------------

    /// <summary>Bu işletmeye ait siparişler.</summary>
    public ICollection<Order> Orders { get; set; } = new List<Order>();

    /// <summary>Bu işletmeye kayıtlı kuryeler.</summary>
    public ICollection<Courier> Couriers { get; set; } = new List<Courier>();

    /// <summary>Bu işletmeye ait kasa mahsuplaşma geçmiş kayıtları.</summary>
    public ICollection<CashSettlement> CashSettlements { get; set; } = new List<CashSettlement>();

    /// <summary>Bu işletmenin menü ürünleri (POS/Hızlı Sipariş ekranı için).</summary>
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
