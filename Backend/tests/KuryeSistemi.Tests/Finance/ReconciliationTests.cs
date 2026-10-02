using FluentAssertions;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Concrete;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace KuryeSistemi.Tests.Finance;

public class ReconciliationTests
{
    private readonly Mock<IMerchantRepository> _merchantRepoMock = new();
    private readonly Mock<ICourierRepository> _courierRepoMock = new();
    private readonly Mock<IAuditService> _auditServiceMock = new();
    private readonly Mock<IPasswordHasherService> _hasherMock = new();
    private readonly Mock<IApplicationDbContext> _dbMock = new();

    [Fact]
    public async Task ReconcileCourierAsync_WhenBalanceIsZero_ShouldReturnBadRequest_Idempotent()
    {
        // Arrange
        var merchantId = Guid.NewGuid();
        var courierId = Guid.NewGuid();

        var merchant = new Merchant { Id = merchantId, Name = "Test Restoran", Role = "Merchant" };
        var courier = new Courier { Id = courierId, MerchantId = merchantId, FirstName = "Ali", LastName = "Veli", CurrentBalance = 0.00m };

        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);
        _courierRepoMock.Setup(r => r.GetByIdAsync(courierId)).ReturnsAsync(courier);

        var service = new MerchantService(
            _merchantRepoMock.Object,
            _courierRepoMock.Object,
            _dbMock.Object,
            _hasherMock.Object,
            _auditServiceMock.Object);

        // Act
        var result = await service.ReconcileCourierAsync(merchantId, courierId);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(400);
        result.Message.Should().Contain("mahsuplaşılacak açık bakiye bulunmamaktadır");
    }

    [Fact]
    public async Task ReconcileCourierAsync_WhenCourierBelongsToDifferentMerchant_ShouldReturnBadRequest()
    {
        // Arrange
        var merchantId = Guid.NewGuid();
        var courierId = Guid.NewGuid();
        var otherMerchantId = Guid.NewGuid();

        var merchant = new Merchant { Id = merchantId, Name = "Restoran A", Role = "Merchant" };
        var courier = new Courier { Id = courierId, MerchantId = otherMerchantId, FirstName = "Ahmet", CurrentBalance = -150.00m };

        _merchantRepoMock.Setup(r => r.GetByIdAsync(merchantId)).ReturnsAsync(merchant);
        _courierRepoMock.Setup(r => r.GetByIdAsync(courierId)).ReturnsAsync(courier);

        var service = new MerchantService(
            _merchantRepoMock.Object,
            _courierRepoMock.Object,
            _dbMock.Object,
            _hasherMock.Object,
            _auditServiceMock.Object);

        // Act
        var result = await service.ReconcileCourierAsync(merchantId, courierId);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(400);
        result.Message.Should().Contain("bağlı değildir");
    }
}
