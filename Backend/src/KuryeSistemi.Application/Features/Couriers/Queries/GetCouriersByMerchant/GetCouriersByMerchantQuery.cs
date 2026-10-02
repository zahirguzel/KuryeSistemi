using KuryeSistemi.Application.Features.Couriers.DTOs;
using MediatR;

namespace KuryeSistemi.Application.Features.Couriers.Queries.GetCouriersByMerchant;

/// <summary>
/// Belirli bir işletmeye ait kuryeleri getiren sorgu.
/// MerchantId zorunludur — tenant izolasyonunu garantiler.
/// IsAvailable opsiyoneldir: null → hepsi, true → müsait, false → meşgul.
/// </summary>
public sealed record GetCouriersByMerchantQuery(
    Guid  MerchantId,
    bool? IsAvailable = null
) : IRequest<List<CourierDto>>;
