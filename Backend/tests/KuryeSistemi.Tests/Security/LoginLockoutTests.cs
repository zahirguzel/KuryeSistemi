using FluentAssertions;
using KuryeSistemi.Application.Common.Settings;
using KuryeSistemi.Application.DTOs.Auth;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Concrete;
using KuryeSistemi.Application.Validators.Auth;
using KuryeSistemi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace KuryeSistemi.Tests.Security;

public class LoginLockoutTests
{
    private static DistributedLoginAttemptTracker NewTracker() =>
        new(new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions())),
            NullLogger<DistributedLoginAttemptTracker>.Instance);

    [Fact]
    public async Task BesHataliDenemeSonrasi_HesapKilitlenir_BasariliGirisSayaciSifirlar()
    {
        var tracker = NewTracker();

        for (var i = 0; i < DistributedLoginAttemptTracker.MaxFailures - 1; i++)
            await tracker.RegisterFailureAsync("a@b.com");
        (await tracker.GetLockoutRemainingAsync("a@b.com")).Should().BeNull("eşik henüz aşılmadı");

        await tracker.RegisterFailureAsync("A@B.com"); // büyük/küçük harf aynı hesap
        (await tracker.GetLockoutRemainingAsync("a@b.com")).Should().NotBeNull();

        await tracker.ResetAsync("a@b.com");
        (await tracker.GetLockoutRemainingAsync("a@b.com")).Should().BeNull();
    }

    [Fact]
    public async Task KilitliHesap_BaskaHesabiEtkilemez()
    {
        var tracker = NewTracker();
        for (var i = 0; i < DistributedLoginAttemptTracker.MaxFailures; i++)
            await tracker.RegisterFailureAsync("kilitli@b.com");

        (await tracker.GetLockoutRemainingAsync("baska@b.com")).Should().BeNull();
    }

    private static AuthService NewAuthService(Mock<ILoginAttemptTracker> tracker)
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

        return new AuthService(
            new Mock<IMerchantRepository>().Object,
            new Mock<ICourierRepository>().Object,
            db,
            new Mock<IJwtService>().Object,
            new Mock<IPasswordHasherService>().Object,
            Options.Create(new JwtSettings()),
            tracker.Object);
    }

    [Fact]
    public async Task Login_HesapKilitliyse_429DonerVeKimlikDogrulamayaGirmez()
    {
        var tracker = new Mock<ILoginAttemptTracker>();
        tracker.Setup(t => t.GetLockoutRemainingAsync("x@y.com", It.IsAny<CancellationToken>()))
               .ReturnsAsync(TimeSpan.FromMinutes(7));

        var result = await NewAuthService(tracker).LoginAsync(new LoginRequestDto("x@y.com", "sifre123"));

        result.StatusCode.Should().Be(429);
        result.Message.Should().Contain("7 dakika");
        tracker.Verify(t => t.RegisterFailureAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Login_HataliBilgi_SayaciArtirir()
    {
        var tracker = new Mock<ILoginAttemptTracker>();
        tracker.Setup(t => t.GetLockoutRemainingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync((TimeSpan?)null);

        var result = await NewAuthService(tracker).LoginAsync(new LoginRequestDto("yok@y.com", "yanlis123"));

        result.StatusCode.Should().Be(401);
        tracker.Verify(t => t.RegisterFailureAsync("yok@y.com", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public void ChangePasswordValidator_KisaAyniVeBosSifreleriReddeder()
    {
        var v = new ChangePasswordRequestDtoValidator();
        v.Validate(new ChangePasswordRequestDto("", "yeni123")).IsValid.Should().BeFalse();
        v.Validate(new ChangePasswordRequestDto("eski123", "123")).IsValid.Should().BeFalse();
        v.Validate(new ChangePasswordRequestDto("eski123", "eski123")).IsValid.Should().BeFalse();
        v.Validate(new ChangePasswordRequestDto("eski123", "yeni123")).IsValid.Should().BeTrue();
    }
}
