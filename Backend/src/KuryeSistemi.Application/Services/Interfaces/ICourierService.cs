// Services/Interfaces/ICourierService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Couriers;
using KuryeSistemi.Application.Features.Couriers.DTOs;
using KuryeSistemi.Application.DTOs.Wallet;

namespace KuryeSistemi.Application.Services.Interfaces;

public interface ICourierService
{
    /// <summary>Belirli bir işletmeye ait kuryeleri döner.</summary>
    Task<ServiceResult<IReadOnlyList<CourierDto>>> GetCouriersByMerchantAsync(Guid merchantId, bool? isAvailable, CancellationToken cancellationToken = default);

    /// <summary>Tüm kuryeleri döner (Kurye Firması Paneli için — tenant filtresi yok).</summary>
    Task<ServiceResult<IReadOnlyList<CourierDto>>> GetAllCouriersAsync(CancellationToken cancellationToken = default);

    /// <summary>Yeni kurye oluşturur.</summary>
    Task<ServiceResult<CourierDto>> CreateCourierAsync(CreateCourierRequestDto request, CancellationToken cancellationToken = default);

    /// <summary>Var olan kurye bilgilerini günceller.</summary>
    Task<ServiceResult<CourierDto>> UpdateCourierAsync(Guid courierId, UpdateCourierRequestDto request, CancellationToken cancellationToken = default);

    /// <summary>Kurye siler.</summary>
    Task<ServiceResult<bool>> DeleteCourierAsync(Guid courierId, CancellationToken cancellationToken = default);

    /// <summary>Kuryenin bugünkü kazanç özetini getirir.</summary>
    Task<ServiceResult<CourierEarningsDto>> GetTodayEarningsAsync(Guid courierId, CancellationToken cancellationToken = default);

    /// <summary>Kuryenin tarih aralığı kazancını getirir.</summary>
    Task<ServiceResult<CourierEarningsDto>> GetEarningsByDateRangeAsync(Guid courierId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);

    /// <summary>Kuryenin profil ve kasa bilgisini getirir.</summary>
    Task<ServiceResult<CourierProfileDto>> GetProfileAsync(Guid courierId, CancellationToken cancellationToken = default);

    /// <summary>Kuryenin mesai durumunu (IsOnline / IsAvailable) günceller ve SignalR ile yayınlar.</summary>
    Task<ServiceResult<bool>> ToggleShiftAsync(Guid courierId, bool isOnline, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kuryeyi molaya alır / moladan çıkarır. Yalnızca mesaideyken ve aktif siparişi yokken mola başlatılabilir.
    /// </summary>
    Task<ServiceResult<bool>> SetBreakAsync(Guid courierId, bool onBreak, CancellationToken cancellationToken = default);

    /// <summary>Kuryenin anlık GPS konumunu kaydeder.</summary>
    Task<ServiceResult<bool>> UpdateLocationAsync(Guid courierId, double latitude, double longitude, CancellationToken cancellationToken = default);
}
