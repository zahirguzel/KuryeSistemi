using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Company;

namespace KuryeSistemi.Application.Services.Interfaces;

/// <summary>
/// Kurye firması paneli işlemleri (firma bilgisi, alt kullanıcılar). Yetki (izin matrisi) kontrolü
/// controller'da yapılır; servis yalnızca verilen firma kapsamında çalışır.
/// </summary>
public interface ICompanyService
{
    Task<ServiceResult<MyCompanyDto>> GetCompanyAsync(Guid companyId, CancellationToken ct = default);
    Task<ServiceResult<IReadOnlyList<CompanyUserDto>>> GetUsersAsync(Guid companyId, CancellationToken ct = default);
    Task<ServiceResult<CompanyUserCreatedDto>> CreateUserAsync(Guid companyId, CreateCompanyUserRequest request, string actor, CancellationToken ct = default);
    Task<ServiceResult> UpdateUserPermissionsAsync(Guid companyId, Guid userId, UpdatePermissionsRequest request, string actor, CancellationToken ct = default);
    Task<ServiceResult> ToggleUserActiveAsync(Guid companyId, Guid userId, string actor, CancellationToken ct = default);
}
