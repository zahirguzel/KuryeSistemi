using FluentAssertions;
using KuryeSistemi.API.Controllers.Couriers;
using KuryeSistemi.API.Controllers.Merchants;
using KuryeSistemi.API.Controllers.Orders;
using KuryeSistemi.API.Controllers.Products;
using KuryeSistemi.API.Controllers.Reconciliation;
using KuryeSistemi.Application.DTOs.Merchants;
using Microsoft.AspNetCore.Authorization;
using System.Reflection;

namespace KuryeSistemi.Tests.Security;

public class AuthorizationTests
{
    [Fact]
    public void UpdateMerchantSettingsDto_ShouldNotContainRoleProperty_ToPreventPrivilegeEscalation()
    {
        // Assert: DTO içerisinde Role özelliği bulunmamalıdır (Kullanıcı kendini Admin yapamaz)
        var roleProperty = typeof(UpdateMerchantSettingsDto).GetProperty("Role", BindingFlags.Public | BindingFlags.Instance);
        roleProperty.Should().BeNull("Normal işletmeler veya saldırganlar ayar güncelleme üzerinden rol yükseltemez.");
    }

    [Fact]
    public void ReconciliationController_ShouldBeRestrictedFromCouriers()
    {
        // Assert: ReconciliationController Courier rolüne açık olmamalıdır
        var authorizeAttr = typeof(ReconciliationController).GetCustomAttribute<AuthorizeAttribute>();
        authorizeAttr.Should().NotBeNull();
        var roles = (authorizeAttr!.Roles ?? "").Split(',', StringSplitOptions.TrimEntries);
        roles.Should().NotContain("Courier", "Kuryeler kendi kasalarını ve borçlarını sıfırlama yetkisine sahip olamaz.");
    }

    [Fact]
    public void CouriersController_ToggleShift_ShouldRequireManagerOrAdminRoles()
    {
        var method = typeof(CouriersController).GetMethod("ToggleCourierShift");
        method.Should().NotBeNull();

        var authorizeAttr = method!.GetCustomAttribute<AuthorizeAttribute>();
        authorizeAttr.Should().NotBeNull();
        var roles = (authorizeAttr!.Roles ?? "").Split(',', StringSplitOptions.TrimEntries);
        roles.Should().Contain("Merchant");
        roles.Should().Contain("CourierFirm");
        roles.Should().NotContain("Courier", "Bir kurye başka bir kuryenin vardiyasını değiştiremez.");
    }

    [Fact]
    public void ProductsController_ShouldRequireMerchantOnlyPolicy()
    {
        var authorizeAttr = typeof(ProductsController).GetCustomAttribute<AuthorizeAttribute>();
        authorizeAttr.Should().NotBeNull();
        authorizeAttr!.Policy.Should().Be("MerchantOnly", "Ürün yönetimi yalnızca işletme ve yöneticilere açıktır.");
    }

    [Fact]
    public void OrdersController_ClaimOrder_ShouldOnlyBeAllowedForCouriers()
    {
        var method = typeof(OrdersController).GetMethod("ClaimOrder");
        method.Should().NotBeNull();

        var authorizeAttr = method!.GetCustomAttribute<AuthorizeAttribute>();
        authorizeAttr.Should().NotBeNull();
        authorizeAttr!.Roles.Should().Be("Courier", "Sipariş havuzundan paket alma yalnızca kuryelere açıktır.");
    }
}
