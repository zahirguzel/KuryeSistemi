using System.Security.Claims;
using FluentAssertions;
using KuryeSistemi.API.Extensions;
using KuryeSistemi.Application.DTOs.Company;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Services.Concrete;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using KuryeSistemi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Moq;

namespace KuryeSistemi.Tests.Security;

public class CompanyServicesTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static IPasswordHasherService Hasher()
    {
        var m = new Mock<IPasswordHasherService>();
        m.Setup(h => h.HashPassword(It.IsAny<string>())).Returns<string>(p => "hash:" + p);
        return m.Object;
    }

    // ── CompanyService ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateUser_EmailBaskaHesapTablosundaVarsa_Conflict()
    {
        await using var db = NewDb();
        var company = new CourierCompany { Name = "F", Email = "f@f.com" };
        db.CourierCompanies.Add(company);
        db.Merchants.Add(new Merchant { Email = "ortak@x.com" });
        await db.SaveChangesAsync();

        var result = await new CompanyService(db, Hasher()).CreateUserAsync(
            company.Id, new CreateCompanyUserRequest("A", "B", "Ortak@X.com", "123456", null), "actor");

        result.StatusCode.Should().Be(409);
    }

    [Fact]
    public async Task CreateUser_FirmaKimligiYoksa_BadRequest_VeKullaniciYazilmaz()
    {
        await using var db = NewDb();

        var result = await new CompanyService(db, Hasher()).CreateUserAsync(
            Guid.Empty, new CreateCompanyUserRequest("A", "B", "a@b.com", "123456", null), "actor");

        result.StatusCode.Should().Be(400);
        (await db.CompanyUsers.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task CreateUser_Basarili_SifreHashlenirVeEmailKucukHarfeCevrilir()
    {
        await using var db = NewDb();
        var company = new CourierCompany { Name = "F", Email = "f@f.com" };
        db.CourierCompanies.Add(company);
        await db.SaveChangesAsync();

        var result = await new CompanyService(db, Hasher()).CreateUserAsync(
            company.Id, new CreateCompanyUserRequest(" Ayşe ", "Kaya", " Ayse@F.com ", "123456", null, CompanyUserRole.Accountant), "actor");

        result.StatusCode.Should().Be(201);
        var user = await db.CompanyUsers.SingleAsync();
        user.Email.Should().Be("ayse@f.com");
        user.FirstName.Should().Be("Ayşe");
        user.PasswordHash.Should().Be("hash:123456");
        user.Role.Should().Be(CompanyUserRole.Accountant);
    }

    [Fact]
    public async Task UpdatePermissions_BaskaFirmaninKullanicisi_BulunamazDoner()
    {
        await using var db = NewDb();
        var firmaA = new CourierCompany { Name = "A", Email = "a@a.com" };
        var firmaB = new CourierCompany { Name = "B", Email = "b@b.com" };
        var user = new CompanyUser { CourierCompanyId = firmaB.Id, CourierCompany = firmaB, Email = "u@b.com" };
        db.CourierCompanies.AddRange(firmaA, firmaB); db.CompanyUsers.Add(user);
        await db.SaveChangesAsync();

        var result = await new CompanyService(db, Hasher()).UpdateUserPermissionsAsync(
            firmaA.Id, user.Id, new UpdatePermissionsRequest(true, true, true, true, true, true), "actor");

        result.StatusCode.Should().Be(404, "bir firma başka firmanın kullanıcısını yönetemez (tenant izolasyonu)");
    }

    [Fact]
    public async Task GetUsers_YalnizcaKendiFirmasininKullanicilariVeEfektifIzinler()
    {
        await using var db = NewDb();
        var firmaA = new CourierCompany { Name = "A", Email = "a@a.com" };
        var firmaB = new CourierCompany { Name = "B", Email = "b@b.com" };
        db.CourierCompanies.AddRange(firmaA, firmaB);
        db.CompanyUsers.AddRange(
            new CompanyUser { CourierCompanyId = firmaA.Id, CourierCompany = firmaA, Email = "m@a.com", FirstName = "M", Role = CompanyUserRole.Support },
            new CompanyUser { CourierCompanyId = firmaB.Id, CourierCompany = firmaB, Email = "x@b.com", FirstName = "X" });
        await db.SaveChangesAsync();

        var result = await new CompanyService(db, Hasher()).GetUsersAsync(firmaA.Id);

        var u = result.Data!.Should().ContainSingle().Subject;
        u.Permissions.ManageOrders.Should().BeTrue();   // Support: yalnızca sipariş
        u.Permissions.ManageFinance.Should().BeFalse();
    }

    [Fact]
    public async Task GetCompany_KontorUyariEsiginiAltindaysaIsLowCredit()
    {
        await using var db = NewDb();
        var company = new CourierCompany { Name = "A", Email = "a@a.com", CreditBalance = 50, CreditWarningThreshold = 100 };
        db.CourierCompanies.Add(company);
        await db.SaveChangesAsync();

        var result = await new CompanyService(db, Hasher()).GetCompanyAsync(company.Id);

        result.Data!.IsLowCredit.Should().BeTrue();
    }

    // ── CompanyAdminService ───────────────────────────────────────────────────

    [Fact]
    public async Task CreateCompany_AcilisKontoruVarsaDefterKaydiYazilir()
    {
        await using var db = NewDb();

        var result = await new CompanyAdminService(db, Hasher()).CreateCompanyAsync(
            new CreateCompanyRequest("Yeni Firma", "Yeni@Firma.com", null, null, null, InitialCredit: 250), "admin-1");

        result.StatusCode.Should().Be(201);
        (await db.CourierCompanies.SingleAsync()).Email.Should().Be("yeni@firma.com");
        (await db.CreditTransactions.SingleAsync()).BalanceAfter.Should().Be(250);
    }

    [Fact]
    public async Task CreateAdmin_EmailBaskaTablodaVarsa_Conflict()
    {
        await using var db = NewDb();
        db.Couriers.Add(new Courier { Email = "kurye@x.com" });
        await db.SaveChangesAsync();

        var result = await new CompanyAdminService(db, Hasher()).CreateAdminAsync(
            new CreateAdminRequest("Ad", "kurye@x.com", "12345678"), "admin-1");

        result.StatusCode.Should().Be(409);
    }

    [Fact]
    public async Task ToggleCompanyActive_DurumuTersCevirir()
    {
        await using var db = NewDb();
        var company = new CourierCompany { Name = "A", Email = "a@a.com", IsActive = true };
        db.CourierCompanies.Add(company);
        await db.SaveChangesAsync();

        await new CompanyAdminService(db, Hasher()).ToggleCompanyActiveAsync(company.Id, "admin-1");

        (await db.CourierCompanies.SingleAsync()).IsActive.Should().BeFalse();
    }

    // ── Şifre değişimi sonrası token iptali ──────────────────────────────────

    private static ClaimsPrincipal Token(string idClaim, Guid id, DateTimeOffset issuedAt) =>
        new(new ClaimsIdentity(new[]
        {
            new Claim(idClaim, id.ToString()),
            new Claim("iat", issuedAt.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        }, "test"));

    [Fact]
    public async Task SifreDegisiminedenOnceUretilenToken_Reddedilir_SonrakiKabulEdilir()
    {
        await using var db = NewDb();
        var admin = new AdminUser { Email = "a@a.com", IsActive = true, PasswordChangedAt = DateTime.UtcNow };
        db.AdminUsers.Add(admin);
        await db.SaveChangesAsync();

        var eski = Token("adminUserId", admin.Id, DateTimeOffset.UtcNow.AddMinutes(-10));
        var yeni = Token("adminUserId", admin.Id, DateTimeOffset.UtcNow.AddSeconds(1));
        var cache = new MemoryCache(new MemoryCacheOptions());

        (await ActiveAccountValidator.IsActiveAsync(eski, db, cache)).Should().BeFalse();
        (await ActiveAccountValidator.IsActiveAsync(yeni, db, cache)).Should().BeTrue();
    }

    [Fact]
    public async Task SifreHicDegismediyse_IatsizTokenYineDeKabulEdilir()
    {
        await using var db = NewDb();
        var admin = new AdminUser { Email = "a@a.com", IsActive = true };
        db.AdminUsers.Add(admin);
        await db.SaveChangesAsync();

        var token = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("adminUserId", admin.Id.ToString()) }, "test"));

        (await ActiveAccountValidator.IsActiveAsync(token, db, new MemoryCache(new MemoryCacheOptions()))).Should().BeTrue();
    }
}
