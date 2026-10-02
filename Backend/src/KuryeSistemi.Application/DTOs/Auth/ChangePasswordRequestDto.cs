// DTOs/Auth/ChangePasswordRequestDto.cs

namespace KuryeSistemi.Application.DTOs.Auth;

public record ChangePasswordRequestDto(
    string CurrentPassword,
    string NewPassword
);
