using FluentAssertions;
using KuryeSistemi.Application.DTOs.Orders;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using KuryeSistemi.Infrastructure.Persistence;
using KuryeSistemi.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Tests.Operations;

public class OrderPagingTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static Order NewOrder(Merchant m, OrderStatus status, string recipient = "Müşteri", DateTime? createdAt = null) =>
        new()
        {
            MerchantId = m.Id, Merchant = m, Status = status, RecipientName = recipient, RecipientPhone = "0555",
            DeliveryAddressLine = "Adres", CreatedAt = createdAt ?? DateTime.UtcNow
        };

    private static async Task<(OrderRepository Repo, Merchant M1, Merchant M2)> SeedAsync()
    {
        var db = NewDb();
        var m1 = new Merchant { Email = "m1@x.com", Name = "Pideci" };
        var m2 = new Merchant { Email = "m2@x.com", Name = "Kebapçı" };
        db.Merchants.AddRange(m1, m2);
        db.Orders.AddRange(
            NewOrder(m1, OrderStatus.Pending, "Ali"),
            NewOrder(m1, OrderStatus.Delivered, "Veli"),
            NewOrder(m1, OrderStatus.Cancelled, "Ayşe"),
            NewOrder(m2, OrderStatus.Pending, "Mehmet"));
        await db.SaveChangesAsync();
        return (new OrderRepository(db), m1, m2);
    }

    [Fact]
    public async Task TenantKapsami_DigerRestoranlarinSiparisleriniHicDondurmez()
    {
        var (repo, m1, _) = await SeedAsync();

        var page = await repo.GetPagedAsync(new OrderListQuery(new[] { m1.Id }));

        page.Total.Should().Be(3);
        page.Items.Should().OnlyContain(o => o.MerchantId == m1.Id);
    }

    [Fact]
    public async Task DurumFiltresi_ListeyiDaraltir_ancakSayaclarTumDurumlariGosterir()
    {
        var (repo, m1, _) = await SeedAsync();

        var page = await repo.GetPagedAsync(new OrderListQuery(new[] { m1.Id }, Statuses: new[] { OrderStatus.Pending }));

        page.Total.Should().Be(1);
        page.StatusCounts[OrderStatus.Delivered].Should().Be(1);
        page.StatusCounts[OrderStatus.Cancelled].Should().Be(1);
    }

    [Fact]
    public async Task Sayfalama_ToplamiVeSayfaIcerigiDogruHesaplar()
    {
        var (repo, _, _) = await SeedAsync(); // 4 sipariş, kısıtsız (SuperAdmin)

        var first = await repo.GetPagedAsync(new OrderListQuery(null, Page: 1, Size: 3));
        var second = await repo.GetPagedAsync(new OrderListQuery(null, Page: 2, Size: 3));

        first.Total.Should().Be(4);
        first.Items.Should().HaveCount(3);
        second.Items.Should().HaveCount(1);
        first.Items.Select(o => o.Id).Intersect(second.Items.Select(o => o.Id)).Should().BeEmpty();
    }

    [Fact]
    public async Task Arama_AliciRestoranAdiVeBuyukKucukHarfeDuyarsiz()
    {
        var (repo, _, _) = await SeedAsync();

        (await repo.GetPagedAsync(new OrderListQuery(null, Search: "ALI"))).Total.Should().Be(1);
        (await repo.GetPagedAsync(new OrderListQuery(null, Search: "mehmet"))).Total.Should().Be(1);
        (await repo.GetPagedAsync(new OrderListQuery(null, Search: "KEBAP"))).Items.Should().OnlyContain(o => o.Merchant.Name == "Kebapçı");
    }

    [Fact]
    public async Task TarihAraligi_CreatedAtUzerindenFiltrelenir()
    {
        var db = NewDb();
        var m = new Merchant { Email = "m@x.com", Name = "R" };
        db.Merchants.Add(m);
        db.Orders.AddRange(NewOrder(m, OrderStatus.Delivered), NewOrder(m, OrderStatus.Delivered));
        await db.SaveChangesAsync();

        // CreatedAt SaveChanges'te otomatik doldurulur ve sonradan değiştirilemez; bu yüzden
        // aralık, "şimdi" etrafında seçilir: dün-yarın aralığı ikisini de içerir, gelecek aralığı hiçbirini.
        var repo = new OrderRepository(db);
        (await repo.GetPagedAsync(new OrderListQuery(null, FromUtc: DateTime.UtcNow.AddDays(-1), ToUtc: DateTime.UtcNow.AddDays(1)))).Total.Should().Be(2);
        (await repo.GetPagedAsync(new OrderListQuery(null, FromUtc: DateTime.UtcNow.AddDays(1)))).Total.Should().Be(0);
        (await repo.GetPagedAsync(new OrderListQuery(null, ToUtc: DateTime.UtcNow.AddDays(-1)))).Total.Should().Be(0);
    }

    [Fact]
    public async Task BosKapsam_HicSiparisDondurmez()
    {
        var (repo, _, _) = await SeedAsync();

        var page = await repo.GetPagedAsync(new OrderListQuery(Array.Empty<Guid>()));

        page.Total.Should().Be(0);
        page.Items.Should().BeEmpty();
    }
}
