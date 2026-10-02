// Validators/CreateOrderRequestDtoValidator.cs

using FluentValidation;
using KuryeSistemi.Application.DTOs.Orders;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.Validators;

/// <summary>
/// Hızlı Sipariş Formu (POS) API istekleri için FluentValidation kuralları.
/// </summary>
public sealed class CreateOrderRequestDtoValidator : AbstractValidator<CreateOrderRequestDto>
{
    public CreateOrderRequestDtoValidator()
    {
        RuleFor(x => x.DeliveryAddressLine)
            .NotEmpty().WithMessage("Teslimat adresi boş olamaz.")
            .MaximumLength(500).WithMessage("Teslimat adresi en fazla 500 karakter olabilir.");

        RuleFor(x => x.RecipientName)
            .NotEmpty().WithMessage("Alıcı adı boş olamaz.")
            .MaximumLength(150).WithMessage("Alıcı adı en fazla 150 karakter olabilir.");

        RuleFor(x => x.RecipientPhone)
            .NotEmpty().WithMessage("Alıcı telefon numarası boş olamaz.")
            .Matches(@"^\+?[0-9\s\-()]{7,20}$")
            .WithMessage("Geçerli bir alıcı telefon numarası giriniz.");

        RuleFor(x => x.TotalOrderAmount)
            .GreaterThan(0)
            .WithMessage("Nakit (Cash) veya Kapıda Kredi Kartı ile ödeme yöntemlerinde sipariş toplam tutarı 0'dan büyük olmalıdır.")
            .When(x => x.PaymentMethod == PaymentMethod.Cash || x.PaymentMethod == PaymentMethod.CreditCardOnDelivery);
    }
}
