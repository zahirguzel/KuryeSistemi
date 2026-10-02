// DTOs/Couriers/CreateCourierRequestDto.cs

using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.DTOs.Couriers;

public sealed record CreateCourierRequestDto(
    Guid? MerchantId = null,
    string FirstName = "",
    string LastName = "",
    string PhoneNumber = "",
    string Email = "",
    VehicleType VehicleType = VehicleType.Motorcycle,
    string LicensePlate = "",
    string VehicleBrand = "",
    string VehicleModel = "",
    string? Password = null,
    Guid? CourierCompanyId = null
);
