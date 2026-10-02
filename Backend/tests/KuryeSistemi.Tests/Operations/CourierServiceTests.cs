using FluentAssertions;
using KuryeSistemi.Application.DTOs.Couriers;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Concrete;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Moq;

namespace KuryeSistemi.Tests.Operations;

public class CourierServiceTests
{
    private readonly Mock<ICourierRepository> _courierRepoMock = new();
    private readonly Mock<IMerchantRepository> _merchantRepoMock = new();
    private readonly Mock<IOrderRepository> _orderRepoMock = new();
    private readonly Mock<IHubNotificationService> _notificationMock = new();
    private readonly Mock<IPasswordHasherService> _hasherMock = new();

    private CourierService CreateService()
    {
        return new CourierService(
            _courierRepoMock.Object,
            _merchantRepoMock.Object,
            _orderRepoMock.Object,
            _notificationMock.Object,
            _hasherMock.Object);
    }

    [Fact]
    public async Task ToggleShiftAsync_WhenEndingShiftWithActiveOrders_ShouldReturnConflict()
    {
        // Arrange
        var service = CreateService();
        var courierId = Guid.NewGuid();
        var courier = new Courier
        {
            Id = courierId,
            FirstName = "Ali",
            LastName = "Kaya",
            IsOnline = true,
            IsAvailable = false
        };

        _courierRepoMock.Setup(r => r.GetByIdAsync(courierId)).ReturnsAsync(courier);
        // Kurye üzerinde 2 aktif teslim edilmemiş sipariş var
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(courierId)).ReturnsAsync(2);

        // Act: Mesai kapatılmaya çalışılıyor
        var result = await service.ToggleShiftAsync(courierId, isOnline: false);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(409);
        result.Message.Should().Contain("aktif sipariş varken mesai sonlandırılamaz");
    }

    [Fact]
    public async Task UpdateLocationAsync_WhenCourierIsOffline_ShouldNotForceOnline()
    {
        // Arrange
        var service = CreateService();
        var courierId = Guid.NewGuid();
        var courier = new Courier
        {
            Id = courierId,
            FirstName = "Murat",
            LastName = "Demir",
            IsOnline = false, // Çevrimdışı / Mesai kapalı
            IsAvailable = false
        };

        _courierRepoMock.Setup(r => r.GetByIdAsync(courierId)).ReturnsAsync(courier);

        // Act: Geciken GPS paketi geliyor
        var result = await service.UpdateLocationAsync(courierId, latitude: 36.58, longitude: 36.17);

        // Assert
        courier.IsOnline.Should().BeFalse("Geciken GPS paketleri çevrimdışı kuryeyi zorla çevrimiçi yapmamalıdır.");
        result.Message.Should().Contain("çevrimdışı olduğu için");
    }

    [Fact]
    public async Task CreateCourierAsync_WhenEmailAlreadyExists_ShouldReturnConflict()
    {
        // Arrange
        var service = CreateService();
        var email = "kurye@test.com";

        var merchantId = Guid.NewGuid();
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(new Merchant { Id = merchantId, Name = "Test Restoran" });

        var existingCourier = new Courier { Id = Guid.NewGuid(), Email = email };
        _courierRepoMock.Setup(r => r.GetByEmailAsync(email)).ReturnsAsync(existingCourier);

        var request = new CreateCourierRequestDto(
            MerchantId: merchantId,
            FirstName: "Ahmet",
            LastName: "Yıldız",
            PhoneNumber: "05559876543",
            Email: email,
            Password: "SecurePassword123",
            VehicleType: VehicleType.Motorcycle,
            LicensePlate: "31 ABC 123",
            VehicleBrand: "Honda",
            VehicleModel: "Activa"
        );

        // Act
        var result = await service.CreateCourierAsync(request);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(409);
        result.Message.Should().Contain("zaten mevcut");
    }
}
