using FluentAssertions;
using KuryeSistemi.Application.DTOs.Orders;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Concrete;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Moq;

namespace KuryeSistemi.Tests.Operations;

public class OrderServiceTests
{
    private readonly Mock<IOrderRepository> _orderRepoMock = new();
    private readonly Mock<ICourierRepository> _courierRepoMock = new();
    private readonly Mock<IMerchantRepository> _merchantRepoMock = new();
    private readonly Mock<IHubNotificationService> _notificationMock = new();
    private readonly Mock<IBackgroundJobService> _jobMock = new();
    private readonly Mock<IAuditService> _auditMock = new();

    private OrderService CreateService()
    {
        return new OrderService(
            _orderRepoMock.Object,
            _courierRepoMock.Object,
            _merchantRepoMock.Object,
            _jobMock.Object,
            _notificationMock.Object,
            _auditMock.Object);
    }

    [Fact]
    public async Task CreateOrderAsync_WhenTotalOrderAmountIsNegative_ShouldReturnBadRequest()
    {
        // Arrange
        var service = CreateService();
        var request = new CreateOrderRequestDto(
            MerchantId: Guid.NewGuid(),
            DeliveryAddressLine: "Atatürk Cad. No: 5",
            DeliveryDistrict: "Çarşı",
            DeliveryCity: "İskenderun",
            DeliveryLatitude: 36.58m,
            DeliveryLongitude: 36.17m,
            RecipientName: "Mehmet Demir",
            RecipientPhone: "05551234567",
            PaymentMethod: PaymentMethod.Online,
            TotalOrderAmount: -50.00m // Geçersiz negatif tutar
        );

        // Act
        var result = await service.CreateOrderAsync(request);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(400);
        result.Message.Should().Contain("negatif olamaz");
    }

    [Fact]
    public async Task ClaimOrderAsync_WhenOrderIsAlreadyAssigned_ShouldReturnConflict()
    {
        // Arrange
        var service = CreateService();
        var orderId = Guid.NewGuid();
        var courierId = Guid.NewGuid();
        var existingCourierId = Guid.NewGuid();

        var order = new Order
        {
            Id = orderId,
            MerchantId = Guid.NewGuid(),
            Status = OrderStatus.Assigned,
            CourierId = existingCourierId
        };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(order);

        // Act
        var result = await service.ClaimOrderAsync(orderId, courierId);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(409);
        result.Message.Should().Contain("zaten başka bir kuryeye atanmıştır");
    }

    [Fact]
    public async Task UpdateStatusAsync_WhenChangingToPickedUpWithoutCourier_ShouldReturnBadRequest()
    {
        // Arrange
        var service = CreateService();
        var orderId = Guid.NewGuid();

        var order = new Order
        {
            Id = orderId,
            MerchantId = Guid.NewGuid(),
            Status = OrderStatus.Pending,
            CourierId = null
        };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(order);

        // Act: Kurye belirtilmeden PickedUp yapılmaya çalışılıyor
        var result = await service.UpdateStatusAsync(orderId, OrderStatus.PickedUp, courierId: null);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(400);
        result.Message.Should().Contain("atanmadan");
    }

    [Fact]
    public async Task UpdateStatusAsync_WhenDeliveredAndCourierStillHasActiveOrders_ShouldKeepCourierUnavailable()
    {
        // Arrange
        var service = CreateService();
        var orderId = Guid.NewGuid();
        var courierId = Guid.NewGuid();
        var merchantId = Guid.NewGuid();

        var merchant = new Merchant
        {
            Id = merchantId,
            MaxOrdersPerTour = 2,
            DefaultPackageFee = 80.00m,
            CourierCutFee = 45.00m
        };

        var courier = new Courier
        {
            Id = courierId,
            MerchantId = merchantId,
            FirstName = "Can",
            LastName = "Yılmaz",
            IsAvailable = false,
            CurrentBalance = 0.00m
        };

        var order = new Order
        {
            Id = orderId,
            MerchantId = merchantId,
            CourierId = courierId,
            Status = OrderStatus.PickedUp,
            PaymentMethod = PaymentMethod.Online,
            TotalOrderAmount = 120.00m
        };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(order);
        _courierRepoMock.Setup(r => r.GetByIdAsync(courierId)).ReturnsAsync(courier);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);

        // Kuryenin teslim ettiği bu sipariş dahil halen 3 aktif siparişi var (teslim sonrası 2 kalacak, tur kapasitesi 2 olduğu için hala dolu/meşgul kalmalı)
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(courierId)).ReturnsAsync(3);

        // Act
        var result = await service.UpdateStatusAsync(orderId, OrderStatus.Delivered, courierId);

        // Assert
        result.IsSuccess.Should().BeTrue();
        order.FirmFee.Should().Be(35.00m, "Firma komisyonu mühürlenmelidir: 80 - 45 = 35 TL.");
        order.CourierEarning.Should().Be(45.00m);
        courier.IsAvailable.Should().BeFalse("Kuryenin halen tur kapasitesi kadar aktif siparişi olduğundan IsAvailable false kalmalıdır.");
    }

    [Fact]
    public async Task SmartAuto_WhenCouriersEvaluated_GPSCourierShouldBePrioritizedOverNoGPSCourier()
    {
        // Arrange
        var service = CreateService();
        var merchantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var merchant = new Merchant
        {
            Id = merchantId,
            Name = "Restoran",
            DispatchMode = DispatchMode.SmartAuto,
            Latitude = 36.5867,
            Longitude = 36.1714,
            MaxOrdersPerTour = 3
        };

        var courierWithGps = new Courier
        {
            Id = Guid.NewGuid(),
            FirstName = "GPS'li",
            LastName = "Kurye",
            MerchantId = merchantId,
            IsOnline = true,
            IsAvailable = true,
            CurrentLatitude = 36.5870,
            CurrentLongitude = 36.1720
        };

        var courierWithoutGps = new Courier
        {
            Id = Guid.NewGuid(),
            FirstName = "GPS'siz",
            LastName = "Kurye",
            MerchantId = merchantId,
            IsOnline = true,
            IsAvailable = true,
            CurrentLatitude = null,
            CurrentLongitude = null
        };

        var order = new Order
        {
            Id = orderId,
            MerchantId = merchantId,
            Status = OrderStatus.Preparing,
            DeliveryLatitude = 36.59m,
            DeliveryLongitude = 36.18m
        };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(order);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);
        _courierRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Courier, bool>>>()))
            .ReturnsAsync(new List<Courier> { courierWithoutGps, courierWithGps });
        _orderRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Order, bool>>>()))
            .ReturnsAsync(new List<Order>());
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(It.IsAny<Guid>())).ReturnsAsync(0);

        // Act: Sipariş mutfaktan çıkıp Hazır (Ready) yapılıyor, SmartAuto tetikleniyor
        var result = await service.UpdateStatusAsync(orderId, OrderStatus.Ready, null);

        // Assert
        result.IsSuccess.Should().BeTrue();
        order.Status.Should().Be(OrderStatus.Assigned);
        order.CourierId.Should().Be(courierWithGps.Id, "GPS koordinatı olan yakın kurye, GPS'siz (999km ceza puanlı) kuryeye tercih edilmelidir.");
    }
}
