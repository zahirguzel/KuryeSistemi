// Controllers/Merchants/MerchantsController.cs

using KuryeSistemi.Application.DTOs.Merchants;
using KuryeSistemi.Application.Features.Merchants.DTOs;
using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KuryeSistemi.API.Controllers.Merchants;

[Produces("application/json")]
public sealed class MerchantsController : BaseController
{
    private readonly IMerchantService _merchantService;

    public MerchantsController(IMerchantService merchantService)
    {
        _merchantService = merchantService;
    }

    /// <summary>
    /// Tüm aktif işletmeleri listeler. Sadece Kurye Firması ve Admin tüm işletmeleri görebilir.
    /// Standart işletmeler yalnızca kendi bilgilerini görebilir.
    /// </summary>
    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(IReadOnlyList<MerchantDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        if (IsFirmOrAdmin())
        {
            var result = await _merchantService.GetAllAsync(cancellationToken);
            return CreateActionResult(result);
        }

        var ownMerchantId = GetMerchantId();
        var ownResult = await _merchantService.GetByIdAsync(ownMerchantId, cancellationToken);
        if (ownResult.IsSuccess && ownResult.Data != null)
        {
            return Ok(KuryeSistemi.Application.Common.Models.ServiceResult<IReadOnlyList<MerchantDto>>.Success(new List<MerchantDto> { ownResult.Data }));
        }

        return CreateActionResult(ownResult);
    }

    /// <summary>
    /// Yeni bir işletme oluşturur (Yalnızca Firma Yetkilisi veya Admin).
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(MerchantDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromBody] CreateMerchantRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!IsFirmOrAdmin())
            return Forbid();

        var result = await _merchantService.CreateAsync(request, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Belirtilen işletmenin profil ve ayar bilgilerini getirir.
    /// </summary>
    [HttpGet("{merchantId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(MerchantDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid merchantId, CancellationToken cancellationToken)
    {
        if (!IsFirmOrAdmin() && GetMerchantId() != merchantId)
            return Forbid();

        var result = await _merchantService.GetByIdAsync(merchantId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// İşletmenin profil ayarlarını (adres, GPS konumu, açık/kapalı durumu) günceller.
    /// Yalnızca kendi merchantId'si ile çağırabilir — başka işletmeye erişim reddedilir.
    /// </summary>
    [HttpPut("{merchantId:guid}/settings")]
    [Authorize]
    [ProducesResponseType(typeof(MerchantDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSettings(
        Guid merchantId,
        [FromBody] UpdateMerchantSettingsDto request,
        CancellationToken cancellationToken)
    {
        if (!IsFirmOrAdmin() && GetMerchantId() != merchantId)
            return Forbid();

        var result = await _merchantService.UpdateSettingsAsync(merchantId, request, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Belirtilen işletmeyi siler / pasife alır (Yalnızca Firma Yetkilisi veya Admin).
    /// </summary>
    [HttpDelete("{merchantId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid merchantId, CancellationToken cancellationToken)
    {
        if (!IsFirmOrAdmin())
            return Forbid();

        var result = await _merchantService.DeleteAsync(merchantId, cancellationToken);
        return CreateActionResult(result);
    }
}
