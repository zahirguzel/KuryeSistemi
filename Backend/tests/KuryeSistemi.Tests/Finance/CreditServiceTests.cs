using FluentAssertions;
using KuryeSistemi.Application.Services.Concrete;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using KuryeSistemi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace KuryeSistemi.Tests.Finance;

public class CreditServiceTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static CreditService NewService(AppDbContext db) => new(db, NullLogger<CreditService>.Instance);

    private static async Task<(CourierCompany Company, Merchant Merchant, Order Order)> SeedDeliveredOrderAsync(
        AppDbContext db, int balance = 10, bool linkedToCompany = true, OrderStatus status = OrderStatus.Delivered)
    {
        var company = new CourierCompany { Name = "F", Email = "f@f.com", CreditBalance = balance };
        var merchant = new Merchant { Email = "m@m.com", CourierCompanyId = linkedToCompany ? company.Id : null };
        var order = new Order { MerchantId = merchant.Id, Status = status };
        db.CourierCompanies.Add(company); db.Merchants.Add(merchant); db.Orders.Add(order);
        await db.SaveChangesAsync();
        return (company, merchant, order);
    }

    [Fact]
    public async Task TopUp_BakiyeyiArtirir_VeDefterKaydiYazar()
    {
        await using var db = NewDb();
        var (company, _, _) = await SeedDeliveredOrderAsync(db, balance: 5);

        var result = await NewService(db).TopUpAsync(company.Id, 100, "REF", "not", "admin-1");

        result.IsSuccess.Should().BeTrue();
        result.Data!.CreditBalance.Should().Be(105);
        var tx = await db.CreditTransactions.SingleAsync();
        tx.Type.Should().Be(CreditTransactionType.TopUp);
        tx.BalanceAfter.Should().Be(105);
    }

    [Fact]
    public async Task Adjust_BakiyeyiNegatifeDusuruyorsa_Reddedilir_DefterDegismez()
    {
        await using var db = NewDb();
        var (company, _, _) = await SeedDeliveredOrderAsync(db, balance: 5);

        var result = await NewService(db).AdjustAsync(company.Id, -10, "hata düzeltme", "admin-1");

        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(400);
        (await db.CourierCompanies.SingleAsync()).CreditBalance.Should().Be(5);
        (await db.CreditTransactions.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Adjust_TaşmaYaratanArtis_Reddedilir()
    {
        await using var db = NewDb();
        var (company, _, _) = await SeedDeliveredOrderAsync(db, balance: int.MaxValue - 1);

        var result = await NewService(db).AdjustAsync(company.Id, 10, "x", "admin-1");

        result.IsSuccess.Should().BeFalse();
    }

    [Fact]
    public async Task DeductForDelivery_TeslimEdilenSiparisten_BirKontorDuser()
    {
        await using var db = NewDb();
        var (company, _, order) = await SeedDeliveredOrderAsync(db, balance: 10);

        var result = await NewService(db).DeductForDeliveryAsync(order.Id);

        result.IsSuccess.Should().BeTrue();
        (await db.CourierCompanies.SingleAsync(c => c.Id == company.Id)).CreditBalance.Should().Be(9);
        var tx = await db.CreditTransactions.SingleAsync();
        tx.Type.Should().Be(CreditTransactionType.DeliveryDeduction);
        tx.OrderId.Should().Be(order.Id);
        tx.Amount.Should().Be(-1);
    }

    [Fact]
    public async Task DeductForDelivery_AyniSiparisIkiKezCagrilirsa_BirKezDuser()
    {
        await using var db = NewDb();
        var (company, _, order) = await SeedDeliveredOrderAsync(db, balance: 10);
        var service = NewService(db);

        await service.DeductForDeliveryAsync(order.Id);
        var second = await service.DeductForDeliveryAsync(order.Id);

        second.IsSuccess.Should().BeTrue();
        (await db.CourierCompanies.SingleAsync(c => c.Id == company.Id)).CreditBalance.Should().Be(9);
        (await db.CreditTransactions.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task DeductForDelivery_FirmayaBagliOlmayanIsletme_KontorDusmez()
    {
        await using var db = NewDb();
        var (company, _, order) = await SeedDeliveredOrderAsync(db, balance: 10, linkedToCompany: false);

        var result = await NewService(db).DeductForDeliveryAsync(order.Id);

        result.IsSuccess.Should().BeTrue();
        (await db.CourierCompanies.SingleAsync(c => c.Id == company.Id)).CreditBalance.Should().Be(10);
        (await db.CreditTransactions.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task DeductForDelivery_TeslimEdilmemisSiparis_Reddedilir()
    {
        await using var db = NewDb();
        var (_, _, order) = await SeedDeliveredOrderAsync(db, status: OrderStatus.Assigned);

        var result = await NewService(db).DeductForDeliveryAsync(order.Id);

        result.IsSuccess.Should().BeFalse();
        (await db.CreditTransactions.CountAsync()).Should().Be(0);
    }

    [Theory]
    [InlineData(0, true, false)]   // bakiye tükendi + engelleme açık -> reddedilir
    [InlineData(0, false, true)]   // engelleme kapalı -> serbest
    [InlineData(3, true, true)]    // bakiye var -> serbest
    public async Task EnsureCanCreateOrder_BakiyeVeAyaraGoreKarar(int balance, bool block, bool allowed)
    {
        await using var db = NewDb();
        var (company, merchant, _) = await SeedDeliveredOrderAsync(db, balance: balance);
        company.BlockOnZeroCredit = block;
        await db.SaveChangesAsync();

        var result = await NewService(db).EnsureCanCreateOrderAsync(merchant.Id);

        result.IsSuccess.Should().Be(allowed);
        if (!allowed) result.StatusCode.Should().Be(402);
    }

    [Fact]
    public async Task EnsureCanCreateOrder_FirmayaBagliOlmayanIsletme_Serbest()
    {
        await using var db = NewDb();
        var (_, merchant, _) = await SeedDeliveredOrderAsync(db, balance: 0, linkedToCompany: false);

        (await NewService(db).EnsureCanCreateOrderAsync(merchant.Id)).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task GetHistory_SayfaBoyutuUstSinirlaKisitlanir()
    {
        await using var db = NewDb();
        var (company, _, _) = await SeedDeliveredOrderAsync(db);

        var result = await NewService(db).GetHistoryAsync(company.Id, page: -3, size: 1_000_000);

        result.Data!.Page.Should().Be(1);
        result.Data.Size.Should().Be(200);
    }
}
