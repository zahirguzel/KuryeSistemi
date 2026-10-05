using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.Features.Couriers.DTOs;

/// <summary>
/// Courier entity'sinin dışarıya açılan veri transfer nesnesi.
/// </summary>
public sealed record CourierDto(
    Guid        Id,
    Guid?       MerchantId,
    string      FirstName,
    string      LastName,
    string      PhoneNumber,
    string      Email,
    VehicleType VehicleType,
    string      LicensePlate,
    string      VehicleBrand,
    string      VehicleModel,
    bool        IsAvailable,
    decimal     CurrentBalance,
    DateTime    CreatedAt,
    bool        IsOnline = false,
    double?     CurrentLatitude = null,
    double?     CurrentLongitude = null,
    DateTime?   LastLocationUpdate = null,
    Guid        CourierCompanyId = default,
    bool        IsOnBreak = false
);
