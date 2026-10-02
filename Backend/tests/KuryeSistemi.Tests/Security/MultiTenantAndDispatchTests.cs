using FluentAssertions;
using KuryeSistemi.API.Hubs;
using KuryeSistemi.API.Services;
using KuryeSistemi.Application.Common.Constants;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using KuryeSistemi.Infrastructure.Security;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using System.Security.Claims;
using Xunit;

namespace KuryeSistemi.Tests.Security;

public class MultiTenantAndDispatchTests
{
    [Fact]
    public async Task SendOrderStatusChanged_WhenPoolOrder_ShouldBroadcastToCourierPoolAndMerchant()
    {
        // Arrange
        var mockHubContext = new Mock<IHubContext<LocationHub>>();
        var mockClients = new Mock<IHubClients>();
        var mockClientProxy = new Mock<IClientProxy>();

        IReadOnlyList<string>? capturedGroups = null;

        mockHubContext.Setup(h => h.Clients).Returns(mockClients.Object);
        mockClients
            .Setup(c => c.Groups(It.IsAny<IReadOnlyList<string>>()))
            .Callback<IReadOnlyList<string>>(groups => capturedGroups = groups)
            .Returns(mockClientProxy.Object);

        var service = new SignalRHubNotificationService(mockHubContext.Object, NullLogger<SignalRHubNotificationService>.Instance);
        var merchantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        // Act - Havuz siparişi (courierId = null, status = Pending)
        await service.SendOrderStatusChangedAsync(merchantId, orderId, "Pending", "Yeni sipariş havuza düştü.", courierId: null);

        // Assert
        capturedGroups.Should().NotBeNull();
        capturedGroups.Should().Contain($"merchant_{merchantId}");
        capturedGroups.Should().Contain("firm_admin");
        capturedGroups.Should().Contain("courier_pool", "Havuza düşen sipariş tüm aktif kuryelere bildirilmelidir.");
    }

    [Fact]
    public async Task SendOrderStatusChanged_WhenAssignedToCourier_ShouldTargetAssignedCourierChannel()
    {
        // Arrange
        var mockHubContext = new Mock<IHubContext<LocationHub>>();
        var mockClients = new Mock<IHubClients>();
        var mockClientProxy = new Mock<IClientProxy>();

        IReadOnlyList<string>? capturedGroups = null;

        mockHubContext.Setup(h => h.Clients).Returns(mockClients.Object);
        mockClients
            .Setup(c => c.Groups(It.IsAny<IReadOnlyList<string>>()))
            .Callback<IReadOnlyList<string>>(groups => capturedGroups = groups)
            .Returns(mockClientProxy.Object);

        var service = new SignalRHubNotificationService(mockHubContext.Object, NullLogger<SignalRHubNotificationService>.Instance);
        var merchantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var courierId = Guid.NewGuid();

        // Act - Kuryeye atanan sipariş (courierId belirtilmiş)
        await service.SendOrderStatusChangedAsync(merchantId, orderId, "Assigned", "Ahmet kurye siparişe atandı.", courierId: courierId);

        // Assert
        capturedGroups.Should().NotBeNull();
        capturedGroups.Should().Contain($"merchant_{merchantId}");
        capturedGroups.Should().Contain("firm_admin");
        capturedGroups.Should().Contain($"courier_{courierId}", "Kuryeye atanan sipariş doğrudan o kuryenin mobil dinleyicisine düşmelidir.");
    }

    [Fact]
    public void JwtService_GenerateCompanyUserToken_ShouldContainCorrectClaims()
    {
        // Arrange
        var jwtSettings = Options.Create(new KuryeSistemi.Application.Common.Settings.JwtSettings
        {
            SecretKey = "SuperSecretKeyForMultiTenantTesting1234567890!",
            Issuer = "KuryeSistemi",
            Audience = "KuryeSistemi",
            ExpiryMinutes = 60
        });

        var jwtService = new JwtService(jwtSettings);
        var userId = Guid.NewGuid();
        var companyId = Guid.NewGuid();
        var email = "operator@expresskurye.com";
        var role = "CompanyUser_Operator";

        // Act
        var token = jwtService.GenerateCompanyUserToken(userId, companyId, email, role);

        // Assert
        token.Should().NotBeNullOrWhiteSpace();
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        jwt.Claims.Should().Contain(c => c.Type == "companyUserId" && c.Value == userId.ToString());
        jwt.Claims.Should().Contain(c => c.Type == "courierCompanyId" && c.Value == companyId.ToString());
        jwt.Claims.Should().Contain(c => c.Type == ClaimTypes.Role && c.Value == role);
        jwt.Claims.Should().Contain(c => c.Type == ClaimTypes.Role && c.Value == AppRoles.CompanyUser);
    }

    [Fact]
    public void CompanyUser_RoleDefaults_ManagerShouldHaveAllPermissions()
    {
        // Arrange
        var manager = new CompanyUser
        {
            Role = CompanyUserRole.Manager,
            FirstName = "Ali",
            LastName = "Yılmaz",
            Email = "ali@kuryefirma.com"
        };

        // Assert
        manager.HasPermission(CompanyPermission.ManageCouriers).Should().BeTrue();
        manager.HasPermission(CompanyPermission.ManageOrders).Should().BeTrue();
        manager.HasPermission(CompanyPermission.ManageFinance).Should().BeTrue();
        manager.HasPermission(CompanyPermission.ViewReports).Should().BeTrue();
        manager.HasPermission(CompanyPermission.EditCompanySettings).Should().BeTrue();
    }

    [Fact]
    public void CompanyUser_RoleDefaults_SupportShouldNotManageFinance()
    {
        // Arrange
        var support = new CompanyUser
        {
            Role = CompanyUserRole.Support,
            FirstName = "Ayşe",
            LastName = "Demir",
            Email = "ayse@kuryefirma.com"
        };

        // Assert
        support.HasPermission(CompanyPermission.ManageOrders).Should().BeTrue();
        support.HasPermission(CompanyPermission.ManageFinance).Should().BeFalse("Destek personeli finans yönetemez.");
        support.HasPermission(CompanyPermission.EditCompanySettings).Should().BeFalse("Destek personeli firma ayarlarını değiştiremez.");
    }
}
