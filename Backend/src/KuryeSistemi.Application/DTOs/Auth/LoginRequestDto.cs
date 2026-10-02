// DTOs/Auth/LoginRequestDto.cs

namespace KuryeSistemi.Application.DTOs.Auth;

public sealed record LoginRequestDto(string Email, string Password);
