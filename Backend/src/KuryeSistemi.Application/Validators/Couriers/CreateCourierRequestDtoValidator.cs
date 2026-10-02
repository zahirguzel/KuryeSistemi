using FluentValidation;
using KuryeSistemi.Application.DTOs.Couriers;

namespace KuryeSistemi.Application.Validators.Couriers;

/// <summary>
/// CreateCourierRequestDto için FluentValidation kuralları.
/// </summary>
public sealed class CreateCourierRequestDtoValidator : AbstractValidator<CreateCourierRequestDto>
{
    public CreateCourierRequestDtoValidator()
    {
        RuleFor(x => x.MerchantId)
            .Must(id => !id.HasValue || id.Value != Guid.Empty)
            .WithMessage("Geçersiz MerchantId.");

        RuleFor(x => x.CourierCompanyId)
            .Must(id => !id.HasValue || id.Value != Guid.Empty)
            .WithMessage("Geçersiz CourierCompanyId.");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Ad boş olamaz.")
            .MaximumLength(100).WithMessage("Ad en fazla 100 karakter olabilir.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Soyad boş olamaz.")
            .MaximumLength(100).WithMessage("Soyad en fazla 100 karakter olabilir.");

        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Telefon numarası boş olamaz.")
            .Matches(@"^\+?[0-9\s\-()]{7,20}$")
            .WithMessage("Geçerli bir telefon numarası giriniz.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.")
            .MaximumLength(150).WithMessage("E-posta en fazla 150 karakter olabilir.");

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
