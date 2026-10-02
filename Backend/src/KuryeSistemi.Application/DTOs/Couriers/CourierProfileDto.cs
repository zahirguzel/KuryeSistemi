namespace KuryeSistemi.Application.DTOs.Couriers;

/// <summary>
/// Kurye profil ve mahsuplaşma (kasa) bilgilerini taşıyan DTO.
/// </summary>
public sealed record CourierProfileDto(
    Guid Id,
    Guid? MerchantId,
    string MerchantName,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string PhoneNumber,
    string VehicleType,
    string LicensePlate,
    string VehicleBrand,
    string VehicleModel,
    bool IsAvailable,
    decimal CurrentBalance,
    int CompletedDeliveriesToday,
    decimal TotalEarningsToday,
    int TotalDeliveriesAllTime,
    bool IsOnline = false,
    Guid CourierCompanyId = default
);
