using FluentValidation;
using KuryeSistemi.Application.DTOs.Couriers;

namespace KuryeSistemi.Application.Validators.Couriers;

public sealed class SosRequestValidator : AbstractValidator<SosRequest>
{
    public SosRequestValidator()
    {
        RuleFor(x => x.Note).MaximumLength(300).WithMessage("Not en fazla 300 karakter olabilir.");
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90).When(x => x.Latitude.HasValue)
            .WithMessage("Geçersiz enlem.");
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180).When(x => x.Longitude.HasValue)
            .WithMessage("Geçersiz boylam.");
    }
}
