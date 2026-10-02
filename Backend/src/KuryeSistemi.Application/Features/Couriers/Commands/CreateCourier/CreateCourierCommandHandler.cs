using KuryeSistemi.Application.Features.Couriers.DTOs;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Features.Couriers.Commands.CreateCourier;

/// <summary>
/// CreateCourierCommand'ı işleyen handler.
/// İşletme varlığını doğrular, plaka ve telefon benzersizliğini kontrol eder,
/// yeni Courier kaydını oluşturur ve CourierDto döner.
/// </summary>
public sealed class CreateCourierCommandHandler
    : IRequestHandler<CreateCourierCommand, CourierDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasherService _passwordHasherService;

    public CreateCourierCommandHandler(
        IApplicationDbContext db,
        IPasswordHasherService passwordHasherService)
    {
        _db = db;
        _passwordHasherService = passwordHasherService;
    }

    public async Task<CourierDto> Handle(
        CreateCourierCommand command,
        CancellationToken cancellationToken)
    {
        // --- İşletme var mı? (Tenant doğrulaması) ---
        var merchantExists = await _db.Merchants
            .AnyAsync(m => m.Id == command.MerchantId, cancellationToken);

        if (!merchantExists)
            throw new InvalidOperationException(
                $"MerchantId '{command.MerchantId}' bulunamadı.");

        // --- Plaka benzersizlik kontrolü ---
        var plateExists = await _db.Couriers
            .AnyAsync(c => c.LicensePlate == command.LicensePlate.ToUpperInvariant(), cancellationToken);

        if (plateExists)
            throw new InvalidOperationException(
                $"'{command.LicensePlate}' plakalı araç zaten kayıtlı.");

        // --- Telefon benzersizlik kontrolü ---
        var phoneExists = await _db.Couriers
            .AnyAsync(c => c.PhoneNumber == command.PhoneNumber, cancellationToken);

        if (phoneExists)
            throw new InvalidOperationException(
                $"'{command.PhoneNumber}' telefon numarası zaten kayıtlı.");

        // --- Yeni Courier entity oluştur ---
        var rawPassword = !string.IsNullOrWhiteSpace(command.Password) ? command.Password : "sifre123";

        var courier = new Courier
        {
            MerchantId   = command.MerchantId,
            FirstName    = command.FirstName.Trim(),
            LastName     = command.LastName.Trim(),
            PhoneNumber  = command.PhoneNumber.Trim(),
            Email        = command.Email.Trim().ToLowerInvariant(),
            PasswordHash = _passwordHasherService.HashPassword(rawPassword),
            VehicleType  = command.VehicleType,
            LicensePlate = command.LicensePlate.Trim().ToUpperInvariant(),
            VehicleBrand = command.VehicleBrand.Trim(),
            VehicleModel = command.VehicleModel.Trim(),
            IsAvailable  = true,
            CreatedBy    = "system" // İleride ICurrentUserService'ten alınacak
        };

        _db.Couriers.Add(courier);
        await _db.SaveChangesAsync(cancellationToken);

        return new CourierDto(
            courier.Id,
            courier.MerchantId,
            courier.FirstName,
            courier.LastName,
            courier.PhoneNumber,
            courier.Email,
            courier.VehicleType,
            courier.LicensePlate,
            courier.VehicleBrand,
            courier.VehicleModel,
            courier.IsAvailable,
            courier.CurrentBalance,
            courier.CreatedAt);
    }
}
