using System.Text.Json.Serialization;

namespace KuryeSistemi.Domain.Enums;

/// <summary>
/// Sipariş için durum makinesi (State Machine) enum'u.
/// Geçerli geçiş akışı:
///   Pending → Assigned → PickedUp → Delivered
///   Pending | Assigned → Cancelled
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum OrderStatus
{
    /// <summary>Sipariş oluşturuldu, henüz mutfak/kurye onaylamadı.</summary>
    Pending = 0,

    /// <summary>Sipariş mutfakta hazırlanıyor.</summary>
    Preparing = 1,

    /// <summary>Sipariş hazırlandı, paketlendi, kurye alımını bekliyor.</summary>
    Ready = 2,

    /// <summary>Kurye atandı/onayladı, paketi teslim almaya gidiyor.</summary>
    Assigned = 3,

    /// <summary>Kurye siparişi restorandan teslim aldı, müşteriye götürüyor (Yolda).</summary>
    PickedUp = 4,

    /// <summary>Sipariş müşteriye başarıyla teslim edildi.</summary>
    Delivered = 5,

    /// <summary>Sipariş iptal edildi.</summary>
    Cancelled = 6
}
