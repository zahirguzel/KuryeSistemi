using FluentValidation;
using KuryeSistemi.Application.Features.Couriers.Commands.CreateCourier;

namespace KuryeSistemi.Application.Features.Couriers.Validators;

/// <summary>
/// CreateCourierCommand için FluentValidation kuralları.
/// </summary>
public sealed class CreateCourierCommandValidator
    : AbstractValidator<CreateCourierCommand>
{
    public CreateCourierCommandValidator()
    {
        RuleFor(x => x.MerchantId)
            .NotEmpty().WithMessage("MerchantId zorunludur.");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Ad boş olamaz.")
            .MaximumLength(100).WithMessage("Ad en fazla 100 karakter olabilir.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Soyad boş olamaz.")
            .MaximumLength(100).WithMessage("Soyad en fazla 100 karakter olabilir.");

        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Telefon numarası boş olamaz.")
            .Matches(@"^\+?[1-9]\d{6,14}$")
                .WithMessage("Geçerli bir telefon numarası giriniz. (Örn: +905551112233)");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        RuleFor(x => x.LicensePlate)
            .NotEmpty().WithMessage("Araç plakası boş olamaz.")
            .MaximumLength(20).WithMessage("Plaka en fazla 20 karakter olabilir.");

        RuleFor(x => x.VehicleBrand)
            .NotEmpty().WithMessage("Araç markası boş olamaz.")
            .MaximumLength(100).WithMessage("Araç markası en fazla 100 karakter olabilir.");

        RuleFor(x => x.VehicleModel)
            .NotEmpty().WithMessage("Araç modeli boş olamaz.")
            .MaximumLength(100).WithMessage("Araç modeli en fazla 100 karakter olabilir.");
    }
}
