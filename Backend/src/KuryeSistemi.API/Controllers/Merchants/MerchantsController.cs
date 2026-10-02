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

            // Tenant izolasyonu: firma kullanıcısı yalnızca kendi firmasının işletmelerini görür
            var accessibleIds = await GetAccessibleMerchantIdsAsync(cancellationToken);
            if (accessibleIds is not null && result.IsSuccess && result.Data is not null)
            {
                var scoped = result.Data.Where(m => accessibleIds.Contains(m.Id)).ToList().AsReadOnly();
                result = KuryeSistemi.Application.Common.Models.ServiceResult<IReadOnlyList<MerchantDto>>.Success(scoped);
            }

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
        // Firma alt kullanıcıları için yetki matrisi
        if (!await HasCompanyPermissionAsync(KuryeSistemi.Domain.Entities.CompanyPermission.ManageMerchants, cancellationToken))
            return Forbid();

        if (!IsFirmOrAdmin())
            return Forbid();

        // Yeni işletme, oluşturan firma kullanıcısının firmasına bağlanır (istekteki değer yok sayılır).
        // SuperAdmin ise istekte belirtilen firmayı kullanabilir.
        var companyId = IsAdmin()
            ? request.CourierCompanyId
            : await ResolveCallerCompanyIdAsync(cancellationToken);

        var result = await _merchantService.CreateAsync(request with { CourierCompanyId = companyId }, cancellationToken);
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
        if (!await CanAccessMerchantAsync(merchantId, cancellationToken))
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
        // Firma alt kullanıcıları için yetki matrisi
        if (!await HasCompanyPermissionAsync(KuryeSistemi.Domain.Entities.CompanyPermission.ManageMerchants, cancellationToken))
            return Forbid();

        if (!await CanAccessMerchantAsync(merchantId, cancellationToken))
            return Forbid();

        // Sözleşme/finans alanlarını yalnızca firma belirler: restoran kendi paket ücretini,
        // kurye hakedişini veya mahsuplaşma periyodunu değiştiremez.
        if (!IsFirmOrAdmin())
        {
            request.DefaultPackageFee = null;
            request.CourierCutFee = null;
            request.ReconciliationPeriod = null;

            // Dağıtım stratejisi ve algoritma parametreleri de sözleşme kapsamındadır (arayüzde kilitli;
            // API üzerinden de değiştirilemez). Yalnızca kurye firması / admin belirler.
            request.DispatchMode = null;
            request.HexagonSizeMeters = null;
            request.MaxCourierDistanceKm = null;
            request.MaxOrdersPerTour = null;
            request.OrderBatchingTimeMinutes = null;
            request.CrossRestaurantDistanceMeters = null;
        }

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
        // Firma alt kullanıcıları için yetki matrisi
        if (!await HasCompanyPermissionAsync(KuryeSistemi.Domain.Entities.CompanyPermission.ManageMerchants, cancellationToken))
            return Forbid();

        if (!IsFirmOrAdmin() || !await CanAccessMerchantAsync(merchantId, cancellationToken))
            return Forbid();

        var result = await _merchantService.DeleteAsync(merchantId, cancellationToken);
        return CreateActionResult(result);
    }
}
