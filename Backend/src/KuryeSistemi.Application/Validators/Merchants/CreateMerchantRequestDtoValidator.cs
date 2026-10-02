using FluentValidation;
using KuryeSistemi.Application.DTOs.Merchants;

namespace KuryeSistemi.Application.Validators.Merchants;

/// <summary>
/// CreateMerchantRequestDto için FluentValidation kuralları.
/// </summary>
public sealed class CreateMerchantRequestDtoValidator : AbstractValidator<CreateMerchantRequestDto>
{
    public CreateMerchantRequestDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("İşletme adı boş olamaz.")
            .MaximumLength(200).WithMessage("İşletme adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.")
            .MaximumLength(150).WithMessage("E-posta en fazla 150 karakter olabilir.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre boş olamaz.")
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.")
            .MaximumLength(100).WithMessage("Şifre en fazla 100 karakter olabilir.");

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(20).WithMessage("Telefon numarası en fazla 20 karakter olabilir.")
            .Matches(@"^\+?[0-9\s\-()]{7,20}$")
            .WithMessage("Geçerli bir telefon numarası giriniz.")
            .When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber));

        RuleFor(x => x.Address)
            .MaximumLength(500).WithMessage("Adres en fazla 500 karakter olabilir.")
            .When(x => !string.IsNullOrWhiteSpace(x.Address));

        RuleFor(x => x.CourierCompanyId)
            .Must(id => !id.HasValue || id.Value != Guid.Empty)
            .WithMessage("Geçersiz CourierCompanyId.");
    }
}
