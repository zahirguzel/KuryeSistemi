using KuryeSistemi.Domain.Common;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Domain.Entities;

/// <summary>
/// Sipariş entity'si. Alım ve teslim adres bilgilerini,
/// durum makinesini ve tenant izolasyonunu barındırır.
/// </summary>
public sealed class Order : BaseEntity
{
    // -------------------------------------------------------------------------
    // Multi-Tenant: Siparişin hangi işletmeye ait olduğu
    // -------------------------------------------------------------------------

    /// <summary>Siparişi oluşturan işletmenin Id'si (Tenant Discriminator).</summary>
    public Guid MerchantId { get; set; }

    // -------------------------------------------------------------------------
    // Atanan Kurye (Nullable: henüz atanmamış olabilir)
    // -------------------------------------------------------------------------

    /// <summary>Siparişe atanan kuryenin Id'si. Pending durumunda null olabilir.</summary>
    public Guid? CourierId { get; set; }

    // -------------------------------------------------------------------------
    // Alım Adresi (Pickup)
    // -------------------------------------------------------------------------

    /// <summary>Alım adresi - sokak/cadde ve bina bilgisi.</summary>
    public string PickupAddressLine { get; set; } = string.Empty;

    /// <summary>Alım adresi - ilçe.</summary>
    public string PickupDistrict { get; set; } = string.Empty;

    /// <summary>Alım adresi - şehir.</summary>
    public string PickupCity { get; set; } = string.Empty;

    /// <summary>Alım noktasının enlem koordinatı (PostGIS'e migrate edilinceye kadar decimal).</summary>
    public decimal PickupLatitude { get; set; }

    /// <summary>Alım noktasının boylam koordinatı.</summary>
    public decimal PickupLongitude { get; set; }

    // -------------------------------------------------------------------------
    // Teslim Adresi (Delivery)
    // -------------------------------------------------------------------------

    /// <summary>Teslim adresi - sokak/cadde ve bina bilgisi.</summary>
    public string DeliveryAddressLine { get; set; } = string.Empty;

    /// <summary>Teslim adresi - ilçe.</summary>
    public string DeliveryDistrict { get; set; } = string.Empty;

    /// <summary>Teslim adresi - şehir.</summary>
    public string DeliveryCity { get; set; } = string.Empty;

    /// <summary>Teslim noktasının enlem koordinatı.</summary>
    public decimal DeliveryLatitude { get; set; }

    /// <summary>Teslim noktasının boylam koordinatı.</summary>
    public decimal DeliveryLongitude { get; set; }

    // -------------------------------------------------------------------------
    // Sipariş Bilgileri
    // -------------------------------------------------------------------------

    /// <summary>
    /// Siparişin mevcut durumu (State Machine).
    /// Geçerli geçişler: Pending→Assigned→PickedUp→Delivered | Pending/Assigned→Cancelled
    /// </summary>
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    /// <summary>Müşteri adı (siparişi alacak kişi).</summary>
    public string RecipientName { get; set; } = string.Empty;

    /// <summary>Müşteri iletişim telefonu.</summary>
    public string RecipientPhone { get; set; } = string.Empty;

    /// <summary>Sipariş notu / özel talimatlar.</summary>
    public string? Notes { get; set; }

    /// <summary>Kuryenin siparişi fiilen teslim aldığı zaman.</summary>
    public DateTime? PickedUpAt { get; set; }

    /// <summary>Kuryenin siparişi müşteriye teslim ettiği zaman.</summary>
    public DateTime? DeliveredAt { get; set; }

    /// <summary>
    /// Kuryenin bu teslimattan kazandığı hakediş tutarı (TL).
    /// Tarihsel Değişmezlik: Sipariş 'Delivered (3)' durumuna geçtiğinde
    /// o anki geçerli işletme/sistem paket teslimat tarifesi üzerinden mühürlenir.
    /// </summary>
    public decimal CourierEarning { get; set; } = 0.00m;

    /// <summary>
    /// İşletmenin / Sistemin bu teslimattan kestiği komisyon payı (TL).
    /// </summary>
    public decimal FirmFee { get; set; } = 0.00m;

    /// <summary>
    /// Bu sipariş kurye mahsuplaşmasında kapatıldı mı?
    /// Kasa sıfırlandığında true yapılarak mükerrer hesaplama önlenir.
    /// </summary>
    public bool IsReconciled { get; set; } = false;

    /// <summary>
    /// Kasa mahsuplaşma kaydının ID'si.
    /// </summary>
    public Guid? CashSettlementId { get; set; }

    /// <summary>
    /// Siparişin ödeme yöntemi (Online, Cash, CreditCardOnDelivery).
    /// </summary>
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Online;

    /// <summary>
    /// Müşteriden tahsil edilecek veya online ödenmiş sipariş toplam tutarı (TL).
    /// Nakit ödemelerde kurye teslim anında bu tutar kadar işletmeye borçlanır.
    /// </summary>
    public decimal TotalOrderAmount { get; set; } = 0.00m;

    /// <summary>Kısa sipariş kodu (örn: ORD-8492, TY-1049, YS-8391).</summary>
    public string? OrderCode { get; set; }

    /// <summary>Sipariş kaynağı (Trendyol, Yemeksepeti, Phone, Direct, Getir vb.).</summary>
    public string? Source { get; set; } = "Direct";

    /// <summary>Teslimat mahallesi (örn: Karaağaç, Numune, Çarşı).</summary>
    public string? DeliveryNeighborhood { get; set; }

    /// <summary>Tahmini mesafe (km).</summary>
    public double? EstimatedDistanceKm { get; set; }

    /// <summary>Tahmini teslimat süresi (dakika).</summary>
    public int? EstimatedDeliveryMinutes { get; set; }

    /// <summary>Kuryeye atandığı zaman damgası.</summary>
    public DateTime? AssignedAt { get; set; }

    // -------------------------------------------------------------------------
    // Navigation Properties
    // -------------------------------------------------------------------------

    /// <summary>Siparişi oluşturan işletme.</summary>
    public Merchant Merchant { get; set; } = null!;

    /// <summary>Siparişe atanan kurye (henüz atanmamışsa null).</summary>
    public Courier? Courier { get; set; }

    /// <summary>Bu sipariş nedeniyle oluşan kontör hareketleri (teslim/iptal).</summary>
    public ICollection<CreditTransaction> CreditTransactions { get; set; } = new List<CreditTransaction>();
}
