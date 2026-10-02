using FluentAssertions;
using Xunit;

namespace KuryeSistemi.Tests.Operations;

public class TimezoneTests
{
    private static readonly TimeZoneInfo TurkeyTz =
        TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "Turkey Standard Time" : "Europe/Istanbul");

    [Fact]
    public void OrderDeliveredAt0030IstanbulTime_ShouldBelongToTodayInIstanbul()
    {
        // 1 Ekim saat 00:30:00 Istanbul saati (UTC+3)
        // UTC karşılığı: 30 Eylül saat 21:30:00 UTC
        var deliveredUtc = new DateTime(2026, 9, 30, 21, 30, 0, DateTimeKind.Utc);

        // Istanbul yerel saatine çevir
        var localDelivery = TimeZoneInfo.ConvertTimeFromUtc(deliveredUtc, TurkeyTz);

        // Assert: Yerel tarihin 1 Ekim olması gerekir
        localDelivery.Year.Should().Be(2026);
        localDelivery.Month.Should().Be(10);
        localDelivery.Day.Should().Be(1);
        localDelivery.Hour.Should().Be(0);
        localDelivery.Minute.Should().Be(30);

        // Gün başlangıcı UTC karşılığı
        var localDate = localDelivery.Date; // 2026-10-01 00:00:00
        var startUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localDate, DateTimeKind.Unspecified), TurkeyTz);
        var endUtc = startUtc.AddDays(1);

        // Assert: deliveredUtc [startUtc, endUtc) aralığında olmalıdır
        deliveredUtc.Should().BeOnOrAfter(startUtc);
        deliveredUtc.Should().BeBefore(endUtc);
    }
}
