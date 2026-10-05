using FluentAssertions;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Concrete;
using KuryeSistemi.Domain.Entities;
using Moq;

namespace KuryeSistemi.Tests.Operations;

public class CourierBreakTests
{
    private readonly Mock<ICourierRepository> _courierRepo = new();
    private readonly Mock<IOrderRepository> _orderRepo = new();
    private readonly Mock<IHubNotificationService> _notifications = new();

    private CourierService CreateService() => new(
        _courierRepo.Object,
        new Mock<IMerchantRepository>().Object,
        _orderRepo.Object,
        _notifications.Object,
        new Mock<IPasswordHasherService>().Object);

    private Courier SeedCourier(bool online = true, bool onBreak = false, int activeOrders = 0)
    {
        var courier = new Courier { Id = Guid.NewGuid(), FirstName = "Ali", LastName = "Kaya", IsOnline = online, IsOnBreak = onBreak, IsAvailable = !onBreak };
        _courierRepo.Setup(r => r.GetByIdAsync(courier.Id)).ReturnsAsync(courier);
        _orderRepo.Setup(r => r.CountActiveOrdersByCourierAsync(courier.Id)).ReturnsAsync(activeOrders);
        return courier;
    }

    [Fact]
    public async Task Mola_MesaideDegilseReddedilir()
    {
        var courier = SeedCourier(online: false);

        var result = await CreateService().SetBreakAsync(courier.Id, true);

        result.StatusCode.Should().Be(409);
        courier.IsOnBreak.Should().BeFalse();
    }

    [Fact]
    public async Task Mola_AktifSiparisVarkenReddedilir()
    {
        var courier = SeedCourier(activeOrders: 1);

        var result = await CreateService().SetBreakAsync(courier.Id, true);

        result.StatusCode.Should().Be(409);
        result.Message.Should().Contain("aktif sipariş");
        courier.IsOnBreak.Should().BeFalse();
    }

    [Fact]
    public async Task Mola_Basarili_MusaitDegilOlurVeMolaBilgisiYayinlanir()
    {
        var courier = SeedCourier();

        var result = await CreateService().SetBreakAsync(courier.Id, true);

        result.IsSuccess.Should().BeTrue();
        courier.IsOnBreak.Should().BeTrue();
        courier.IsAvailable.Should().BeFalse("moladaki kurye yeni sipariş almaz");
        _courierRepo.Verify(r => r.Update(courier), Times.Once);
        _notifications.Verify(n => n.SendCourierStatusChangedAsync(
            courier.Id, true, false, It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>(), true), Times.Once);
    }

    [Fact]
    public async Task Moladan_Donus_TekrarMusaitOlur()
    {
        var courier = SeedCourier(onBreak: true);

        var result = await CreateService().SetBreakAsync(courier.Id, false);

        result.IsSuccess.Should().BeTrue();
        courier.IsOnBreak.Should().BeFalse();
        courier.IsAvailable.Should().BeTrue();
    }

    [Fact]
    public async Task MesaiBitince_MolaDurumuSifirlanir()
    {
        var courier = SeedCourier(onBreak: true);

        var result = await CreateService().ToggleShiftAsync(courier.Id, isOnline: false);

        result.IsSuccess.Should().BeTrue();
        courier.IsOnBreak.Should().BeFalse();
        courier.IsOnline.Should().BeFalse();
    }
}
