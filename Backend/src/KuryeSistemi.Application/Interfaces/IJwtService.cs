namespace KuryeSistemi.Application.Interfaces;

/// <summary>
/// JWT token üretimi için soyut sözleşme.
/// Application katmanı bu interface'e bağımlıdır; somut implementasyon Infrastructure'dadır.
/// Bu sayede Application katmanı JWT kütüphanesine referans almak zorunda kalmaz (DIP).
/// </summary>
public interface IJwtService
{
    /// <summary>
    /// Merchant (restoran) veya Kurye hesabı için JWT token üretir.
    /// </summary>
    string GenerateToken(Guid merchantId, string email, Guid? courierId = null, string role = "Merchant", Guid? courierCompanyId = null);

    /// <summary>
    /// Kurye firması alt kullanıcısı (CompanyUser) için JWT token üretir.
    /// </summary>
    string GenerateCompanyUserToken(Guid companyUserId, Guid courierCompanyId, string email, string role);

    /// <summary>
    /// Süper Admin için JWT token üretir.
    /// </summary>
    string GenerateAdminToken(Guid adminUserId, string email);
}
