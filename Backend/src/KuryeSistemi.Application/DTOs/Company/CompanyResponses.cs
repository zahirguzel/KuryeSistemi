using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.DTOs.Company;

// Firma / Admin yönetimi yanıt modelleri. JSON alan adları önceki anonim yanıtlarla aynıdır (istemci uyumu).

public sealed record CompanyListItemDto(
    Guid Id, string Name, string Email, string PhoneNumber,
    int CreditBalance, int CreditWarningThreshold,
    bool IsActive, bool BlockOnZeroCredit,
    int MerchantCount, int UserCount, DateTime CreatedAt);

public sealed record CompanyMerchantItemDto(Guid Id, string Name, string Email, bool IsActive);

public sealed record CompanyUserSummaryDto(
    Guid Id, string FirstName, string LastName, string Email, CompanyUserRole Role, bool IsActive);

public sealed record CompanyDetailDto(
    Guid Id, string Name, string Email, string PhoneNumber, string Address, string? TaxNumber,
    int CreditBalance, int CreditWarningThreshold, bool IsActive, bool BlockOnZeroCredit,
    string? LogoUrl, DateTime CreatedAt,
    IReadOnlyList<CompanyMerchantItemDto> Merchants,
    IReadOnlyList<CompanyUserSummaryDto> Users);

public sealed record CompanyCreatedDto(Guid Id, string Name);

/// <summary>Giriş yapmış firmanın kendi özeti. IsLowCredit: bakiye uyarı eşiğinin altındaysa true.</summary>
public sealed record MyCompanyDto(
    Guid Id, string Name, string Email, string PhoneNumber,
    int CreditBalance, int CreditWarningThreshold,
    bool IsActive, bool BlockOnZeroCredit, string? LogoUrl, bool IsLowCredit);

public sealed record CompanyUserPermissionsDto(
    bool ViewReports, bool ManageFinance, bool ManageCouriers,
    bool ManageOrders, bool ManageMerchants, bool EditSettings);

public sealed record CompanyUserDto(
    Guid Id, string FirstName, string LastName, string Email, string PhoneNumber,
    CompanyUserRole Role, bool IsActive, DateTime? LastLoginAt,
    CompanyUserPermissionsDto Permissions);

public sealed record CompanyUserCreatedDto(Guid Id, string Email, CompanyUserRole Role);

public sealed record CreditBalanceDto(int CreditBalance);

public sealed record CreditTransactionDto(
    Guid Id, CreditTransactionType Type, int Amount, int BalanceAfter,
    string? ReferenceNumber, string? Notes, Guid? OrderId, DateTime CreatedAt, string CreatedBy);

public sealed record AdminUserDto(
    Guid Id, string FullName, string Email, bool IsActive, DateTime? LastLoginAt, DateTime CreatedAt);

public sealed record AdminCreatedDto(Guid Id, string Email);
