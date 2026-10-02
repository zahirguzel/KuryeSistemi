using FluentValidation;
using KuryeSistemi.Application.Features.Auth.Commands.LoginMerchant;

namespace KuryeSistemi.Application.Features.Auth.Validators;

public sealed class LoginMerchantCommandValidator
    : AbstractValidator<LoginMerchantCommand>
{
    public LoginMerchantCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre boş olamaz.")
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.");
    }
}
