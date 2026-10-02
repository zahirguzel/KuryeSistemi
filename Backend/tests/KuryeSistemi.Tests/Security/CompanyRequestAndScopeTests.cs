using FluentAssertions;
using KuryeSistemi.Application.DTOs.Company;
using KuryeSistemi.Application.Validators.Company;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using KuryeSistemi.Infrastructure.Persistence;
using KuryeSistemi.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Tests.Security;

public class CompanyRequestAndScopeTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(10_000_001)]
    public void TopUp_GecersizMiktar_Reddedilir(int amount)
    {
        new CreditTopUpRequestValidator().Validate(new CreditTopUpRequest(amount, null, null))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public void TopUp_GecerliMiktar_Kabul()
    {
        new CreditTopUpRequestValidator().Validate(new CreditTopUpRequest(500, "REF1", null))
            .IsValid.Should().BeTrue();
    }

    [Fact]
    public void Adjust_SifirVeGerekcesiz_Reddedilir()
    {
        var v = new CreditAdjustRequestValidator();
        v.Validate(new CreditAdjustRequest(0, "x")).IsValid.Should().BeFalse();
        v.Validate(new CreditAdjustRequest(10, " ")).IsValid.Should().BeFalse();
        v.Validate(new CreditAdjustRequest(-10, "düzeltme")).IsValid.Should().BeTrue();
    }

    [Fact]
    public void CompanyUser_EksikAlanVeGecersizRol_Reddedilir()
    {
        var v = new CreateCompanyUserRequestValidator();
        v.Validate(new CreateCompanyUserRequest(null!, "S", "a@b.com", "123456", null)).IsValid.Should().BeFalse();
        v.Validate(new CreateCompanyUserRequest("A", "S", "gecersiz", "123456", null)).IsValid.Should().BeFalse();
        v.Validate(new CreateCompanyUserRequest("A", "S", "a@b.com", "123", null)).IsValid.Should().BeFalse();
        v.Validate(new CreateCompanyUserRequest("A", "S", "a@b.com", "123456", null, (CompanyUserRole)99)).IsValid.Should().BeFalse();
        v.Validate(new CreateCompanyUserRequest("A", "S", "a@b.com", "123456", null)).IsValid.Should().BeTrue();
    }

    [Fact]
    public void Admin_KisaSifre_Reddedilir()
    {
        var v = new CreateAdminRequestValidator();
        v.Validate(new CreateAdminRequest("Ad", "a@b.com", "1234567")).IsValid.Should().BeFalse();
        v.Validate(new CreateAdminRequest("Ad", "a@b.com", "12345678")).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task SiparisListesi_MerchantKapsamiVeritabaninda_Uygulanir()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var merchant1 = new Merchant { Email = "a@a.com" }; var merchant2 = new Merchant { Email = "b@b.com" };
        var m1 = merchant1.Id; var m2 = merchant2.Id;
        db.Merchants.AddRange(merchant1, merchant2);
        db.Orders.AddRange(new Order { MerchantId = m1 }, new Order { MerchantId = m1 }, new Order { MerchantId = m2 });
        await db.SaveChangesAsync();
        var repo = new OrderRepository(db);

        (await repo.GetAllWithDetailsAsync(null, false, new[] { m1 })).Should().HaveCount(2);
        (await repo.GetAllWithDetailsAsync(null, false, new[] { Guid.NewGuid() })).Should().BeEmpty();
        (await repo.GetAllWithDetailsAsync(null, false, null)).Should().HaveCount(3); // SuperAdmin
    }
}
