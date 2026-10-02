using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.API.Controllers.Couriers;

/// <summary>POST /api/couriers için istek gövdesi.</summary>
public sealed record CreateCourierRequest(
    Guid        MerchantId,
    string      FirstName,
    string      LastName,
    string      PhoneNumber,
    string      Email,
    VehicleType VehicleType,
    string      LicensePlate,
    string      VehicleBrand,
    string      VehicleModel
);

/// <summary>POST /api/couriers/me/shift için istek gövdesi.</summary>
public sealed record ToggleShiftRequest(
    bool IsOnline
);
