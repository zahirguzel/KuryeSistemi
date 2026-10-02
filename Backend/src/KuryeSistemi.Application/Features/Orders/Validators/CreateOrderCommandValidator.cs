using FluentValidation;
using KuryeSistemi.Application.Features.Orders.Commands.CreateOrder;

namespace KuryeSistemi.Application.Features.Orders.Validators;

/// <summary>
/// CreateOrderCommand için FluentValidation kuralları.
/// Koordinat değerleri coğrafi sınırlar içinde doğrulanır.
/// </summary>
public sealed class CreateOrderCommandValidator
    : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.MerchantId)
            .NotEmpty().WithMessage("MerchantId zorunludur.");

        // -----------------------------------------------------------------------
        // Alım Adresi
        // -----------------------------------------------------------------------
        RuleFor(x => x.PickupAddressLine)
            .NotEmpty().WithMessage("Alım adresi boş olamaz.")
            .MaximumLength(500).WithMessage("Alım adresi en fazla 500 karakter olabilir.");

        RuleFor(x => x.PickupDistrict)
            .NotEmpty().WithMessage("Alım ilçesi boş olamaz.")
            .MaximumLength(100).WithMessage("Alım ilçesi en fazla 100 karakter olabilir.");

        RuleFor(x => x.PickupCity)
            .NotEmpty().WithMessage("Alım şehri boş olamaz.")
            .MaximumLength(100).WithMessage("Alım şehri en fazla 100 karakter olabilir.");

        RuleFor(x => x.PickupLatitude)
            .InclusiveBetween(-90m, 90m)
                .WithMessage("Alım enlem değeri -90 ile 90 arasında olmalıdır.");

        RuleFor(x => x.PickupLongitude)
            .InclusiveBetween(-180m, 180m)
                .WithMessage("Alım boylam değeri -180 ile 180 arasında olmalıdır.");

        // -----------------------------------------------------------------------
        // Teslim Adresi
        // -----------------------------------------------------------------------
        RuleFor(x => x.DeliveryAddressLine)
            .NotEmpty().WithMessage("Teslim adresi boş olamaz.")
            .MaximumLength(500).WithMessage("Teslim adresi en fazla 500 karakter olabilir.");

        RuleFor(x => x.DeliveryDistrict)
            .NotEmpty().WithMessage("Teslim ilçesi boş olamaz.")
            .MaximumLength(100).WithMessage("Teslim ilçesi en fazla 100 karakter olabilir.");

        RuleFor(x => x.DeliveryCity)
            .NotEmpty().WithMessage("Teslim şehri boş olamaz.")
            .MaximumLength(100).WithMessage("Teslim şehri en fazla 100 karakter olabilir.");

        RuleFor(x => x.DeliveryLatitude)
            .InclusiveBetween(-90m, 90m)
                .WithMessage("Teslim enlem değeri -90 ile 90 arasında olmalıdır.");

        RuleFor(x => x.DeliveryLongitude)
            .InclusiveBetween(-180m, 180m)
                .WithMessage("Teslim boylam değeri -180 ile 180 arasında olmalıdır.");

        // -----------------------------------------------------------------------
        // Alıcı Bilgileri
        // -----------------------------------------------------------------------
        RuleFor(x => x.RecipientName)
            .NotEmpty().WithMessage("Alıcı adı boş olamaz.")
            .MaximumLength(150).WithMessage("Alıcı adı en fazla 150 karakter olabilir.");

        RuleFor(x => x.RecipientPhone)
            .NotEmpty().WithMessage("Alıcı telefon numarası boş olamaz.")
            .Matches(@"^\+?[1-9]\d{6,14}$")
                .WithMessage("Geçerli bir alıcı telefon numarası giriniz. (Örn: +905559998877)");

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Not en fazla 1000 karakter olabilir.")
            .When(x => x.Notes is not null);

        // -----------------------------------------------------------------------
        // Ödeme Yöntemi & Tutar Doğrulaması (Mahsuplaşma Güvenliği)
        // -----------------------------------------------------------------------
        RuleFor(x => x.TotalOrderAmount)
            .GreaterThan(0)
            .WithMessage("Nakit (Cash) veya Kapıda Kart ile ödeme yöntemlerinde sipariş toplam tutarı 0'dan büyük olmalıdır.")
            .When(x => x.PaymentMethod != KuryeSistemi.Domain.Enums.PaymentMethod.Online);
    }
}
