// Services/Interfaces/IMerchantService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Merchants;
using KuryeSistemi.Application.Features.Merchants.DTOs;

namespace KuryeSistemi.Application.Services.Interfaces;

public interface IMerchantService
{
    Task<ServiceResult<IReadOnlyList<MerchantDto>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<MerchantDto>> CreateAsync(CreateMerchantRequestDto request, CancellationToken cancellationToken = default);

    Task<ServiceResult<MerchantDto>> GetByIdAsync(Guid merchantId, CancellationToken cancellationToken = default);

    /// <summary>
    /// İşletmenin profil ayarlarını (adres, GPS, açık/kapalı, çalışma saati vb.) günceller.
    /// </summary>
    Task<ServiceResult<MerchantDto>> UpdateSettingsAsync(Guid merchantId, UpdateMerchantSettingsDto request, CancellationToken cancellationToken = default);

    /// <summary>
    /// İşletmenin kurye ile olan gün sonu nakit kasa mahsuplaşmasını yapar ve kuryenin bakiyesini 0.00 TL'ye eşitler.
    /// Aynı zamanda denetim geçmişi (audit log) için CashSettlement kaydı oluşturur.
    /// </summary>
    Task<ServiceResult<CourierReconciliationDto>> ReconcileCourierAsync(Guid merchantId, Guid courierId, CancellationToken cancellationToken = default);

    /// <summary>
    /// İşletmenin geçmiş kasa mahsuplaşma döküm ve raporlarını listeler.
    /// </summary>
    Task<ServiceResult<IReadOnlyList<CashSettlementDto>>> GetMerchantSettlementsAsync(Guid merchantId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Verilen işletmelerin mahsuplaşma geçmişini listeler (firma paneli). merchantIds null ise kısıtsızdır (SuperAdmin).
    /// </summary>
    Task<ServiceResult<IReadOnlyList<CashSettlementDto>>> GetSettlementsAsync(IReadOnlyCollection<Guid>? merchantIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// İşletmenin teslim edilen paketlerine göre kurye firmasıyla olan net mahsuplaşma özetini hesaplar.
    /// Web ve Mobil istemciler için tekil, optimize ve hafif veri kaynağıdır.
    /// </summary>
    Task<ServiceResult<MerchantFinanceSummaryDto>> GetMerchantFinanceSummaryAsync(
        Guid merchantId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        string? paymentMethod = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// İşletmeyi siler / pasife alır.
    /// </summary>
    Task<ServiceResult<bool>> DeleteAsync(Guid merchantId, CancellationToken cancellationToken = default);
}

