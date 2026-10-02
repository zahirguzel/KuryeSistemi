using System.Security.Claims;
using FluentAssertions;
using KuryeSistemi.API.Extensions;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace KuryeSistemi.Tests.Security;

public class ActiveAccountValidatorTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static ClaimsPrincipal Principal(params (string Type, string Value)[] claims) =>
        new(new ClaimsIdentity(claims.Select(c => new Claim(c.Type, c.Value)), "test"));

    private static IMemoryCache NewCache() => new MemoryCache(new MemoryCacheOptions());

    [Fact]
    public async Task PasifCompanyUser_Reddedilir()
    {
        await using var db = NewDb();
        var company = new CourierCompany { Name = "F", Email = "f@f.com", IsActive = true };
        var user = new CompanyUser { CourierCompanyId = company.Id, CourierCompany = company, Email = "u@f.com", IsActive = false };
        db.CourierCompanies.Add(company); db.CompanyUsers.Add(user);
        await db.SaveChangesAsync();

        var ok = await ActiveAccountValidator.IsActiveAsync(
            Principal(("companyUserId", user.Id.ToString())), db, NewCache());

        ok.Should().BeFalse();
    }

    [Fact]
    public async Task AktifCompanyUser_PasifFirmada_Reddedilir()
    {
        await using var db = NewDb();
        var company = new CourierCompany { Name = "F", Email = "f@f.com", IsActive = false };
        var user = new CompanyUser { CourierCompanyId = company.Id, CourierCompany = company, Email = "u@f.com", IsActive = true };
        db.CourierCompanies.Add(company); db.CompanyUsers.Add(user);
        await db.SaveChangesAsync();

        (await ActiveAccountValidator.IsActiveAsync(
            Principal(("companyUserId", user.Id.ToString())), db, NewCache())).Should().BeFalse();
    }

    [Fact]
    public async Task AktifAdmin_KabulEdilir_PasifAdmin_Reddedilir()
    {
        await using var db = NewDb();
        var aktif = new AdminUser { Email = "a@a.com", IsActive = true };
        var pasif = new AdminUser { Email = "b@a.com", IsActive = false };
        db.AdminUsers.AddRange(aktif, pasif);
        await db.SaveChangesAsync();

        (await ActiveAccountValidator.IsActiveAsync(Principal(("adminUserId", aktif.Id.ToString())), db, NewCache())).Should().BeTrue();
        (await ActiveAccountValidator.IsActiveAsync(Principal(("adminUserId", pasif.Id.ToString())), db, NewCache())).Should().BeFalse();
    }

    [Fact]
    public async Task OrtakFiloKuryesi_BosMerchantIdIleAktifFirmadaKabulEdilir()
    {
        await using var db = NewDb();
        var company = new CourierCompany { Name = "F", Email = "f@f.com", IsActive = true };
        var courier = new Courier { CourierCompanyId = company.Id, Email = "k@f.com" };
        db.CourierCompanies.Add(company); db.Couriers.Add(courier);
        await db.SaveChangesAsync();

        var ok = await ActiveAccountValidator.IsActiveAsync(
            Principal(("courierId", courier.Id.ToString()), ("merchantId", Guid.Empty.ToString())), db, NewCache());

        ok.Should().BeTrue();
    }

    [Fact]
    public async Task SilinmisKurye_Reddedilir()
    {
        await using var db = NewDb();
        var company = new CourierCompany { Name = "F", Email = "f@f.com", IsActive = true };
        var courier = new Courier { CourierCompanyId = company.Id, Email = "k@f.com", IsDeleted = true };
        db.CourierCompanies.Add(company); db.Couriers.Add(courier);
        await db.SaveChangesAsync();

        (await ActiveAccountValidator.IsActiveAsync(
            Principal(("courierId", courier.Id.ToString())), db, NewCache())).Should().BeFalse();
    }

    [Fact]
    public async Task PasifMerchant_Reddedilir_TanınmayanToken_Reddedilir()
    {
        await using var db = NewDb();
        var m = new Merchant { Email = "m@m.com", IsActive = false };
        db.Merchants.Add(m);
        await db.SaveChangesAsync();

        (await ActiveAccountValidator.IsActiveAsync(Principal(("merchantId", m.Id.ToString())), db, NewCache())).Should().BeFalse();
        (await ActiveAccountValidator.IsActiveAsync(Principal(), db, NewCache())).Should().BeFalse();
    }
}
