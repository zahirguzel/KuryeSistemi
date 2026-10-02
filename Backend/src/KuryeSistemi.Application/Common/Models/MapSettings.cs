namespace KuryeSistemi.Application.Common.Models;

/// <summary>
/// Harita sağlayıcı ve API anahtarı yapılandırma modeli.
/// appsettings.json dosyasındaki "MapSettings" bölümünden beslenir.
/// </summary>
public class MapSettings
{
    public const string SectionName = "MapSettings";

    /// <summary>
    /// Aktif harita sağlayıcısı: "OpenStreetMap" veya "GoogleMaps"
    /// </summary>
    public string ActiveMapProvider { get; set; } = "OpenStreetMap";

    /// <summary>
    /// Google Maps API anahtarı (GoogleMaps seçildiğinde zorunludur)
    /// </summary>
    public string GoogleMapsApiKey { get; set; } = string.Empty;
}
