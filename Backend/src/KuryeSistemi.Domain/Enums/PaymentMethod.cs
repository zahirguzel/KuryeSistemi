using System.Text.Json.Serialization;

namespace KuryeSistemi.Domain.Enums;

/// <summary>
/// Sipariş ödeme yöntemi.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PaymentMethod
{
    /// <summary>Uygulama/Web üzerinden online ödenmiş sipariş.</summary>
    Online = 0,

    /// <summary>Kapıda kuryeye nakit ödeme (Kurye firmaya borçlanır).</summary>
    Cash = 1,

    /// <summary>Kapıda POS cihazı ile kredi kartı ödemesi.</summary>
    CreditCardOnDelivery = 2
}
