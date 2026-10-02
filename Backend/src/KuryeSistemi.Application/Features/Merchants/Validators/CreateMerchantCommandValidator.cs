using FluentValidation;
using KuryeSistemi.Application.Features.Merchants.Commands.CreateMerchant;

namespace KuryeSistemi.Application.Features.Merchants.Validators;

/// <summary>
/// CreateMerchantCommand için FluentValidation kuralları.
/// Handler'a ulaşmadan önce ValidationBehavior tarafından otomatik çalıştırılır.
/// </summary>
public sealed class CreateMerchantCommandValidator
    : AbstractValidator<CreateMerchantCommand>
{
    public CreateMerchantCommandValidator()
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
            .NotEmpty().WithMessage("Telefon numarası boş olamaz.")
            .MaximumLength(20).WithMessage("Telefon numarası en fazla 20 karakter olabilir.")
            .Matches(@"^\+?[1-9]\d{6,14}$")
                .WithMessage("Geçerli bir telefon numarası giriniz. (Örn: +905551234567)");

        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Adres boş olamaz.")
            .MaximumLength(500).WithMessage("Adres en fazla 500 karakter olabilir.");
    }
}
