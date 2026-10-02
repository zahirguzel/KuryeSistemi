// Controllers/Auth/AuthController.cs

using KuryeSistemi.Application.DTOs.Auth;
using KuryeSistemi.Application.Features.Auth.DTOs;
using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace KuryeSistemi.API.Controllers.Auth;

[Produces("application/json")]
public sealed class AuthController : BaseController
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// İşletme veya Kurye girişi. Başarılı girişte JWT token döner.
    /// Kaba kuvvet (brute-force) saldırılarına karşı rate limit ile korunur.
    /// </summary>
    [HttpPost("login")]
    [EnableRateLimiting("login-policy")]
    [ProducesResponseType(typeof(AuthTokenDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Oturum açmış kullanıcının (İşletme/Firma/Kurye) şifresini değiştirir.
    /// </summary>
    [Authorize]
    [HttpPost("change-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequestDto request,
        CancellationToken cancellationToken)
    {
        var courierId = GetCourierId();
        var userId = (courierId.HasValue && courierId.Value != Guid.Empty) 
            ? courierId.Value 
            : GetMerchantId();

        var result = await _authService.ChangePasswordAsync(userId, request, cancellationToken);
        return CreateActionResult(result);
    }
}
