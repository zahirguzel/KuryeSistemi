// Controllers/Couriers/CouriersController.cs

using KuryeSistemi.Application.DTOs.Couriers;
using KuryeSistemi.Application.Features.Couriers.DTOs;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KuryeSistemi.API.Controllers.Couriers;

[Produces("application/json")]
[Authorize]
public sealed class CouriersController : BaseController
{
    private readonly ICourierService _courierService;
    private readonly ICourierRepository _courierRepository;

    public CouriersController(
        ICourierService courierService,
        ICourierRepository courierRepository)
    {
        _courierService = courierService;
        _courierRepository = courierRepository;
    }

    /// <summary>
    /// Tüm kuryeleri listeler (Kurye Firması Paneli için — merchant filtresi yok).
    /// ?merchantId=... ile belirli bir işletmeye filtreleyin.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CourierDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? merchantId,
        [FromQuery] bool? isAvailable,
        CancellationToken cancellationToken)
    {
        if (IsFirmOrAdmin())
        {
            if (merchantId.HasValue && merchantId.Value != Guid.Empty)
            {
                var result = await _courierService.GetCouriersByMerchantAsync(merchantId.Value, isAvailable, cancellationToken);
                return CreateActionResult(result);
            }

            var allResult = await _courierService.GetAllCouriersAsync(cancellationToken);
            return CreateActionResult(allResult);
        }

        // Standart işletme sadece kendi kuryelerini listeleyebilir (Tenant İzolasyonu)
        var ownMerchantId = GetMerchantId();
        var ownResult = await _courierService.GetCouriersByMerchantAsync(ownMerchantId, isAvailable, cancellationToken);
        return CreateActionResult(ownResult);
    }

    /// <summary>
    /// Yeni bir kurye oluşturur. (Yalnızca işletme sahibi veya kurye firması)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = KuryeSistemi.Application.Common.Constants.AppRoles.MerchantAndFirmRoles)]
    [ProducesResponseType(typeof(CourierDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromBody] CreateCourierRequestDto request,
        CancellationToken cancellationToken)
    {
        var effectiveMerchantId = IsFirmOrAdmin() && request.MerchantId != Guid.Empty
            ? request.MerchantId
            : GetMerchantId();

        var secureRequest = request with { MerchantId = effectiveMerchantId };
        var result = await _courierService.CreateCourierAsync(secureRequest, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Belirtilen kurye bilgilerini günceller (Sahiplik ve rol kontrolü zorunludur).
    /// </summary>
    [HttpPut("{courierId:guid}")]
    [Authorize(Roles = KuryeSistemi.Application.Common.Constants.AppRoles.MerchantAndFirmRoles)]
    [ProducesResponseType(typeof(CourierDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        Guid courierId,
        [FromBody] UpdateCourierRequestDto request,
        CancellationToken cancellationToken)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return NotFound(new { message = $"Kurye bulunamadı: {courierId}" });

        if (!IsFirmOrAdmin() && courier.MerchantId != GetMerchantId())
            return Forbid();

        // Standart işletmeler kuryenin MerchantId'sini başka işletmeye aktaramaz (Tenant Koruma)
        var secureRequest = request;
        if (!IsFirmOrAdmin() || !request.MerchantId.HasValue || request.MerchantId.Value == Guid.Empty)
        {
            secureRequest = request with { MerchantId = courier.MerchantId };
        }

        var result = await _courierService.UpdateCourierAsync(courierId, secureRequest, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Belirtilen kuryeyi siler (Yalnızca kuryenin bağlı olduğu işletme veya kurye firması).
    /// </summary>
    [HttpDelete("{courierId:guid}")]
    [Authorize(Roles = KuryeSistemi.Application.Common.Constants.AppRoles.MerchantAndFirmRoles)]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        Guid courierId,
        CancellationToken cancellationToken)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return NotFound(new { message = $"Kurye bulunamadı: {courierId}" });

        if (!IsFirmOrAdmin() && courier.MerchantId != GetMerchantId())
            return Forbid();

        var result = await _courierService.DeleteCourierAsync(courierId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Belirtilen kuryenin bugünkü teslimatlarını ve toplam kazancını getirir.
    /// </summary>
    [HttpGet("{courierId:guid}/earnings/today")]
    [ProducesResponseType(typeof(KuryeSistemi.Application.DTOs.Wallet.CourierEarningsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTodayEarnings(
        Guid courierId,
        CancellationToken cancellationToken)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return NotFound(new { message = $"Kurye bulunamadı: {courierId}" });

        var callerCourierId = GetCourierId();
        if (callerCourierId.HasValue && callerCourierId.Value != courierId)
            return Forbid();

        if (!callerCourierId.HasValue && !IsFirmOrAdmin() && courier.MerchantId != GetMerchantId())
            return Forbid();

        var result = await _courierService.GetTodayEarningsAsync(courierId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Oturum açmış kuryenin bugünkü teslimatlarını ve toplam kazancını getirir (JWT Claim üzerinden).
    /// </summary>
    [HttpGet("earnings/today")]
    [ProducesResponseType(typeof(KuryeSistemi.Application.DTOs.Wallet.CourierEarningsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentCourierTodayEarnings(CancellationToken cancellationToken)
    {
        var courierId = GetCourierId();
        if (!courierId.HasValue || courierId.Value == Guid.Empty)
            return Unauthorized(new { message = "Kurye kimliği token içinde bulunamadı." });

        var result = await _courierService.GetTodayEarningsAsync(courierId.Value, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Oturum açmış kuryenin belirtilen tarih aralığındaki teslimatlarını ve kazancını getirir.
    /// </summary>
    [HttpGet("me/earnings/history")]
    [ProducesResponseType(typeof(KuryeSistemi.Application.DTOs.Wallet.CourierEarningsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetCurrentCourierEarningsHistory(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        CancellationToken cancellationToken)
    {
        var courierId = GetCourierId();
        if (!courierId.HasValue || courierId.Value == Guid.Empty)
            return Unauthorized(new { message = "Kurye kimliği token içinde bulunamadı." });

        var result = await _courierService.GetEarningsByDateRangeAsync(courierId.Value, startDate, endDate, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Belirtilen kuryenin tarih aralığındaki teslimatlarını ve kazancını getirir.
    /// </summary>
    [HttpGet("{courierId:guid}/earnings/history")]
    [ProducesResponseType(typeof(KuryeSistemi.Application.DTOs.Wallet.CourierEarningsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEarningsHistory(
        Guid courierId,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        CancellationToken cancellationToken)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return NotFound(new { message = $"Kurye bulunamadı: {courierId}" });

        var callerCourierId = GetCourierId();
        if (callerCourierId.HasValue && callerCourierId.Value != courierId)
            return Forbid();

        if (!callerCourierId.HasValue && !IsFirmOrAdmin() && courier.MerchantId != GetMerchantId())
            return Forbid();

        var result = await _courierService.GetEarningsByDateRangeAsync(courierId, startDate, endDate, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Oturum açmış kuryenin profil, araç ve güncel kasa/mahsuplaşma bakiyesini getirir.
    /// </summary>
    [HttpGet("me/profile")]
    [ProducesResponseType(typeof(CourierProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentCourierProfile(CancellationToken cancellationToken)
    {
        var courierId = GetCourierId();
        if (!courierId.HasValue || courierId.Value == Guid.Empty)
        {
            var email = GetUserEmail();
            if (!string.IsNullOrEmpty(email))
            {
                var courier = await _courierRepository.GetByEmailAsync(email);
                if (courier != null) courierId = courier.Id;
            }
        }

        if (!courierId.HasValue || courierId.Value == Guid.Empty)
            return Unauthorized(new { message = "Kurye kimliği token içinde bulunamadı." });

        var result = await _courierService.GetProfileAsync(courierId.Value, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Belirtilen kuryenin profil ve kasa bilgilerini getirir.
    /// </summary>
    [HttpGet("{courierId:guid}/profile")]
    [ProducesResponseType(typeof(CourierProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfile(
        Guid courierId,
        CancellationToken cancellationToken)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return NotFound(new { message = $"Kurye bulunamadı: {courierId}" });

        var callerCourierId = GetCourierId();
        if (callerCourierId.HasValue && callerCourierId.Value != courierId)
            return Forbid();

        if (!callerCourierId.HasValue && !IsFirmOrAdmin() && courier.MerchantId != GetMerchantId())
            return Forbid();

        var result = await _courierService.GetProfileAsync(courierId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Oturum açmış kuryenin mesai durumunu (IsOnline / IsAvailable) günceller.
    /// </summary>
    [HttpPost("me/shift")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleMyShift(
        [FromBody] ToggleShiftRequest request,
        CancellationToken cancellationToken)
    {
        var courierId = GetCourierId();
        if (!courierId.HasValue || courierId.Value == Guid.Empty)
        {
            var email = GetUserEmail();
            if (!string.IsNullOrEmpty(email))
            {
                var courier = await _courierRepository.GetByEmailAsync(email);
                if (courier != null) courierId = courier.Id;
            }
        }

        if (!courierId.HasValue || courierId.Value == Guid.Empty)
            return Unauthorized(new { message = "Kurye kimliği token içinde bulunamadı. Lütfen kurye hesabınızla giriş yapın." });

        var result = await _courierService.ToggleShiftAsync(courierId.Value, request.IsOnline, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// İşletme veya Firma yöneticisinin bir kuryenin mesai durumunu değiştirmesini sağlar.
    /// </summary>
    [HttpPost("{courierId:guid}/shift")]
    [Authorize(Roles = KuryeSistemi.Application.Common.Constants.AppRoles.MerchantAndFirmRoles)]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleCourierShift(
        Guid courierId,
        [FromBody] ToggleShiftRequest request,
        CancellationToken cancellationToken)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return NotFound(new { message = $"Kurye bulunamadı: {courierId}" });

        if (!IsFirmOrAdmin() && courier.MerchantId != GetMerchantId())
            return Forbid();

        var result = await _courierService.ToggleShiftAsync(courierId, request.IsOnline, cancellationToken);
        return CreateActionResult(result);
    }
}
