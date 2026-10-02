namespace KuryeSistemi.Domain.Enums;

/// <summary>
/// Kurye firması alt kullanıcısının sisteme tanımlı rolü.
/// Bu roller JWT token'a eklenir ve izin kontrolünde kullanılır.
/// </summary>
public enum CompanyUserRole
{
    /// <summary>
    /// Firma Yöneticisi: Tüm yetkilere sahip (finans dahil).
    /// Raporları görebilir, kurye ekleyip çıkarabilir, sipariş yönetebilir.
    /// </summary>
    Manager = 1,

    /// <summary>
    /// Operatör: Canlı operasyonları yönetir.
    /// Sipariş atama, kurye takibi yapabilir. Finans ve raporlara erişemez.
    /// </summary>
    Operator = 2,

    /// <summary>
    /// Muhasebeci: Yalnızca finans ve raporlara erişir.
    /// Operasyonel değişiklik yapamaz.
    /// </summary>
    Accountant = 3,

    /// <summary>
    /// Destek: Sipariş görüntüleyebilir ve müşteri sorunlarına bakabilir.
    /// Değişiklik yapamaz.
    /// </summary>
    Support = 4,
}
