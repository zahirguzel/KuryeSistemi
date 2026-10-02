// DTOs/Couriers/UpdateCourierRequestDto.cs

using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.DTOs.Couriers;

/// <summary>
/// Kurye bilgilerini güncellemek için kullanılan DTO.
/// Tüm alanlar opsiyoneldir — sadece gönderilen alanlar güncellenir (PATCH semantiği).
/// </summary>
public sealed record UpdateCourierRequestDto(
    Guid?        MerchantId    = null,
    string?      FirstName     = null,
    string?      LastName      = null,
    string?      PhoneNumber   = null,
    string?      Email         = null,
    VehicleType? VehicleType   = null,
    string?      LicensePlate  = null,
    string?      VehicleBrand  = null,
    string?      VehicleModel  = null,
    bool?        IsAvailable   = null
);

