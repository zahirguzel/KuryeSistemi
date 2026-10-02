using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Company;

namespace KuryeSistemi.Application.Services.Interfaces;

/// <summary>
/// Kurye firması kontör (kredi) defteri. Her hareket CreditTransaction olarak kaydedilir;
/// bakiye güncellemesi eşzamanlı işlemlerde kayıp yazma olmaması için iyimser kilitle (xmin) korunur.
/// </summary>
public interface ICreditService
{
    Task<ServiceResult<CreditBalanceDto>> TopUpAsync(
        Guid companyId, int amount, string? referenceNumber, string? notes, string actor, CancellationToken ct = default);

    /// <summary>Manuel düzeltme (+/-). Bakiyeyi negatife düşüren düzeltme reddedilir.</summary>
    Task<ServiceResult<CreditBalanceDto>> AdjustAsync(
        Guid companyId, int amount, string? reason, string actor, CancellationToken ct = default);

    /// <summary>
    /// Teslim edilen sipariş için 1 kontör düşer. İdempotenttir (aynı sipariş iki kez düşülmez);
    /// firmaya bağlı olmayan (eski) işletme siparişlerinde işlem yapmaz.
    /// </summary>
    Task<ServiceResult> DeductForDeliveryAsync(Guid orderId, CancellationToken ct = default);

    /// <summary>Firmanın "sıfır kontörde engelle" ayarı açık ve bakiye tükenmişse yeni sipariş açılmasını reddeder.</summary>
    Task<ServiceResult> EnsureCanCreateOrderAsync(Guid merchantId, CancellationToken ct = default);

    Task<ServiceResult<PagedResult<CreditTransactionDto>>> GetHistoryAsync(
        Guid companyId, int page, int size, CancellationToken ct = default);
}
