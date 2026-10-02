namespace KuryeSistemi.Domain.Enums;

/// <summary>
/// Siparişlerin kuryelere dağıtılma ve atanma stratejisi.
/// </summary>
public enum DispatchMode
{
    /// <summary>
    /// Havuz Sistemi: Sipariş tüm boş kuryelere aynı anda düşer, ilk kabul eden paketi alır.
    /// </summary>
    Pool = 1,

    /// <summary>
    /// Manuel Atama: Siparişler panele düşer; restoran yöneticisi kuryeyi listeden kendisi seçip atar.
    /// </summary>
    Manual = 2,

    /// <summary>
    /// Akıllı GPS (Auto-Dispatch): Sistem siparişi restorana en yakın boş kuryeye otomatik olarak atar.
    /// </summary>
    SmartAuto = 3
}
