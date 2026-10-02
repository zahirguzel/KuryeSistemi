namespace KuryeSistemi.Domain.Enums;

/// <summary>
/// İşletme ile kurye lojistik firması arasındaki nakit kasa mahsuplaşma ve hesap kesim periyodu.
/// </summary>
public enum ReconciliationPeriod
{
    /// <summary>
    /// Günlük: Her gün mesai bitiminde kasa kapatılır ve hesaplaşılır.
    /// </summary>
    Daily = 1,

    /// <summary>
    /// Haftalık: Pazar gecesi haftalık toplam teslimat ve nakit üzerinden hesaplaşılır.
    /// </summary>
    Weekly = 2,

    /// <summary>
    /// Aylık: Ay sonunda toplu cari mahsuplaşma yapılır.
    /// </summary>
    Monthly = 3
}
