using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.DTOs.Merchants;

/// <summary>
/// PUT /api/merchants/{id}/settings endpoint isteği.
/// İşletme sahibinin Ayarlar sayfasından gönderebileceği tüm değiştirilebilir alanlar.
/// </summary>
public sealed class UpdateMerchantSettingsDto
{
    /// <summary>İşletme ticari adı.</summary>
    public string? Name { get; set; }

    /// <summary>İşletme telefon numarası.</summary>
    public string? PhoneNumber { get; set; }

    /// <summary>Tam açık adres metni.</summary>
    public string? Address { get; set; }

    /// <summary>İşletmenin açık/kapalı durumu.</summary>
    public bool? IsOpen { get; set; }

    /// <summary>
    /// Restoran GPS enlemi (Leaflet haritasından seçilir).
    /// Null gönderilirse mevcut değer korunur.
    /// </summary>
    public double? Latitude { get; set; }

    /// <summary>
    /// Restoran GPS boylamı (Leaflet haritasından seçilir).
    /// Null gönderilirse mevcut değer korunur.
    /// </summary>
    public double? Longitude { get; set; }

    /// <summary>Çalışma saatleri metni. Örn: "10:00 - 23:30".</summary>
    public string? WorkingHours { get; set; }

    /// <summary>Paket dağıtım stratejisi (1: Havuz, 2: Manuel, 3: Akıllı GPS).</summary>
    public DispatchMode? DispatchMode { get; set; }

    /// <summary>H3 Altıgen (Hexagon) hücre arama çapı (metre, varsayılan: 1120m).</summary>
    public int? HexagonSizeMeters { get; set; }

    /// <summary>Kurye otomatik atama alanı sınır yarıçapı (km, varsayılan: 6 km).</summary>
    public int? MaxCourierDistanceKm { get; set; }

    /// <summary>Kuryenin bir turda alabileceği maksimum paket sayısı (varsayılan: 2).</summary>
    public int? MaxOrdersPerTour { get; set; }

    /// <summary>Sipariş birleştirme için bekleme/toplama süresi (dakika, varsayılan: 15 dk).</summary>
    public int? OrderBatchingTimeMinutes { get; set; }

    /// <summary>Başka restorandan paket birleştirme mesafesi (metre, varsayılan: 200m).</summary>
    public int? CrossRestaurantDistanceMeters { get; set; }

    /// <summary>Paket başı kurye taşıma ücreti (TL).</summary>
    public decimal? DefaultPackageFee { get; set; }

    /// <summary>Kurye paket başı net hakediş payı (TL).</summary>
    public decimal? CourierCutFee { get; set; }

    /// <summary>Mahsuplaşma periyodu (1: Günlük, 2: Haftalık, 3: Aylık).</summary>
    public ReconciliationPeriod? ReconciliationPeriod { get; set; }
}
