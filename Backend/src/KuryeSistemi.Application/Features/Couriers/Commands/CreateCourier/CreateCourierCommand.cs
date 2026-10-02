using KuryeSistemi.Application.Features.Couriers.DTOs;
using KuryeSistemi.Domain.Enums;
using MediatR;

namespace KuryeSistemi.Application.Features.Couriers.Commands.CreateCourier;

/// <summary>
/// Yeni kurye oluşturma komutu.
/// MerchantId zorunludur — kurye mutlaka bir işletmeye bağlı olmalıdır (multi-tenant).
/// </summary>
public sealed record CreateCourierCommand(
    Guid        MerchantId,
    string      FirstName,
    string      LastName,
    string      PhoneNumber,
    string      Email,
    VehicleType VehicleType,
    string      LicensePlate,
    string      VehicleBrand,
    string      VehicleModel,
    string?     Password = null
) : IRequest<CourierDto>;
