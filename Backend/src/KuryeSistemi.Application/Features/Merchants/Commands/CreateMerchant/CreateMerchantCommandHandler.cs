using KuryeSistemi.Application.Features.Merchants.DTOs;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Features.Merchants.Commands.CreateMerchant;

/// <summary>
/// CreateMerchantCommand'ı işleyen handler.
/// Tek sorumluluğu: Komutu alıp yeni Merchant kaydını oluşturmak ve MerchantDto döndürmek.
/// </summary>
public sealed class CreateMerchantCommandHandler
    : IRequestHandler<CreateMerchantCommand, MerchantDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasherService _passwordHasherService;

    public CreateMerchantCommandHandler(
        IApplicationDbContext db,
        IPasswordHasherService passwordHasherService)
    {
        _db = db;
        _passwordHasherService = passwordHasherService;
    }

    public async Task<MerchantDto> Handle(
        CreateMerchantCommand command,
        CancellationToken cancellationToken)
    {
        // --- E-posta benzersizlik kontrolü ---
        var emailExists = await _db.Merchants
            .AnyAsync(m => m.Email == command.Email.ToLowerInvariant(), cancellationToken);

        if (emailExists)
            throw new InvalidOperationException(
                $"'{command.Email}' e-posta adresi zaten kayıtlı.");

        // --- Yeni entity oluştur ---
        var merchant = new Merchant
        {
            Name         = command.Name.Trim(),
            Email        = command.Email.Trim().ToLowerInvariant(),
            PasswordHash = _passwordHasherService.HashPassword(command.Password),
            PhoneNumber  = command.PhoneNumber.Trim(),
            Address      = command.Address.Trim(),
            IsActive     = true,
            CreatedBy    = "system"
        };


        _db.Merchants.Add(merchant);
        await _db.SaveChangesAsync(cancellationToken);

        // --- Domain entity'yi DTO'ya dönüştür ---
        return new MerchantDto(
            merchant.Id,
            merchant.Name,
            merchant.Email,
            merchant.PhoneNumber,
            merchant.Address,
            merchant.IsActive,
            merchant.IsOpen,
            merchant.Latitude,
            merchant.Longitude,
            merchant.CreatedAt,
            merchant.DefaultPackageFee,
            merchant.DispatchMode,
            merchant.ReconciliationPeriod,
            merchant.CourierCutFee,
            merchant.HexagonSizeMeters,
            merchant.MaxCourierDistanceKm,
            merchant.MaxOrdersPerTour,
            merchant.OrderBatchingTimeMinutes,
            merchant.CrossRestaurantDistanceMeters);
    }
}
