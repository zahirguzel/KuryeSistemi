namespace KuryeSistemi.Domain.Enums;

/// <summary>
/// Kontör işlem türü. Her kontör hareketi bu türü taşır.
/// </summary>
public enum CreditTransactionType
{
    /// <summary>Platform sahibi tarafından kontör yükleme.</summary>
    TopUp = 1,

    /// <summary>Başarılı teslimat sonrası otomatik kontör düşme.</summary>
    DeliveryDeduction = 2,

    /// <summary>İptal edilen teslimat nedeniyle kontör iadesi.</summary>
    Refund = 3,

    /// <summary>Platform sahibi tarafından manuel düzeltme (+ veya -).</summary>
    ManualAdjustment = 4,

    /// <summary>Paket satın alma (toplu kontör).</summary>
    PackagePurchase = 5,
}
