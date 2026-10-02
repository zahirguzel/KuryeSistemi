using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Company;

namespace KuryeSistemi.Application.Services.Interfaces;

/// <summary>SuperAdmin işlemleri: kurye firmaları ve admin hesapları (kontör işlemleri ICreditService'tedir).</summary>
public interface ICompanyAdminService
{
    Task<ServiceResult<IReadOnlyList<CompanyListItemDto>>> GetCompaniesAsync(CancellationToken ct = default);
    Task<ServiceResult<CompanyDetailDto>> GetCompanyAsync(Guid id, CancellationToken ct = default);
    Task<ServiceResult<CompanyCreatedDto>> CreateCompanyAsync(CreateCompanyRequest request, string actor, CancellationToken ct = default);
    Task<ServiceResult> UpdateCompanyAsync(Guid id, UpdateCompanyRequest request, string actor, CancellationToken ct = default);
    Task<ServiceResult> ToggleCompanyActiveAsync(Guid id, string actor, CancellationToken ct = default);

    Task<ServiceResult<IReadOnlyList<AdminUserDto>>> GetAdminsAsync(CancellationToken ct = default);
    Task<ServiceResult<AdminCreatedDto>> CreateAdminAsync(CreateAdminRequest request, string actor, CancellationToken ct = default);
}
