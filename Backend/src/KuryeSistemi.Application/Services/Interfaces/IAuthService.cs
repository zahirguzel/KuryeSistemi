// Services/Interfaces/IAuthService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Auth;
using KuryeSistemi.Application.Features.Auth.DTOs;

namespace KuryeSistemi.Application.Services.Interfaces;

public interface IAuthService
{
    Task<ServiceResult<AuthTokenDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
    Task<ServiceResult> ChangePasswordAsync(Guid userId, ChangePasswordRequestDto request, CancellationToken cancellationToken = default);
}
