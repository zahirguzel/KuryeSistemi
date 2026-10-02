using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.Features.Merchants.DTOs;

/// <summary>
/// Merchant entity'sinin dışarıya açılan veri transfer nesnesi.
/// Handler'lar domain entity yerine bu DTO'yu döner.
/// </summary>
public sealed record MerchantDto(
    Guid     Id,
    string   Name,
    string   Email,
    string   PhoneNumber,
    string   Address,
    bool     IsActive,
    bool     IsOpen,
    double?  Latitude,
    double?  Longitude,
    DateTime CreatedAt,
    decimal  DefaultPackageFee = 75.00m,
    DispatchMode DispatchMode = DispatchMode.Pool,
    ReconciliationPeriod ReconciliationPeriod = ReconciliationPeriod.Daily,
    decimal  CourierCutFee = 40.00m,
    int      HexagonSizeMeters = 1120,
    int      MaxCourierDistanceKm = 6,
    int      MaxOrdersPerTour = 2,
    int      OrderBatchingTimeMinutes = 15,
    int      CrossRestaurantDistanceMeters = 200
);

