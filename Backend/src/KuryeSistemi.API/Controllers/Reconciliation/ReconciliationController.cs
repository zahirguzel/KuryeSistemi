// Controllers/Reconciliation/ReconciliationController.cs

using KuryeSistemi.Application.DTOs.Merchants;
using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KuryeSistemi.API.Controllers.Reconciliation;

/// <summary>
/// Finans ve Kasa Mahsuplaşma Denetleyicisi.
/// CepteServis KasaHareketController standartlarında, Zero-Logic mimarisiyle inşa edilmiştir.
/// </summary>
[Produces("application/json")]
[Authorize(Roles = KuryeSistemi.Application.Common.Constants.AppRoles.MerchantAndFirmRoles)]
public sealed class ReconciliationController : BaseController
{
    private readonly IMerchantService _merchantService;

    public ReconciliationController(IMerchantService merchantService)
    {
        _merchantService = merchantService;
    }

    /// <summary>
    /// Gün sonunda işletme ile kurye arasındaki nakit kasa mahsuplaşmasını yapar.
    /// Kuryenin güncel bakiyesini atomik olarak 0.00 TL'ye eşitler ve denetim log kaydı oluşturur.
    /// </summary>
    [HttpPost("couriers/{courierId:guid}")]
    [ProducesResponseType(typeof(CourierReconciliationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReconcileCourier(
        Guid courierId,
        [FromQuery] Guid? merchantId,
        CancellationToken cancellationToken)
    {
        var effectiveMerchantId = ResolveTenantId(merchantId);
        var result = await _merchantService.ReconcileCourierAsync(effectiveMerchantId, courierId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Giriş yapan işletmenin geçmiş kasa mahsuplaşma döküm ve rapor kayıtlarını listeler.
    /// </summary>
    [HttpGet("settlements")]
    [ProducesResponseType(typeof(IReadOnlyList<CashSettlementDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetSettlements([FromQuery] Guid? merchantId, CancellationToken cancellationToken)
    {
        var effectiveMerchantId = ResolveTenantId(merchantId);
        var result = await _merchantService.GetMerchantSettlementsAsync(effectiveMerchantId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// İşletmenin teslim edilen paketlerine göre kurye firmasıyla olan finans ve mahsuplaşma özetini döner.
    /// Hem Web yönetim paneli hem de İşletme Mobil Uygulaması için tek, optimize edilmiş uç noktadır.
    /// </summary>
    [HttpGet("merchant/summary")]
    [ProducesResponseType(typeof(MerchantFinanceSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMerchantFinanceSummary(
        [FromQuery] Guid? merchantId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? paymentMethod,
        CancellationToken cancellationToken)
    {
        var effectiveMerchantId = ResolveTenantId(merchantId);

        var result = await _merchantService.GetMerchantFinanceSummaryAsync(
            effectiveMerchantId,
            startDate,
            endDate,
            paymentMethod,
            cancellationToken);

        return CreateActionResult(result);
    }
}

