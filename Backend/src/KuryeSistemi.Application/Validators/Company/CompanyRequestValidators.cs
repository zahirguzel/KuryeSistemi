using FluentValidation;
using KuryeSistemi.Application.DTOs.Company;

namespace KuryeSistemi.Application.Validators.Company;

/// <summary>Kontör alanı int olduğundan taşmayı önleyen üst sınır.</summary>
public static class CompanyCreditLimits
{
    public const int MaxAmount = 10_000_000;
}

public sealed class CreateCompanyRequestValidator : AbstractValidator<CreateCompanyRequest>
{
    public CreateCompanyRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Firma adı zorunludur.")
            .MaximumLength(200).WithMessage("Firma adı en fazla 200 karakter olabilir.");
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-posta zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta giriniz.")
            .MaximumLength(255);
        RuleFor(x => x.PhoneNumber).MaximumLength(30).When(x => x.PhoneNumber is not null);
        RuleFor(x => x.Address).MaximumLength(500).When(x => x.Address is not null);
        RuleFor(x => x.TaxNumber).MaximumLength(30).When(x => x.TaxNumber is not null);
        RuleFor(x => x.InitialCredit).InclusiveBetween(0, CompanyCreditLimits.MaxAmount)
            .WithMessage("Açılış kontörü 0 ile 10.000.000 arasında olmalıdır.");
        RuleFor(x => x.WarningThreshold).GreaterThanOrEqualTo(0)
            .WithMessage("Uyarı eşiği negatif olamaz.");
    }
}

public sealed class UpdateCompanyRequestValidator : AbstractValidator<UpdateCompanyRequest>
{
    public UpdateCompanyRequestValidator()
    {
        RuleFor(x => x.Name).MaximumLength(200).When(x => x.Name is not null);
        RuleFor(x => x.PhoneNumber).MaximumLength(30).When(x => x.PhoneNumber is not null);
        RuleFor(x => x.Address).MaximumLength(500).When(x => x.Address is not null);
        RuleFor(x => x.TaxNumber).MaximumLength(30).When(x => x.TaxNumber is not null);
        RuleFor(x => x.LogoUrl).MaximumLength(500).When(x => x.LogoUrl is not null);
        RuleFor(x => x.WarningThreshold).GreaterThanOrEqualTo(0).When(x => x.WarningThreshold.HasValue)
            .WithMessage("Uyarı eşiği negatif olamaz.");
    }
}

public sealed class CreditTopUpRequestValidator : AbstractValidator<CreditTopUpRequest>
{
    public CreditTopUpRequestValidator()
    {
        RuleFor(x => x.Amount).InclusiveBetween(1, CompanyCreditLimits.MaxAmount)
            .WithMessage("Yüklenecek kontör miktarı 1 ile 10.000.000 arasında olmalıdır.");
        RuleFor(x => x.ReferenceNumber).MaximumLength(100).When(x => x.ReferenceNumber is not null);
        RuleFor(x => x.Notes).MaximumLength(500).When(x => x.Notes is not null);
    }
}

public sealed class CreditAdjustRequestValidator : AbstractValidator<CreditAdjustRequest>
{
    public CreditAdjustRequestValidator()
    {
        RuleFor(x => x.Amount).NotEqual(0).WithMessage("Düzeltme miktarı 0 olamaz.")
            .InclusiveBetween(-CompanyCreditLimits.MaxAmount, CompanyCreditLimits.MaxAmount)
            .WithMessage("Düzeltme miktarı ±10.000.000 aralığında olmalıdır.");
        RuleFor(x => x.Reason).NotEmpty().WithMessage("Düzeltme gerekçesi zorunludur.")
            .MaximumLength(500);
    }
}

public sealed class CreateAdminRequestValidator : AbstractValidator<CreateAdminRequest>
{
    public CreateAdminRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Ad soyad zorunludur.").MaximumLength(200);
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-posta zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta giriniz.").MaximumLength(255);
        RuleFor(x => x.Password).NotEmpty().WithMessage("Şifre zorunludur.")
            .MinimumLength(8).WithMessage("Admin şifresi en az 8 karakter olmalıdır.").MaximumLength(128);
    }
}

public sealed class CreateCompanyUserRequestValidator : AbstractValidator<CreateCompanyUserRequest>
{
    public CreateCompanyUserRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().WithMessage("Ad zorunludur.").MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().WithMessage("Soyad zorunludur.").MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-posta zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta giriniz.").MaximumLength(255);
        RuleFor(x => x.Password).NotEmpty().WithMessage("Şifre zorunludur.")
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.").MaximumLength(128);
        RuleFor(x => x.PhoneNumber).MaximumLength(30).When(x => x.PhoneNumber is not null);
        RuleFor(x => x.Role).IsInEnum().WithMessage("Geçersiz kullanıcı rolü.");
    }
}
