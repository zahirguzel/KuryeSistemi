using FluentAssertions;
using KuryeSistemi.Application.DTOs.Auth;
using KuryeSistemi.Application.DTOs.Couriers;
using KuryeSistemi.Application.DTOs.Merchants;
using KuryeSistemi.Application.DTOs.Orders;
using KuryeSistemi.Application.DTOs.Products;
using KuryeSistemi.Application.Validators;
using KuryeSistemi.Application.Validators.Auth;
using KuryeSistemi.Application.Validators.Couriers;
using KuryeSistemi.Application.Validators.Merchants;
using KuryeSistemi.Application.Validators.Products;
using KuryeSistemi.Domain.Enums;
using Xunit;

namespace KuryeSistemi.Tests.Validators;

public class ValidatorTests
{
    // =========================================================================
    // 1. LoginRequestDtoValidator
    // =========================================================================
    [Fact]
    public void LoginValidator_WithValidCredentials_ShouldPass()
    {
        var validator = new LoginRequestDtoValidator();
        var model = new LoginRequestDto("test@example.com", "Password123*");

        var result = validator.Validate(model);

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("", "Password123*")]
    [InlineData("not-an-email", "Password123*")]
    [InlineData("valid@email.com", "123")] // Short password
    public void LoginValidator_WithInvalidCredentials_ShouldFail(string email, string password)
    {
        var validator = new LoginRequestDtoValidator();
        var model = new LoginRequestDto(email, password);

        var result = validator.Validate(model);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
    }

    // =========================================================================
    // 2. CreateCourierRequestDtoValidator
    // =========================================================================
    [Fact]
    public void CreateCourierValidator_WithValidData_ShouldPass()
    {
        var validator = new CreateCourierRequestDtoValidator();
        var model = new CreateCourierRequestDto(
            MerchantId: null,
            FirstName: "Ahmet",
            LastName: "Yılmaz",
            PhoneNumber: "+905551112233",
            Email: "ahmet@kurye.com",
            VehicleType: VehicleType.Motorcycle,
            LicensePlate: "31ABC123",
            VehicleBrand: "Honda",
            VehicleModel: "Activa",
            Password: "Password123*",
            CourierCompanyId: Guid.NewGuid()
        );

        var result = validator.Validate(model);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateCourierValidator_WithMissingFields_ShouldFail()
    {
        var validator = new CreateCourierRequestDtoValidator();
        var model = new CreateCourierRequestDto(
            FirstName: "",
            LastName: "",
            PhoneNumber: "invalid-phone",
            Email: "bad-email",
            LicensePlate: "",
            VehicleBrand: "",
            VehicleModel: ""
        );

        var result = validator.Validate(model);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateCourierRequestDto.FirstName));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateCourierRequestDto.LastName));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateCourierRequestDto.PhoneNumber));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateCourierRequestDto.Email));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateCourierRequestDto.LicensePlate));
    }

    // =========================================================================
    // 3. CreateMerchantRequestDtoValidator
    // =========================================================================
    [Fact]
    public void CreateMerchantValidator_WithValidData_ShouldPass()
    {
        var validator = new CreateMerchantRequestDtoValidator();
        var model = new CreateMerchantRequestDto(
            Name: "Lezzet Döner",
            Email: "lezzet@doner.com",
            Password: "Password123*",
            PhoneNumber: "+905559998877",
            Address: "Çarşı Cad. No:5"
        );

        var result = validator.Validate(model);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateMerchantValidator_WithMissingRequiredFields_ShouldFail()
    {
        var validator = new CreateMerchantRequestDtoValidator();
        var model = new CreateMerchantRequestDto(
            Name: "",
            Email: "not-an-email",
            Password: "123" // Too short
        );

        var result = validator.Validate(model);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateMerchantRequestDto.Name));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateMerchantRequestDto.Email));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateMerchantRequestDto.Password));
    }

    // =========================================================================
    // 4. CreateOrderRequestDtoValidator (POS Quick Order Uyumluluğu)
    // =========================================================================
    [Fact]
    public void CreateOrderValidator_PosOrderWithoutPickupAddress_ShouldPass()
    {
        // Restoran POS ekranından gelen siparişlerde alım adresi boş olabilir (OrderService varsayılanı kullanır)
        var validator = new CreateOrderRequestDtoValidator();
        var model = new CreateOrderRequestDto(
            MerchantId: Guid.NewGuid(),
            PickupAddressLine: "", // Boş bırakıldı
            PickupDistrict: "",
            PickupCity: "",
            DeliveryAddressLine: "Atatürk Cad. No:12 D:4",
            DeliveryDistrict: "İskenderun",
            DeliveryCity: "Hatay",
            RecipientName: "Mehmet Demir",
            RecipientPhone: "+905553332211",
            PaymentMethod: PaymentMethod.Cash,
            TotalOrderAmount: 150.00m
        );

        var result = validator.Validate(model);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateOrderValidator_WithMissingDeliveryAddress_ShouldFail()
    {
        var validator = new CreateOrderRequestDtoValidator();
        var model = new CreateOrderRequestDto(
            MerchantId: Guid.NewGuid(),
            PickupAddressLine: "",
            PickupDistrict: "",
            PickupCity: "",
            DeliveryAddressLine: "", // Zorunlu teslim adresi eksik
            DeliveryDistrict: "",
            DeliveryCity: "",
            RecipientName: "Mehmet Demir",
            RecipientPhone: "invalid-phone",
            PaymentMethod: PaymentMethod.Cash,
            TotalOrderAmount: 0 // Nakit için tutar 0 olamaz
        );

        var result = validator.Validate(model);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateOrderRequestDto.DeliveryAddressLine));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateOrderRequestDto.RecipientPhone));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateOrderRequestDto.TotalOrderAmount));
    }

    // =========================================================================
    // 5. ProductValidators
    // =========================================================================
    [Fact]
    public void ProductValidators_CreateAndBulk_ShouldValidateCorrectly()
    {
        var createValidator = new CreateProductRequestValidator();
        var bulkValidator = new BulkCreateProductsRequestValidator();

        var validProduct = new CreateProductRequest("Tavuk Döner Dürüm", "Dürüm", 120.00m);
        var invalidProduct = new CreateProductRequest("", "", -10.00m);

        createValidator.Validate(validProduct).IsValid.Should().BeTrue();
        createValidator.Validate(invalidProduct).IsValid.Should().BeFalse();

        var validBulk = new BulkCreateProductsRequest(Guid.NewGuid(), new List<CreateProductRequest> { validProduct });
        var invalidBulk = new BulkCreateProductsRequest(Guid.NewGuid(), new List<CreateProductRequest> { invalidProduct });

        bulkValidator.Validate(validBulk).IsValid.Should().BeTrue();
        bulkValidator.Validate(invalidBulk).IsValid.Should().BeFalse();
    }
}
