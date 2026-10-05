using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Couriers;

namespace KuryeSistemi.Application.Services.Interfaces;

/// <summary>Kuryenin destek talepleri: dispeçer iletişim bilgisi ve acil durum (SOS) çağrısı.</summary>
public interface ICourierSupportService
{
    Task<ServiceResult<CourierSupportInfoDto>> GetSupportInfoAsync(Guid courierId, CancellationToken ct = default);

    /// <summary>
    /// Acil durum çağrısı gönderir: firma paneline (ve restorana) anlık bildirim yayınlanır, denetim kaydı yazılır.
    /// Kötüye kullanımı önlemek için kurye başına dakikada 1 çağrı ile sınırlıdır (429).
    /// </summary>
    Task<ServiceResult<CourierSosResultDto>> RaiseSosAsync(Guid courierId, SosRequest request, CancellationToken ct = default);
}
