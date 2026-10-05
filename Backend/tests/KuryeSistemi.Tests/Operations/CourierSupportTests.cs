using FluentAssertions;
using KuryeSistemi.Application.DTOs.Couriers;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Concrete;
using KuryeSistemi.Application.Validators.Couriers;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using KuryeSistemi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Moq;

namespace KuryeSistemi.Tests.Operations;

public class CourierSupportTests
{
    private readonly Mock<ICourierRepository> _courierRepo = new();
    private readonly Mock<IHubNotificationService> _notifications = new();
    private readonly Mock<IAuditService> _audit = new();

    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private CourierSupportService CreateService(AppDbContext db) =>
        new(_courierRepo.Object, db, _notifications.Object, _audit.Object, new MemoryCache(new MemoryCacheOptions()));

    private Courier SeedCourier(Guid? companyId = null)
    {
        var courier = new Courier
        {
            Id = Guid.NewGuid(), FirstName = "Ali", LastName = "Kaya", Email = "ali@k.com", PhoneNumber = "05551112233",
            CourierCompanyId = companyId ?? Guid.NewGuid(), CurrentLatitude = 36.58, CurrentLongitude = 36.17
        };
        _courierRepo.Setup(r => r.GetByIdAsync(courier.Id)).ReturnsAsync(courier);
        return courier;
    }

    [Fact]
    public async Task Sos_Basarili_FirmayaYayinlanirVeDenetimKaydiYazilir()
    {
        await using var db = NewDb();
        var courier = SeedCourier();

        var result = await CreateService(db).RaiseSosAsync(courier.Id, new SosRequest("Kaza yaptım", 36.6, 36.2));

        result.IsSuccess.Should().BeTrue();
        _notifications.Verify(n => n.SendCourierSosAsync(
            courier.Id, "Ali Kaya", "05551112233", 36.6, 36.2, "Kaza yaptım", It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Once);
        _audit.Verify(a => a.LogAsync(
            courier.Id, "ali@k.com", "Courier", It.IsAny<Guid?>(), "CourierSos", "Courier", courier.Id.ToString(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Sos_KonumVerilmezse_SonBilinenKonumKullanilir()
    {
        await using var db = NewDb();
        var courier = SeedCourier();

        await CreateService(db).RaiseSosAsync(courier.Id, new SosRequest());

        _notifications.Verify(n => n.SendCourierSosAsync(
            courier.Id, It.IsAny<string>(), It.IsAny<string>(), 36.58, 36.17, null, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Sos_DakikadaBirKezSiniri_IkinciCagri429()
    {
        await using var db = NewDb();
        var courier = SeedCourier();
        var service = CreateService(db);

        await service.RaiseSosAsync(courier.Id, new SosRequest());
        var second = await service.RaiseSosAsync(courier.Id, new SosRequest());

        second.StatusCode.Should().Be(429);
        _notifications.Verify(n => n.SendCourierSosAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<double?>(), It.IsAny<double?>(),
            It.IsAny<string?>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Destek_DispecerTelefonuFirmadanGelir_TanimsizsaNull()
    {
        await using var db = NewDb();
        var withPhone = new CourierCompany { Name = "Zahir Kurye", Email = "z@z.com", PhoneNumber = " 0850 111 22 33 " };
        var noPhone = new CourierCompany { Name = "Boş Firma", Email = "b@b.com", PhoneNumber = "" };
        db.CourierCompanies.AddRange(withPhone, noPhone);
        await db.SaveChangesAsync();
        var c1 = SeedCourier(withPhone.Id);
        var c2 = SeedCourier(noPhone.Id);
        var service = CreateService(db);

        (await service.GetSupportInfoAsync(c1.Id)).Data!.DispatcherPhone.Should().Be("0850 111 22 33");
        (await service.GetSupportInfoAsync(c2.Id)).Data!.DispatcherPhone.Should().BeNull();
    }

    [Fact]
    public void SosValidator_UzunNotVeGecersizKonumuReddeder()
    {
        var v = new SosRequestValidator();
        v.Validate(new SosRequest(new string('a', 301))).IsValid.Should().BeFalse();
        v.Validate(new SosRequest("x", 95, 36)).IsValid.Should().BeFalse();
        v.Validate(new SosRequest("x", 36, 190)).IsValid.Should().BeFalse();
        v.Validate(new SosRequest("x", 36.5, 36.2)).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task TeslimGecmisi_DetayAlanlariDoluVeTelefonMaskeli()
    {
        var courier = new Courier { Id = Guid.NewGuid(), FirstName = "Ali", LastName = "Kaya" };
        var order = new Order
        {
            Id = Guid.NewGuid(), CourierId = courier.Id, Status = OrderStatus.Delivered, DeliveredAt = DateTime.UtcNow,
            RecipientName = "Müşteri", RecipientPhone = "05551112233", DeliveryAddressLine = "Atatürk Cad. 5", DeliveryNeighborhood = "Çarşı",
            DeliveryDistrict = "İskenderun", DeliveryCity = "Hatay", PickupAddressLine = "Restoran Sk. 1", OrderCode = "TY-100",
            PaymentMethod = PaymentMethod.Cash, TotalOrderAmount = 120m, CourierEarning = 45m, Merchant = new Merchant { Name = "Pideci" }
        };
        var orderRepo = new Mock<IOrderRepository>();
        orderRepo.Setup(r => r.GetDeliveredOrdersByCourierAndDateRangeAsync(courier.Id, It.IsAny<DateTime>(), It.IsAny<DateTime>()))
                 .ReturnsAsync(new List<Order> { order });
        var courierRepo = new Mock<ICourierRepository>();
        courierRepo.Setup(r => r.GetByIdAsync(courier.Id)).ReturnsAsync(courier);
        var service = new CourierService(courierRepo.Object, new Mock<IMerchantRepository>().Object, orderRepo.Object,
            new Mock<IHubNotificationService>().Object, new Mock<IPasswordHasherService>().Object);

        var result = await service.GetEarningsByDateRangeAsync(courier.Id, DateTime.UtcNow.AddDays(-1), DateTime.UtcNow);

        var item = result.Data!.Deliveries.Should().ContainSingle().Subject;
        item.OrderCode.Should().Be("TY-100");
        item.MerchantName.Should().Be("Pideci");
        item.PickupAddress.Should().Be("Restoran Sk. 1");
        item.DeliveryAddressFull.Should().Be("Atatürk Cad. 5, Çarşı, İskenderun, Hatay");
        item.RecipientPhoneMasked.Should().Be("0555 *** ** 33").And.NotContain("1112");
        item.PaymentMethod.Should().Be("Cash");
        item.TotalOrderAmount.Should().Be(120m);
        item.Earning.Should().Be(45m);
    }
}
