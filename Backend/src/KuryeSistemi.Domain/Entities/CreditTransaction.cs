using KuryeSistemi.Domain.Common;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Domain.Entities;

/// <summary>
/// Kontör (kredi) hareket kaydı.
/// Her kontör yükleme, düşme veya düzeltme bu tabloya append-only olarak yazılır.
/// Mevcut bakiye CourierCompany.CreditBalance'da tutulur (denormalized, performans için).
/// Bu tablo denetim ve geçmiş sorgulama içindir.
/// </summary>
public sealed class CreditTransaction : BaseEntity
{
    /// <summary>İşlemin ilişkili olduğu kurye firması.</summary>
    public Guid CourierCompanyId { get; set; }

    /// <summary>İşlem türü (yükleme, düşme, iade, düzeltme vb.).</summary>
    public CreditTransactionType Type { get; set; }

    /// <summary>
    /// Hareket miktarı.
    /// Pozitif = kontör eklendi (yükleme/iade), Negatif = kontör düşüldü.
    /// </summary>
    public int Amount { get; set; }

    /// <summary>İşlem sonrası kalan bakiye (snapshot için).</summary>
    public int BalanceAfter { get; set; }

    /// <summary>
    /// İşlemle ilişkili sipariş (DeliveryDeduction/Refund için).
    /// Null olabilir (manuel yükleme/düzeltme gibi işlemlerde).
    /// </summary>
    public Guid? OrderId { get; set; }

    /// <summary>
    /// İşlemle ilişkili paket/fatura referans numarası (toplu yükleme için).
    /// </summary>
    public string? ReferenceNumber { get; set; }

    /// <summary>İşlemi açıklayan not (opsiyonel, admin tarafından girilebilir).</summary>
    public string? Notes { get; set; }

    // -------------------------------------------------------------------------
    // Navigation Properties
    // -------------------------------------------------------------------------

    /// <summary>İlişkili kurye firması.</summary>
    public CourierCompany CourierCompany { get; set; } = null!;

    /// <summary>İlişkili sipariş (varsa).</summary>
    public Order? Order { get; set; }
}
