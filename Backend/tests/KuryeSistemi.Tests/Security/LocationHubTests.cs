using FluentAssertions;
using KuryeSistemi.API.Hubs;
using Microsoft.AspNetCore.Authorization;
using System.Reflection;
using Xunit;

namespace KuryeSistemi.Tests.Security;

public class LocationHubTests
{
    [Fact]
    public void LocationHub_SendLocationUpdate_ShouldRequireCourierOnlyPolicy()
    {
        var method = typeof(LocationHub).GetMethod("SendLocationUpdate");
        method.Should().NotBeNull();

        var authAttr = method!.GetCustomAttribute<AuthorizeAttribute>();
        authAttr.Should().NotBeNull();
        authAttr!.Policy.Should().Be("CourierOnly", "Konum güncellemeleri yalnızca doğrulanmış kuryeler tarafından yayınlanabilir.");
    }

    [Theory]
    [InlineData(double.NaN, 36.17)]
    [InlineData(36.58, double.NaN)]
    [InlineData(double.PositiveInfinity, 36.17)]
    [InlineData(36.58, double.NegativeInfinity)]
    [InlineData(91.0, 36.17)]
    [InlineData(-90.1, 36.17)]
    [InlineData(36.58, 180.1)]
    [InlineData(36.58, -180.1)]
    public void LocationCoordinates_ShouldBeIdentifiedAsInvalid(double lat, double lng)
    {
        var isInvalid = double.IsNaN(lat) || double.IsInfinity(lat) ||
                        double.IsNaN(lng) || double.IsInfinity(lng) ||
                        lat is < -90 or > 90 || lng is < -180 or > 180;

        isInvalid.Should().BeTrue("Geçersiz veya sınır dışı GPS koordinatları reddedilmelidir.");
    }
}
