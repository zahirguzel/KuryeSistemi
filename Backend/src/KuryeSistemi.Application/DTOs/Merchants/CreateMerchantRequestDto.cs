// DTOs/Merchants/CreateMerchantRequestDto.cs

using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.DTOs.Merchants;

public sealed record CreateMerchantRequestDto(
    string Name,
    string Email,
    string Password,
    string? PhoneNumber = null,
    string? Address = null,
    decimal? DefaultPackageFee = null,
    DispatchMode? DispatchMode = null,
    ReconciliationPeriod? ReconciliationPeriod = null,
    double? Latitude = null,
    double? Longitude = null,
    decimal? CourierCutFee = null,
    /// <summary>Bağlı kurye firması. Firma kullanıcıları için sunucu tarafında token'dan doldurulur.</summary>
    Guid? CourierCompanyId = null
);
