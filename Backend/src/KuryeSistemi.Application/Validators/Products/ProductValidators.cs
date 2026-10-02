using FluentValidation;
using KuryeSistemi.Application.DTOs.Products;

namespace KuryeSistemi.Application.Validators.Products;

public sealed class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün adı boş olamaz.")
            .MaximumLength(200).WithMessage("Ürün adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Kategori boş olamaz.")
            .MaximumLength(100).WithMessage("Kategori en fazla 100 karakter olabilir.");

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Ürün fiyatı 0 veya daha büyük olmalıdır.");

        RuleFor(x => x.DisplayOrder)
            .GreaterThanOrEqualTo(0).WithMessage("Sıralama değeri negatif olamaz.");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Açıklama en fazla 1000 karakter olabilir.")
            .When(x => !string.IsNullOrEmpty(x.Description));
    }
}

public sealed class UpdateProductRequestValidator : AbstractValidator<UpdateProductRequest>
{
    public UpdateProductRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün adı boş olamaz.")
            .MaximumLength(200).WithMessage("Ürün adı en fazla 200 karakter olabilir.")
            .When(x => x.Name != null);

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Kategori boş olamaz.")
            .MaximumLength(100).WithMessage("Kategori en fazla 100 karakter olabilir.")
            .When(x => x.Category != null);

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Ürün fiyatı 0 veya daha büyük olmalıdır.")
            .When(x => x.Price.HasValue);

        RuleFor(x => x.DisplayOrder)
            .GreaterThanOrEqualTo(0).WithMessage("Sıralama değeri negatif olamaz.")
            .When(x => x.DisplayOrder.HasValue);

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Açıklama en fazla 1000 karakter olabilir.")
            .When(x => !string.IsNullOrEmpty(x.Description));
    }
}
