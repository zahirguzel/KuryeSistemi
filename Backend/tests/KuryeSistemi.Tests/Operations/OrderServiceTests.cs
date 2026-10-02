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
    public async Task CreateOrderAsync_WhenCashOrder_ShouldPersistTotalOrderAmount()
    {
        // Arrange: nakit tutar kaydedilmezse kurye kasası/mahsuplaşma hesapları 0 TL ile çalışır
        var service = CreateService();
        var merchantId = Guid.NewGuid();
        var merchant = new Merchant
        {
            Id = merchantId,
            Name = "Test Restoran",
            Address = "Restoran Cad. No: 1",
            DispatchMode = DispatchMode.Pool,
            DefaultPackageFee = 75.00m,
            CourierCutFee = 40.00m
        };

        Order? savedOrder = null;
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);
        _orderRepoMock.Setup(r => r.AddAsync(It.IsAny<Order>()))
            .Callback<Order>(o => savedOrder = o)
            .Returns(Task.CompletedTask);

        var request = new CreateOrderRequestDto(
            MerchantId: merchantId,
            DeliveryAddressLine: "Atatürk Cad. No: 5",
            RecipientName: "Mehmet Demir",
            RecipientPhone: "05551234567",
            PaymentMethod: PaymentMethod.Cash,
            TotalOrderAmount: 250.00m);

        // Act
        var result = await service.CreateOrderAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        savedOrder.Should().NotBeNull();
        savedOrder!.TotalOrderAmount.Should().Be(250.00m, "Kapıda tahsil edilecek nakit tutar siparişle birlikte saklanmalıdır.");
        savedOrder.PaymentMethod.Should().Be(PaymentMethod.Cash);
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
        _jobMock.Verify(j => j.EnqueueDeliveryCreditDeduction(orderId), Times.Once);
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

    [Fact]
    public async Task AssignCourierAsync_WhenPoolCourierBelongsToSameCompany_ShouldSucceed()
    {
        // Arrange
        var service = CreateService();
        var companyId = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        var courierId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var merchant = new Merchant { Id = merchantId, Name = "Restoran A", CourierCompanyId = companyId };
        var poolCourier = new Courier
        {
            Id = courierId,
            CourierCompanyId = companyId,
            MerchantId = null, // Havuz kuryesi
            FirstName = "Ali",
            LastName = "Havuz",
            IsOnline = true,
            IsAvailable = true
        };
        var order = new Order { Id = orderId, MerchantId = merchantId, Status = OrderStatus.Pending };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(order);
        _courierRepoMock.Setup(r => r.GetByIdAsync(courierId)).ReturnsAsync(poolCourier);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);

        // Act
        var result = await service.AssignOrderAsync(orderId, courierId);

        // Assert
        result.IsSuccess.Should().BeTrue();
        order.CourierId.Should().Be(courierId);
        order.Status.Should().Be(OrderStatus.Assigned);
    }

    [Fact]
    public async Task AssignOrderAsync_WhenCourierBelongsToDifferentCompany_ShouldReturnConflict()
    {
        // Arrange
        var service = CreateService();
        var companyA = Guid.NewGuid();
        var companyB = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        var courierId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var merchant = new Merchant { Id = merchantId, Name = "Restoran A", CourierCompanyId = companyA };
        var foreignCourier = new Courier
        {
            Id = courierId,
            CourierCompanyId = companyB, // Farklı firma!
            MerchantId = null,
            FirstName = "Yabancı",
            LastName = "Kurye",
            IsOnline = true,
            IsAvailable = true
        };
        var order = new Order { Id = orderId, MerchantId = merchantId, Status = OrderStatus.Pending };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(order);
        _courierRepoMock.Setup(r => r.GetByIdAsync(courierId)).ReturnsAsync(foreignCourier);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);

        // Act
        var result = await service.AssignOrderAsync(orderId, courierId);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(409);
        result.Message.Should().Contain("bağlı olduğu kurye firmasına ait değildir");
    }

    [Fact]
    public async Task AssignOrderAsync_WhenCourierIsDedicatedToAnotherMerchant_ShouldReturnConflict()
    {
        // Arrange
        var service = CreateService();
        var companyId = Guid.NewGuid();
        var merchantA = Guid.NewGuid();
        var merchantB = Guid.NewGuid();
        var courierId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var merchant = new Merchant { Id = merchantA, Name = "Restoran A", CourierCompanyId = companyId };
        var dedicatedCourier = new Courier
        {
            Id = courierId,
            CourierCompanyId = companyId,
            MerchantId = merchantB, // Başka restorana tahsis edilmiş!
            FirstName = "Tahsisli",
            LastName = "Kurye",
            IsOnline = true,
            IsAvailable = true
        };
        var order = new Order { Id = orderId, MerchantId = merchantA, Status = OrderStatus.Pending };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(order);
        _courierRepoMock.Setup(r => r.GetByIdAsync(courierId)).ReturnsAsync(dedicatedCourier);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantA)).ReturnsAsync(merchant);

        // Act
        var result = await service.AssignOrderAsync(orderId, courierId);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(409);
        result.Message.Should().Contain("başka bir işletmeye özel tahsis edilmiştir");
    }

    [Fact]
    public async Task SmartAuto_WhenSharedFleetCourierExistsForSameCompany_ShouldAssignToSharedFleetCourier()
    {
        // Arrange
        var service = CreateService();
        var companyId = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var merchant = new Merchant
        {
            Id = merchantId,
            Name = "Restoran A",
            CourierCompanyId = companyId,
            DispatchMode = DispatchMode.SmartAuto,
            Latitude = 36.5867,
            Longitude = 36.1714,
            MaxOrdersPerTour = 3
        };

        var sharedFleetCourier = new Courier
        {
            Id = Guid.NewGuid(),
            CourierCompanyId = companyId,
            MerchantId = null, // Ortak filo! (Herhangi bir işletmeye tahsisli değil)
            FirstName = "Ortak",
            LastName = "Kurye",
            IsOnline = true,
            IsAvailable = true,
            CurrentLatitude = 36.5870,
            CurrentLongitude = 36.1720
        };

        var allCouriers = new List<Courier> { sharedFleetCourier };

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
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Courier, bool>> expr) => allCouriers.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Order, bool>>>()))
            .ReturnsAsync(new List<Order>());
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(It.IsAny<Guid>())).ReturnsAsync(0);

        // Act: Sipariş hazırlandı, SmartAuto ortak filo kuryesini otomatik atamalıdır
        var result = await service.UpdateStatusAsync(orderId, OrderStatus.Ready, null);

        // Assert
        result.IsSuccess.Should().BeTrue();
        order.Status.Should().Be(OrderStatus.Assigned);
        order.CourierId.Should().Be(sharedFleetCourier.Id, "Restoranın bağlı olduğu firmanın ortak filo (MerchantId = null) kuryesi atanmalıdır.");
    }

    [Fact]
    public async Task RetryUnassignedSmartAutoOrders_WhenCourierBecomesAvailable_ShouldAssignWaitingOrder()
    {
        // Arrange: sipariş geldiğinde kurye yoktu (atamasız kaldı); sonra bir kurye mesaiye girdi
        var service = CreateService();
        var companyId = Guid.NewGuid();
        var merchantId = Guid.NewGuid();

        var merchant = new Merchant
        {
            Id = merchantId,
            Name = "Restoran A",
            CourierCompanyId = companyId,
            DispatchMode = DispatchMode.SmartAuto,
            Latitude = 36.5867,
            Longitude = 36.1714,
            MaxOrdersPerTour = 2
        };

        var courier = new Courier
        {
            Id = Guid.NewGuid(),
            CourierCompanyId = companyId,
            MerchantId = null,
            FirstName = "Yeni",
            LastName = "Kurye",
            IsOnline = true,
            IsAvailable = true,
            CurrentLatitude = 36.5870,
            CurrentLongitude = 36.1720,
            LastLocationUpdate = DateTime.UtcNow
        };

        var waitingOrder = new Order
        {
            Id = Guid.NewGuid(),
            MerchantId = merchantId,
            Merchant = merchant,
            Status = OrderStatus.Ready,
            CourierId = null,
            CreatedAt = DateTime.UtcNow.AddMinutes(-3)
        };

        var orders = new List<Order> { waitingOrder };
        var couriers = new List<Courier> { courier };

        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);
        _courierRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Courier, bool>>>()))
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Courier, bool>> expr) => couriers.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Order, bool>>>()))
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Order, bool>> expr) => orders.Where(expr.Compile()).ToList());

        // Act
        var assigned = await service.RetryUnassignedSmartAutoOrdersAsync();

        // Assert
        assigned.Should().Be(1);
        waitingOrder.Status.Should().Be(OrderStatus.Assigned);
        waitingOrder.CourierId.Should().Be(courier.Id);
    }

    [Fact]
    public async Task SmartAuto_WhenOneCourierHasStaleGps_ShouldPreferCourierWithFreshGps()
    {
        // Arrange: bayat konumlu kurye (10 dk önce) restorana daha yakın görünse de taze konumlu kurye seçilmelidir
        var service = CreateService();
        var companyId = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var merchant = new Merchant
        {
            Id = merchantId,
            Name = "Restoran A",
            CourierCompanyId = companyId,
            DispatchMode = DispatchMode.SmartAuto,
            Latitude = 36.5867,
            Longitude = 36.1714,
            MaxOrdersPerTour = 2
        };

        var staleCourier = new Courier
        {
            Id = Guid.NewGuid(), CourierCompanyId = companyId, MerchantId = null,
            FirstName = "Bayat", LastName = "Konum", IsOnline = true, IsAvailable = true,
            CurrentLatitude = 36.5867, CurrentLongitude = 36.1714,
            LastLocationUpdate = DateTime.UtcNow.AddMinutes(-10)
        };
        var freshCourier = new Courier
        {
            Id = Guid.NewGuid(), CourierCompanyId = companyId, MerchantId = null,
            FirstName = "Taze", LastName = "Konum", IsOnline = true, IsAvailable = true,
            CurrentLatitude = 36.6000, CurrentLongitude = 36.1900,
            LastLocationUpdate = DateTime.UtcNow
        };
        var couriers = new List<Courier> { staleCourier, freshCourier };

        var order = new Order { Id = orderId, MerchantId = merchantId, Status = OrderStatus.Preparing };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(order);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);
        _courierRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Courier, bool>>>()))
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Courier, bool>> expr) => couriers.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Order, bool>>>()))
            .ReturnsAsync(new List<Order>());
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(It.IsAny<Guid>())).ReturnsAsync(0);

        // Act
        var result = await service.UpdateStatusAsync(orderId, OrderStatus.Ready, null);

        // Assert
        result.IsSuccess.Should().BeTrue();
        order.CourierId.Should().Be(freshCourier.Id, "Konumu 2 dakikadan eski kurye GPS'siz sayılır; taze konumlu kurye öncelikli olmalıdır.");
    }

    [Fact]
    public async Task SmartAuto_WhenNewOrderGoesToSameNeighborhoodAsCouriersPendingOrder_ShouldBundleOntoThatCourier()
    {
        // Arrange: A kuryesi restoranda alıma gidiyor (siparişi 2 dk önce atandı, teslimat ~300 m yakında);
        // B kuryesi boşta ve restorana daha yakın. Birleştirme penceresi içinde yeni sipariş A'ya gitmelidir.
        var service = CreateService();
        var companyId = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var merchant = new Merchant
        {
            Id = merchantId, Name = "Restoran A", CourierCompanyId = companyId,
            DispatchMode = DispatchMode.SmartAuto, Latitude = 36.5867, Longitude = 36.1714,
            MaxOrdersPerTour = 3, OrderBatchingTimeMinutes = 15, HexagonSizeMeters = 1120, MaxCourierDistanceKm = 6
        };

        var courierA = new Courier
        {
            Id = Guid.NewGuid(), CourierCompanyId = companyId, MerchantId = null,
            FirstName = "A", LastName = "Dolu", IsOnline = true, IsAvailable = true,
            CurrentLatitude = 36.5900, CurrentLongitude = 36.1750, LastLocationUpdate = DateTime.UtcNow
        };
        var courierB = new Courier
        {
            Id = Guid.NewGuid(), CourierCompanyId = companyId, MerchantId = null,
            FirstName = "B", LastName = "Boş", IsOnline = true, IsAvailable = true,
            CurrentLatitude = 36.5868, CurrentLongitude = 36.1715, LastLocationUpdate = DateTime.UtcNow
        };
        var couriers = new List<Courier> { courierA, courierB };

        var existingOrder = new Order
        {
            Id = Guid.NewGuid(), MerchantId = merchantId, CourierId = courierA.Id, Status = OrderStatus.Assigned,
            AssignedAt = DateTime.UtcNow.AddMinutes(-2), CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            DeliveryLatitude = 36.6000m, DeliveryLongitude = 36.1900m
        };
        var orders = new List<Order> { existingOrder };

        var newOrder = new Order
        {
            Id = orderId, MerchantId = merchantId, Status = OrderStatus.Preparing,
            DeliveryLatitude = 36.6020m, DeliveryLongitude = 36.1920m
        };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(newOrder);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);
        _courierRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Courier, bool>>>()))
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Courier, bool>> expr) => couriers.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Order, bool>>>()))
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Order, bool>> expr) => orders.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(It.IsAny<Guid>())).ReturnsAsync(0);

        // Act
        var result = await service.UpdateStatusAsync(orderId, OrderStatus.Ready, null);

        // Assert
        result.IsSuccess.Should().BeTrue();
        newOrder.CourierId.Should().Be(courierA.Id, "Aynı yöne giden sipariş birleştirme penceresi içinde mevcut paketi taşıyan kuryeye verilmelidir.");
    }

    [Fact]
    public async Task SmartAuto_WhenCourierBelongsToDifferentCompany_ShouldNotAssign()
    {
        // Arrange
        var service = CreateService();
        var companyA = Guid.NewGuid();
        var companyB = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var merchant = new Merchant
        {
            Id = merchantId,
            Name = "Restoran A",
            CourierCompanyId = companyA,
            DispatchMode = DispatchMode.SmartAuto,
            Latitude = 36.5867,
            Longitude = 36.1714,
            MaxOrdersPerTour = 3
        };

        var otherCompanyCourier = new Courier
        {
            Id = Guid.NewGuid(),
            CourierCompanyId = companyB, // Farklı firma!
            MerchantId = null,
            FirstName = "Rakip",
            LastName = "Kurye",
            IsOnline = true,
            IsAvailable = true,
            CurrentLatitude = 36.5868,
            CurrentLongitude = 36.1715
        };

        var allCouriers = new List<Courier> { otherCompanyCourier };

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
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Courier, bool>> expr) => allCouriers.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Order, bool>>>()))
            .ReturnsAsync(new List<Order>());
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(It.IsAny<Guid>())).ReturnsAsync(0);

        // Act
        var result = await service.UpdateStatusAsync(orderId, OrderStatus.Ready, null);

        // Assert
        result.IsSuccess.Should().BeTrue();
        order.Status.Should().Be(OrderStatus.Ready, "Farklı firmaya ait kurye aday listesine giremeyeceğinden sipariş Hazır (Ready) durumunda kalmalıdır.");
        order.CourierId.Should().BeNull();
    }

    [Fact]
    public async Task SmartAuto_WhenCourierIsDedicatedToAnotherMerchantOfSameCompany_ShouldNotAssign()
    {
        // Arrange
        var service = CreateService();
        var companyId = Guid.NewGuid();
        var merchantA = Guid.NewGuid();
        var merchantB = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var merchant = new Merchant
        {
            Id = merchantA,
            Name = "Restoran A",
            CourierCompanyId = companyId,
            DispatchMode = DispatchMode.SmartAuto,
            Latitude = 36.5867,
            Longitude = 36.1714,
            MaxOrdersPerTour = 3
        };

        var dedicatedToMerchantBCourier = new Courier
        {
            Id = Guid.NewGuid(),
            CourierCompanyId = companyId,
            MerchantId = merchantB, // Aynı firmanın ancak başka bir restoranına tahsisli!
            FirstName = "Özel",
            LastName = "Kurye",
            IsOnline = true,
            IsAvailable = true,
            CurrentLatitude = 36.5868,
            CurrentLongitude = 36.1715
        };

        var allCouriers = new List<Courier> { dedicatedToMerchantBCourier };

        var order = new Order
        {
            Id = orderId,
            MerchantId = merchantA,
            Status = OrderStatus.Preparing,
            DeliveryLatitude = 36.59m,
            DeliveryLongitude = 36.18m
        };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(order);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantA)).ReturnsAsync(merchant);
        _courierRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Courier, bool>>>()))
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Courier, bool>> expr) => allCouriers.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Order, bool>>>()))
            .ReturnsAsync(new List<Order>());
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(It.IsAny<Guid>())).ReturnsAsync(0);

        // Act
        var result = await service.UpdateStatusAsync(orderId, OrderStatus.Ready, null);

        // Assert
        result.IsSuccess.Should().BeTrue();
        order.Status.Should().Be(OrderStatus.Ready, "Başka restorana tahsisli kurye aday listesine giremeyeceğinden sipariş Hazır (Ready) durumunda kalmalıdır.");
        order.CourierId.Should().BeNull();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Birleştirme (Bundle) Olumsuz Senaryolar
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task SmartAuto_WhenCrossRestaurantPickupIsFarBeyondLimit_ShouldNotBundle()
    {
        // Arrange: iki farklı restoran; alım noktaları ~2000 m uzakta, CrossRestaurantDistanceMeters = 200 m
        // Kuryenin mevcut siparişi restaurantA'dan, yeni sipariş restaurantB'den.
        // Beklenen: kurye B (boşta, restorana çok yakın) sıraya girmeli; kuryeA bundle önceliği ALMAMALI.
        var service = CreateService();
        var companyId = Guid.NewGuid();
        var merchantA  = Guid.NewGuid();
        var merchantB  = Guid.NewGuid();
        var orderId    = Guid.NewGuid();

        // merchantB: yeni siparişin sahibi (yeni OrderService çağrısında bu restoran mercek altında)
        var merchant = new Merchant
        {
            Id = merchantB, Name = "Restoran B", CourierCompanyId = companyId,
            DispatchMode = DispatchMode.SmartAuto, Latitude = 36.5867, Longitude = 36.1714,
            MaxOrdersPerTour = 3, OrderBatchingTimeMinutes = 15, HexagonSizeMeters = 1120,
            MaxCourierDistanceKm = 6, CrossRestaurantDistanceMeters = 200
        };

        // CourierA: mevcut bir siparişi var (restaurantA'dan), henüz "Assigned" — alıma gidiyor
        var courierA = new Courier
        {
            Id = Guid.NewGuid(), CourierCompanyId = companyId, MerchantId = null,
            FirstName = "A", LastName = "Dolu", IsOnline = true, IsAvailable = true,
            CurrentLatitude = 36.5900, CurrentLongitude = 36.1750, LastLocationUpdate = DateTime.UtcNow
        };
        // CourierB: tamamen boşta, yeni siparişin restoranına çok yakın
        var courierB = new Courier
        {
            Id = Guid.NewGuid(), CourierCompanyId = companyId, MerchantId = null,
            FirstName = "B", LastName = "Boş", IsOnline = true, IsAvailable = true,
            CurrentLatitude = 36.5868, CurrentLongitude = 36.1715, LastLocationUpdate = DateTime.UtcNow
        };
        var couriers = new List<Courier> { courierA, courierB };

        // Mevcut sipariş: restaurantA'dan, alım noktası ~2000 m uzakta (farklı koordinat)
        var existingOrder = new Order
        {
            Id = Guid.NewGuid(), MerchantId = merchantA, CourierId = courierA.Id,
            Status = OrderStatus.Assigned,
            AssignedAt = DateTime.UtcNow.AddMinutes(-2),
            CreatedAt  = DateTime.UtcNow.AddMinutes(-5),
            // Pickup ~2000 m uzak (kuzey): 36.6047 ≈ ~2 km mesafe
            PickupLatitude  = 36.6047m, PickupLongitude = 36.1714m,
            DeliveryLatitude = 36.6100m, DeliveryLongitude = 36.1800m
        };

        var newOrder = new Order
        {
            Id = orderId, MerchantId = merchantB, Status = OrderStatus.Preparing,
            PickupLatitude   = 36.5867m, PickupLongitude  = 36.1714m, // restaurantB konumunda
            DeliveryLatitude = 36.6100m, DeliveryLongitude = 36.1800m  // benzer teslimat
        };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(newOrder);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantB)).ReturnsAsync(merchant);
        _courierRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Courier, bool>>>()))
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Courier, bool>> expr) => couriers.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Order, bool>>>()))
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Order, bool>> expr) =>
                new List<Order> { existingOrder }.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(It.IsAny<Guid>())).ReturnsAsync(0);

        // Act
        var result = await service.UpdateStatusAsync(orderId, OrderStatus.Ready, null);

        // Assert
        result.IsSuccess.Should().BeTrue();
        newOrder.CourierId.Should().Be(courierB.Id,
            "Alım noktaları 2000 m uzakta (limit 200 m) olduğunda birleştirme gerçekleşmemeli;" +
            " restorana en yakın boşta kurye (B) atanmalıdır.");
    }

    [Fact]
    public async Task SmartAuto_WhenBatchingTimeIsZero_ShouldNotBundle()
    {
        // Arrange: OrderBatchingTimeMinutes = 0 → birleştirme devre dışı.
        // Kuryenin mevcut siparişi aynı yönde dahi olsa bundle önceliği verilmemelidir.
        var service = CreateService();
        var companyId  = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        var orderId    = Guid.NewGuid();

        var merchant = new Merchant
        {
            Id = merchantId, Name = "Restoran A", CourierCompanyId = companyId,
            DispatchMode = DispatchMode.SmartAuto, Latitude = 36.5867, Longitude = 36.1714,
            MaxOrdersPerTour = 3,
            OrderBatchingTimeMinutes = 0,   // ← Birleştirme KAPALI
            HexagonSizeMeters = 1120, MaxCourierDistanceKm = 6
        };

        var courierA = new Courier
        {
            Id = Guid.NewGuid(), CourierCompanyId = companyId, MerchantId = null,
            FirstName = "A", LastName = "Dolu", IsOnline = true, IsAvailable = true,
            CurrentLatitude = 36.5900, CurrentLongitude = 36.1750, LastLocationUpdate = DateTime.UtcNow
        };
        var courierB = new Courier
        {
            Id = Guid.NewGuid(), CourierCompanyId = companyId, MerchantId = null,
            FirstName = "B", LastName = "Yakın", IsOnline = true, IsAvailable = true,
            CurrentLatitude = 36.5868, CurrentLongitude = 36.1715, LastLocationUpdate = DateTime.UtcNow
        };
        var couriers = new List<Courier> { courierA, courierB };

        // KuruyeA'nın mevcut siparişi aynı mahalleye gidiyor — ama batching kapalı
        var existingOrder = new Order
        {
            Id = Guid.NewGuid(), MerchantId = merchantId, CourierId = courierA.Id,
            Status = OrderStatus.Assigned, AssignedAt = DateTime.UtcNow.AddMinutes(-2),
            DeliveryLatitude = 36.6000m, DeliveryLongitude = 36.1900m
        };

        var newOrder = new Order
        {
            Id = orderId, MerchantId = merchantId, Status = OrderStatus.Preparing,
            DeliveryLatitude = 36.6020m, DeliveryLongitude = 36.1920m
        };

        _orderRepoMock.Setup(r => r.GetByIdAsync(orderId)).ReturnsAsync(newOrder);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);
        _courierRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Courier, bool>>>()))
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Courier, bool>> expr) => couriers.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Order, bool>>>()))
            .ReturnsAsync((System.Linq.Expressions.Expression<Func<Order, bool>> expr) =>
                new List<Order> { existingOrder }.Where(expr.Compile()).ToList());
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(It.IsAny<Guid>())).ReturnsAsync(0);

        // Act
        var result = await service.UpdateStatusAsync(orderId, OrderStatus.Ready, null);

        // Assert
        result.IsSuccess.Should().BeTrue();
        // CourierB restorana daha yakın; batching kapalı olduğunda en yakın boşta kurye seçilmeli
        newOrder.CourierId.Should().Be(courierB.Id,
            "OrderBatchingTimeMinutes=0 olduğunda birleştirme devre dışıdır; sıralama yalnızca mesafeye göre yapılmalıdır.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Finans: Aynı Kurye, Aynı Restoran — İki Paket, Paket Bazlı Muhasebe
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Finance_WhenTwoOrdersDeliveredBySameCourier_EachOrderMutsealedSeparately()
    {
        // Senaryo: Aynı kurye (Ali) bir restauranttan iki paket teslim eder.
        // Paket 1: 65 ₺ (Nakit), Paket 2: 45 ₺ (Nakit). CourierCutFee = 40 ₺/paket.
        // Birinci teslimattan sonra: CurrentBalance = -65 + 40 = -25 ₺
        // İkinci teslimattan sonra:  CurrentBalance = -25 - 45 + 40 = -30 ₺
        // Her sipariş kendi CourierEarning ve FirmFee değerini bağımsız taşır.

        var service = CreateService();
        var merchantId = Guid.NewGuid();
        var courierId  = Guid.NewGuid();

        var merchant = new Merchant
        {
            Id = merchantId, Name = "Pizza World", CourierCutFee = 40.00m,
            DefaultPackageFee = 100.00m, MaxOrdersPerTour = 3,
            DispatchMode = DispatchMode.Pool
        };
        var courier = new Courier
        {
            Id = courierId, MerchantId = merchantId, FirstName = "Ali", LastName = "Test",
            IsOnline = true, IsAvailable = true, CurrentBalance = 0.00m
        };

        var order1 = new Order
        {
            Id = Guid.NewGuid(), MerchantId = merchantId, CourierId = courierId,
            Status = OrderStatus.PickedUp,
            PaymentMethod = PaymentMethod.Cash,
            TotalOrderAmount = 65.00m
        };
        var order2 = new Order
        {
            Id = Guid.NewGuid(), MerchantId = merchantId, CourierId = courierId,
            Status = OrderStatus.PickedUp,
            PaymentMethod = PaymentMethod.Cash,
            TotalOrderAmount = 45.00m
        };

        // ── İlk teslimat (order1) ──
        _orderRepoMock.Setup(r => r.GetByIdAsync(order1.Id)).ReturnsAsync(order1);
        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);
        _courierRepoMock.Setup(r => r.GetByIdAsync(courierId)).ReturnsAsync(courier);
        // order1 teslim edildiğinde order2 hâlâ aktif (PickedUp) → 1 aktif kalıyor
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(courierId)).ReturnsAsync(2);

        var result1 = await service.UpdateStatusAsync(order1.Id, OrderStatus.Delivered, courierId);

        result1.IsSuccess.Should().BeTrue();
        order1.CourierEarning.Should().Be(40.00m, "Paket başı kurye kazancı 40 TL olmalı");
        order1.FirmFee.Should().Be(60.00m, "Firma payı DefaultPackageFee(100) - CourierCutFee(40) = 60 TL");
        // Bakiye: 0 - 65 (nakit borç) + 40 (hakediş) = -25
        courier.CurrentBalance.Should().Be(-25.00m, "Birinci teslimattan sonra bakiye -25 TL olmalı");

        // ── İkinci teslimat (order2) ──
        _orderRepoMock.Setup(r => r.GetByIdAsync(order2.Id)).ReturnsAsync(order2);
        // order2 teslim edildiğinde başka aktif yok
        _orderRepoMock.Setup(r => r.CountActiveOrdersByCourierAsync(courierId)).ReturnsAsync(1);

        var result2 = await service.UpdateStatusAsync(order2.Id, OrderStatus.Delivered, courierId);

        result2.IsSuccess.Should().BeTrue();
        order2.CourierEarning.Should().Be(40.00m, "İkinci pakette de kurye kazancı 40 TL olmalı");
        order2.FirmFee.Should().Be(60.00m, "İkinci pakette de firma payı 60 TL olmalı");
        // Bakiye: -25 - 45 (nakit borç) + 40 (hakediş) = -30
        courier.CurrentBalance.Should().Be(-30.00m, "İki teslimat sonrası toplam bakiye -30 TL olmalı");

        // İki sipariş bağımsız kayıt — birbirinin FinancialAmount'ını etkilemez
        order1.TotalOrderAmount.Should().Be(65.00m);
        order2.TotalOrderAmount.Should().Be(45.00m);
        order1.CourierEarning.Should().NotBe(order2.TotalOrderAmount,
            "Paketler bağımsız; birinin teslim tutarı diğerinin hakedişini değiştirmez");
    }
}
