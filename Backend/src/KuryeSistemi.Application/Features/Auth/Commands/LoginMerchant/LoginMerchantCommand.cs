using KuryeSistemi.Application.Features.Auth.DTOs;
using MediatR;

namespace KuryeSistemi.Application.Features.Auth.Commands.LoginMerchant;

/// <summary>
/// İşletme giriş komutu.
/// Email + Password → JWT Token döner.
/// </summary>
public sealed record LoginMerchantCommand(
    string Email,
    string Password
) : IRequest<AuthTokenDto>;
