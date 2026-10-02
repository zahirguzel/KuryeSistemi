namespace KuryeSistemi.Application.Features.Auth.DTOs;

/// <summary>
/// Başarılı login sonucunda dönen token bilgisi.
/// Roles alanı frontend rol bazlı yönlendirme için kullanılır.
/// CourierCompanyId sadece CompanyUser ve Courier login'inde dolu gelir.
/// CompanyUserId sadece CompanyUser login'inde dolu gelir.
/// </summary>
public sealed record AuthTokenDto(
    string   Token,
    Guid     MerchantId,
    string   MerchantName,
    string   Email,
    DateTime ExpiresAt,
    Guid?    CourierId         = null,
    string[] Roles             = null!,
    Guid?    CompanyUserId     = null,
    Guid?    CourierCompanyId  = null
);
