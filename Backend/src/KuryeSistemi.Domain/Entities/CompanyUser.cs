using KuryeSistemi.Domain.Common;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Domain.Entities;

/// <summary>
/// Kurye firmasının alt kullanıcısı (Müdür, Operatör, Muhasebeci vb.).
/// Firma sahibi (CourierCompany) bu kullanıcıları sisteme davet eder.
/// Her kullanıcının bir rolü ve o role göre otomatik belirlenen izinleri vardır;
/// ancak izinler rol düzeyinde geçersiz kılınabilir (override).
/// </summary>
public sealed class CompanyUser : BaseEntity
{
    // -------------------------------------------------------------------------
    // Bağlı olduğu firma
    // -------------------------------------------------------------------------

    /// <summary>Bu kullanıcının ait olduğu kurye firması ID'si.</summary>
    public Guid CourierCompanyId { get; set; }

    // -------------------------------------------------------------------------
    // Kimlik bilgileri
    // -------------------------------------------------------------------------

    /// <summary>Kullanıcının adı.</summary>
    public string FirstName { get; set; } = string.Empty;

    /// <summary>Kullanıcının soyadı.</summary>
    public string LastName { get; set; } = string.Empty;

    /// <summary>Giriş e-postası (sistem genelinde unique).</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Şifre hash'i (BCrypt).</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Şifrenin son değiştirildiği an (UTC). Bundan önce üretilmiş token'lar geçersiz sayılır.</summary>
    public DateTime? PasswordChangedAt { get; set; }

    /// <summary>Telefon numarası.</summary>
    public string PhoneNumber { get; set; } = string.Empty;

    // -------------------------------------------------------------------------
    // Rol ve İzinler
    // -------------------------------------------------------------------------

    /// <summary>
    /// Kullanıcının rolü. Bu rol izinlerin varsayılan değerini belirler.
    /// Sonradan bireysel izinler override edilebilir.
    /// </summary>
    public CompanyUserRole Role { get; set; } = CompanyUserRole.Operator;

    // --- Granüler İzinler ---
    // null = rol varsayılanını kullan; true/false = override

    /// <summary>Finans raporlarını, mahsuplaşma özetlerini görebilir mi?</summary>
    public bool? CanViewReports { get; set; }

    /// <summary>Kasa mahsuplaşması (settlement) yapabilir mi?</summary>
    public bool? CanManageFinance { get; set; }

    /// <summary>Kurye ekleyip düzenleyip silebilir mi?</summary>
    public bool? CanManageCouriers { get; set; }

    /// <summary>Sipariş atayabilir, iptal edebilir, durumunu değiştirebilir mi?</summary>
    public bool? CanManageOrders { get; set; }

    /// <summary>İşletme (restoran) ekleyip düzenleyip silebilir mi?</summary>
    public bool? CanManageMerchants { get; set; }

    /// <summary>Firma ayarlarını (kontör eşiği, ücretler vb.) düzenleyebilir mi?</summary>
    public bool? CanEditCompanySettings { get; set; }

    // -------------------------------------------------------------------------
    // Durum
    // -------------------------------------------------------------------------

    /// <summary>Kullanıcı hesabı aktif mi?</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Son giriş zamanı (UTC).</summary>
    public DateTime? LastLoginAt { get; set; }

    // -------------------------------------------------------------------------
    // Navigation Properties
    // -------------------------------------------------------------------------

    /// <summary>Bağlı olduğu kurye firması.</summary>
    public CourierCompany CourierCompany { get; set; } = null!;

    // -------------------------------------------------------------------------
    // Domain Logic: İzin Değerlendirme
    // -------------------------------------------------------------------------

    /// <summary>
    /// Belirtilen izni değerlendirir.
    /// Override varsa onu, yoksa rolün varsayılan değerini döner.
    /// </summary>
    public bool HasPermission(CompanyPermission permission)
    {
        return permission switch
        {
            CompanyPermission.ViewReports       => CanViewReports       ?? RoleDefaults.CanViewReports(Role),
            CompanyPermission.ManageFinance     => CanManageFinance     ?? RoleDefaults.CanManageFinance(Role),
            CompanyPermission.ManageCouriers    => CanManageCouriers    ?? RoleDefaults.CanManageCouriers(Role),
            CompanyPermission.ManageOrders      => CanManageOrders      ?? RoleDefaults.CanManageOrders(Role),
            CompanyPermission.ManageMerchants   => CanManageMerchants   ?? RoleDefaults.CanManageMerchants(Role),
            CompanyPermission.EditCompanySettings => CanEditCompanySettings ?? RoleDefaults.CanEditCompanySettings(Role),
            _ => false
        };
    }
}

/// <summary>
/// Rol varsayılan izin matrisi.
/// Yeni bir rol eklendiğinde burası güncellenir.
/// </summary>
public static class RoleDefaults
{
    public static bool CanViewReports(CompanyUserRole role) => role is CompanyUserRole.Manager or CompanyUserRole.Accountant;
    public static bool CanManageFinance(CompanyUserRole role) => role is CompanyUserRole.Manager or CompanyUserRole.Accountant;
    public static bool CanManageCouriers(CompanyUserRole role) => role is CompanyUserRole.Manager or CompanyUserRole.Operator;
    public static bool CanManageOrders(CompanyUserRole role) => role is CompanyUserRole.Manager or CompanyUserRole.Operator or CompanyUserRole.Support;
    public static bool CanManageMerchants(CompanyUserRole role) => role is CompanyUserRole.Manager;
    public static bool CanEditCompanySettings(CompanyUserRole role) => role is CompanyUserRole.Manager;
}

/// <summary>
/// İzin sabitleri - kod içinde string magic value kullanmamak için.
/// </summary>
public enum CompanyPermission
{
    ViewReports,
    ManageFinance,
    ManageCouriers,
    ManageOrders,
    ManageMerchants,
    EditCompanySettings,
}
