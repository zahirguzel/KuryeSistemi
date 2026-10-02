using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.DTOs.Company;

// Firma yönetimi (AdminController / CompanyController) istek modelleri.
// Doğrulama: Application/Validators/Company/CompanyRequestValidators.cs


public record CreateCompanyRequest(
    string Name,
    string Email,
    string? PhoneNumber,
    string? Address,
    string? TaxNumber,
    int InitialCredit = 0,
    int WarningThreshold = 100,
    bool BlockOnZeroCredit = true);

public record UpdateCompanyRequest(
    string? Name,
    string? PhoneNumber,
    string? Address,
    string? TaxNumber,
    int? WarningThreshold,
    bool? BlockOnZeroCredit,
    string? LogoUrl);

public record CreditTopUpRequest(int Amount, string? ReferenceNumber, string? Notes);
public record CreditAdjustRequest(int Amount, string? Reason);
public record CreateAdminRequest(string FullName, string Email, string Password);

public record CreateCompanyUserRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string? PhoneNumber,
    CompanyUserRole Role = CompanyUserRole.Operator,
    bool? CanViewReports = null,
    bool? CanManageFinance = null,
    bool? CanManageCouriers = null,
    bool? CanManageOrders = null,
    bool? CanManageMerchants = null,
    bool? CanEditCompanySettings = null);

public record UpdatePermissionsRequest(
    bool? CanViewReports,
    bool? CanManageFinance,
    bool? CanManageCouriers,
    bool? CanManageOrders,
    bool? CanManageMerchants,
    bool? CanEditCompanySettings);
