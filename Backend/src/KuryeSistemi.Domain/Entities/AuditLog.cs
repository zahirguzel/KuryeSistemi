using KuryeSistemi.Domain.Common;

namespace KuryeSistemi.Domain.Entities;

/// <summary>
/// Sistem genelindeki kritik eylemleri (Giriş, Sipariş Durum Değişikliği, Mahsuplaşma, Ayar Değişimi vb.)
/// izleyen ve denetleyen denetim günlüğü entity'si.
/// Admin ve Firma panellerinde detaylı denetim raporu sunar.
/// </summary>
public sealed class AuditLog : BaseEntity
{
    public Guid? UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public Guid? MerchantId { get; set; }
    public string Action { get; set; } = string.Empty; // Örn: "Order.StatusChange", "Auth.Login", "Reconciliation.Courier"
    public string EntityName { get; set; } = string.Empty; // Örn: "Order", "Courier", "Merchant"
    public string EntityId { get; set; } = string.Empty;
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
}
