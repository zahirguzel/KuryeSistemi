// Services/Concrete/CourierService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Couriers;
using KuryeSistemi.Application.Features.Couriers.DTOs;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Domain.Entities;

using KuryeSistemi.Application.DTOs.Wallet;

using KuryeSistemi.Application.Interfaces;

namespace KuryeSistemi.Application.Services.Concrete;

public class CourierService : ICourierService
{
    private readonly ICourierRepository _courierRepository;
    private readonly IMerchantRepository _merchantRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IHubNotificationService _notificationService;
    private readonly IPasswordHasherService _passwordHasherService;

    public CourierService(
        ICourierRepository courierRepository,
        IMerchantRepository merchantRepository,
        IOrderRepository orderRepository,
        IHubNotificationService notificationService,
        IPasswordHasherService passwordHasherService)
    {
        _courierRepository = courierRepository;
        _merchantRepository = merchantRepository;
        _orderRepository = orderRepository;
        _notificationService = notificationService;
        _passwordHasherService = passwordHasherService;
    }

    public async Task<ServiceResult<IReadOnlyList<CourierDto>>> GetCouriersByMerchantAsync(
        Guid merchantId,
        bool? isAvailable,
        CancellationToken cancellationToken = default)
    {
        if (merchantId == Guid.Empty)
        {
            return ServiceResult<IReadOnlyList<CourierDto>>.BadRequest("Geçersiz işletme ID'si.");
        }

        var couriers = await _courierRepository.GetCouriersByMerchantAsync(merchantId, isAvailable);
        var dtos = couriers.Select(MapToDto).ToList().AsReadOnly();

        return ServiceResult<IReadOnlyList<CourierDto>>.Success(dtos);
    }

    /// <summary>
    /// Tüm kuryeleri döner. Kurye Firması Paneli için merchant filtresi olmadan.
    /// </summary>
    public async Task<ServiceResult<IReadOnlyList<CourierDto>>> GetAllCouriersAsync(
        CancellationToken cancellationToken = default)
    {
        var couriers = await _courierRepository.GetAllAsync();
        var dtos = couriers.OrderBy(c => c.FirstName).ThenBy(c => c.LastName)
                           .Select(MapToDto).ToList().AsReadOnly();
        return ServiceResult<IReadOnlyList<CourierDto>>.Success(dtos);
    }

    public async Task<ServiceResult<CourierDto>> CreateCourierAsync(
        CreateCourierRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.PhoneNumber) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.LicensePlate) ||
            string.IsNullOrWhiteSpace(request.VehicleBrand) ||
            string.IsNullOrWhiteSpace(request.VehicleModel))
        {
            return ServiceResult<CourierDto>.BadRequest("Tüm zorunlu alanlar doldurulmalıdır.");
        }

        Guid resolvedCompanyId = Guid.Empty;
        Guid? resolvedMerchantId = null;

        if (request.CourierCompanyId.HasValue && request.CourierCompanyId.Value != Guid.Empty)
        {
            resolvedCompanyId = request.CourierCompanyId.Value;
        }

        if (request.MerchantId.HasValue && request.MerchantId.Value != Guid.Empty)
        {
            var merchant = await _merchantRepository.GetByIdAsync(request.MerchantId.Value);
            if (merchant is null)
            {
                return ServiceResult<CourierDto>.NotFound($"İşletme bulunamadı: {request.MerchantId}");
            }
            // Firmanın kendi hesabı (CourierFirm) bir "restoran" değildir: bu seçim ortak filo anlamına gelir (MerchantId = null)
            resolvedMerchantId = merchant.Role == "CourierFirm" ? null : merchant.Id;
            if (resolvedCompanyId == Guid.Empty && merchant.CourierCompanyId.HasValue)
            {
                resolvedCompanyId = merchant.CourierCompanyId.Value;
            }
        }

        if (resolvedCompanyId == Guid.Empty)
        {
            return ServiceResult<CourierDto>.BadRequest("Kuryenin bağlı olacağı kurye lojistik firması (CourierCompanyId) veya geçerli bir işletme belirtilmelidir.");
        }

        var isConflict = await _courierRepository.IsPlateOrPhoneExistsAsync(
            request.LicensePlate, request.PhoneNumber);

        if (isConflict)
        {
            return ServiceResult<CourierDto>.Conflict(
                "Bu plaka veya telefon numarası ile kayıtlı bir kurye zaten mevcut.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var emailConflict = await _courierRepository.GetByEmailAsync(normalizedEmail);
        if (emailConflict is not null)
        {
            return ServiceResult<CourierDto>.Conflict("Bu e-posta adresi ile kayıtlı bir kurye zaten mevcut.");
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            return ServiceResult<CourierDto>.BadRequest("Kurye şifresi en az 6 karakter olmalıdır.");
        }

        var courier = new Courier
        {
            CourierCompanyId = resolvedCompanyId,
            MerchantId       = resolvedMerchantId,
            FirstName        = request.FirstName.Trim(),
            LastName         = request.LastName.Trim(),
            PhoneNumber      = request.PhoneNumber.Trim(),
            Email            = normalizedEmail,
            PasswordHash     = _passwordHasherService.HashPassword(request.Password),
            VehicleType      = request.VehicleType,
            LicensePlate     = request.LicensePlate.Trim().ToUpperInvariant(),
            VehicleBrand     = request.VehicleBrand.Trim(),
            VehicleModel     = request.VehicleModel.Trim(),
            IsAvailable      = true,
            CreatedBy        = "system"
        };

        await _courierRepository.AddAsync(courier);
        await _courierRepository.SaveChangesAsync();

        var dto = MapToDto(courier);
        return ServiceResult<CourierDto>.Created(dto, "Kurye başarıyla oluşturuldu.");
    }

    public async Task<ServiceResult<CourierEarningsDto>> GetTodayEarningsAsync(
        Guid courierId,
        CancellationToken cancellationToken = default)
    {
        if (courierId == Guid.Empty)
        {
            return ServiceResult<CourierEarningsDto>.BadRequest("Geçersiz kurye ID'si.");
        }

        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
        {
            return ServiceResult<CourierEarningsDto>.NotFound($"Kurye bulunamadı: {courierId}");
        }

        var today = DateTime.UtcNow;
        var orders = await _orderRepository.GetDeliveredOrdersByCourierAndDateAsync(courierId, today);

        // Tarihsel Değişmezlik: Kazanç hesabı sadece mühürlü CourierEarning toplamı üzerinden yapılır.
        var totalEarnings = orders.Sum(o => o.CourierEarning);
        var deliveredCount = orders.Count;
        var avgPerPackage = deliveredCount > 0 ? Math.Round(totalEarnings / deliveredCount, 2) : 0.00m;

        var deliveries = orders.Select(o => new DeliveryHistoryItemDto(
            o.Id,
            $"#KS-{o.Id.ToString()[..4].ToUpper()}",
            o.RecipientName,
            string.IsNullOrWhiteSpace(o.DeliveryDistrict) ? o.DeliveryAddressLine : $"{o.DeliveryDistrict}, {o.DeliveryCity}",
            o.DeliveredAt ?? o.CreatedAt,
            o.CourierEarning
        )).ToList().AsReadOnly();

        var earningsDto = new CourierEarningsDto(
            courier.Id,
            $"{courier.FirstName} {courier.LastName}",
            today.Date,
            totalEarnings,
            deliveredCount,
            avgPerPackage,
            deliveries
        );

        return ServiceResult<CourierEarningsDto>.Success(earningsDto, "Günlük hakediş verileri getirildi.");
    }

    public async Task<ServiceResult<CourierEarningsDto>> GetEarningsByDateRangeAsync(
        Guid courierId,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        if (courierId == Guid.Empty)
        {
            return ServiceResult<CourierEarningsDto>.BadRequest("Geçersiz kurye ID'si.");
        }

        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
        {
            return ServiceResult<CourierEarningsDto>.NotFound($"Kurye bulunamadı: {courierId}");
        }

        // Başlangıç tarihi bitiş tarihinden büyükse yer değiştir
        if (startDate > endDate)
        {
            (startDate, endDate) = (endDate, startDate);
        }

        var orders = await _orderRepository.GetDeliveredOrdersByCourierAndDateRangeAsync(courierId, startDate, endDate);

        // Tarihsel Değişmezlik: Kazanç hesabı sadece mühürlü CourierEarning toplamı üzerinden yapılır.
        var totalEarnings = orders.Sum(o => o.CourierEarning);
        var deliveredCount = orders.Count;
        var avgPerPackage = deliveredCount > 0 ? Math.Round(totalEarnings / deliveredCount, 2) : 0.00m;

        var deliveries = orders.Select(o => new DeliveryHistoryItemDto(
            o.Id,
            $"#KS-{o.Id.ToString()[..4].ToUpper()}",
            o.RecipientName,
            string.IsNullOrWhiteSpace(o.DeliveryDistrict) ? o.DeliveryAddressLine : $"{o.DeliveryDistrict}, {o.DeliveryCity}",
            o.DeliveredAt ?? o.CreatedAt,
            o.CourierEarning
        )).ToList().AsReadOnly();

        var earningsDto = new CourierEarningsDto(
            courier.Id,
            $"{courier.FirstName} {courier.LastName}",
            startDate.Date,
            totalEarnings,
            deliveredCount,
            avgPerPackage,
            deliveries
        );

        return ServiceResult<CourierEarningsDto>.Success(earningsDto, "Dönemsel hakediş verileri getirildi.");
    }


    public async Task<ServiceResult<CourierProfileDto>> GetProfileAsync(
        Guid courierId,
        CancellationToken cancellationToken = default)
    {
        if (courierId == Guid.Empty)
        {
            return ServiceResult<CourierProfileDto>.BadRequest("Geçersiz kurye ID'si.");
        }

        var courier = await _courierRepository.GetWithMerchantAsync(courierId);
        if (courier is null)
        {
            return ServiceResult<CourierProfileDto>.NotFound($"Kurye bulunamadı: {courierId}");
        }

        var today = DateTime.UtcNow;
        var todayOrders = await _orderRepository.GetDeliveredOrdersByCourierAndDateAsync(courierId, today);
        var completedDeliveriesToday = todayOrders.Count;
        var totalEarningsToday = todayOrders.Sum(o => o.CourierEarning);

        // Tüm zamanlardaki teslimatlar
        var allDelivered = await _orderRepository.GetAllAsync(o => o.CourierId == courierId && o.Status == Domain.Enums.OrderStatus.Delivered);
        var totalDeliveriesAllTime = allDelivered.Count;

        var profileDto = new CourierProfileDto(
            courier.Id,
            courier.MerchantId,
            courier.Merchant?.Name ?? "KuryeSistemi İşletmesi",
            courier.FirstName,
            courier.LastName,
            $"{courier.FirstName} {courier.LastName}",
            courier.Email,
            courier.PhoneNumber,
            courier.VehicleType.ToString(),
            courier.LicensePlate,
            courier.VehicleBrand,
            courier.VehicleModel,
            courier.IsAvailable,
            courier.CurrentBalance,
            completedDeliveriesToday,
            totalEarningsToday,
            totalDeliveriesAllTime,
            courier.IsOnline,
            courier.CourierCompanyId
        );

        return ServiceResult<CourierProfileDto>.Success(profileDto, "Kurye profil ve kasa bilgileri getirildi.");
    }

    /// <summary>
    /// Kurye mesai durumunu (IsOnline / IsAvailable) günceller ve SignalR ile anlık yayınlar.
    /// </summary>
    public async Task<ServiceResult<bool>> ToggleShiftAsync(
        Guid courierId,
        bool isOnline,
        CancellationToken cancellationToken = default)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return ServiceResult<bool>.NotFound($"Kurye bulunamadı: {courierId}");

        var activeOrdersCount = await _orderRepository.CountActiveOrdersByCourierAsync(courierId);
        if (!isOnline && activeOrdersCount > 0)
        {
            return ServiceResult<bool>.Conflict(
                $"Kurye üzerinde henüz teslim edilmemiş {activeOrdersCount} adet aktif sipariş varken mesai sonlandırılamaz.");
        }

        courier.IsOnline = isOnline;
        // Mesaiye başlayınca müsait, mesai bitince kapalı. Zaten aktif işi olan kurye (uygulama yeniden
        // açıldığında mesai senkronu gibi) tekrar "müsait" yapılıp tur kapasitesi bozulmaz.
        courier.IsAvailable = isOnline && (activeOrdersCount == 0 || courier.IsAvailable);
        if (isOnline)
        {
            courier.LastLocationUpdate = DateTime.UtcNow;
        }
        courier.UpdatedAt = DateTime.UtcNow;
        courier.UpdatedBy = isOnline ? "courier:shift_start" : "courier:shift_end";

        _courierRepository.Update(courier);
        await _courierRepository.SaveChangesAsync();

        var message = isOnline
            ? $"🛵 {courier.FirstName} {courier.LastName} mesaiye başladı ve müsait."
            : $"⚪ {courier.FirstName} {courier.LastName} mesaisini bitirdi.";

        await _notificationService.SendCourierStatusChangedAsync(
            courierId,
            isOnline,
            courier.IsAvailable,
            message,
            courier.MerchantId,
            cancellationToken);

        return ServiceResult<bool>.Success(true, message);
    }

    /// <summary>
    /// Kuryenin anlık GPS konumunu veritabanına işler ve SignalR ile haritaya yayınlar.
    /// </summary>
    public async Task<ServiceResult<bool>> UpdateLocationAsync(
        Guid courierId,
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return ServiceResult<bool>.NotFound($"Kurye bulunamadı: {courierId}");

        if (!courier.IsOnline)
        {
            // Kurye vardiyayı kapatmış veya çevrimdışı; geciken GPS pingleri kuryeyi tekrar çevrimiçi yapmamalıdır.
            return ServiceResult<bool>.Success(false, "Kurye çevrimdışı olduğu için konum güncellenmedi.");
        }

        courier.CurrentLatitude = latitude;
        courier.CurrentLongitude = longitude;
        courier.LastLocationUpdate = DateTime.UtcNow;

        _courierRepository.Update(courier);
        await _courierRepository.SaveChangesAsync();

        return ServiceResult<bool>.Success(true, "Konum güncellendi.");
    }

    /// <summary>
    /// Belirtilen kuryenin bilgilerini günceller.
    /// </summary>
    public async Task<ServiceResult<CourierDto>> UpdateCourierAsync(
        Guid courierId,
        UpdateCourierRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return ServiceResult<CourierDto>.NotFound($"Kurye bulunamadı: {courierId}");

        // Plaka veya telefon çakışması (kendisi hariç)
        if (!string.IsNullOrWhiteSpace(request.LicensePlate) || !string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            var plate = request.LicensePlate?.Trim().ToUpperInvariant() ?? courier.LicensePlate;
            var phone = request.PhoneNumber?.Trim() ?? courier.PhoneNumber;
            var conflict = await _courierRepository.IsPlateOrPhoneExistsAsync(plate, phone, courierId);
            if (conflict)
                return ServiceResult<CourierDto>.Conflict("Bu plaka veya telefon numarası başka bir kurye tarafından kullanılıyor.");
        }

        if (request.MerchantId.HasValue)
        {
            if (request.MerchantId.Value == Guid.Empty)
            {
                courier.MerchantId = null; // Açık "ortak filo" talebi (yalnızca firma/admin controller'dan buraya ulaştırır)
            }
            else
            {
                var targetMerchant = await _merchantRepository.GetByIdAsync(request.MerchantId.Value);
                courier.MerchantId = targetMerchant?.Role == "CourierFirm" ? null : request.MerchantId.Value;
            }
        }
        if (request.VehicleType.HasValue)                  courier.VehicleType = request.VehicleType.Value;
        if (!string.IsNullOrWhiteSpace(request.FirstName))  courier.FirstName  = request.FirstName.Trim();
        if (!string.IsNullOrWhiteSpace(request.LastName))   courier.LastName   = request.LastName.Trim();
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber)) courier.PhoneNumber = request.PhoneNumber.Trim();
        if (!string.IsNullOrWhiteSpace(request.LicensePlate)) courier.LicensePlate = request.LicensePlate.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var newEmail = request.Email.Trim().ToLowerInvariant();
            if (newEmail != courier.Email)
            {
                var existing = await _courierRepository.GetByEmailAsync(newEmail);
                if (existing is not null && existing.Id != courierId)
                    return ServiceResult<CourierDto>.Conflict("Bu e-posta adresi başka bir kurye tarafından kullanılıyor.");
                courier.Email = newEmail;
            }
        }
        if (!string.IsNullOrWhiteSpace(request.VehicleBrand)) courier.VehicleBrand = request.VehicleBrand.Trim();
        if (!string.IsNullOrWhiteSpace(request.VehicleModel)) courier.VehicleModel = request.VehicleModel.Trim();
        if (request.IsAvailable.HasValue) courier.IsAvailable = request.IsAvailable.Value;

        _courierRepository.Update(courier);
        await _courierRepository.SaveChangesAsync();

        return ServiceResult<CourierDto>.Success(MapToDto(courier), "Kurye bilgileri güncellendi.");
    }

    /// <summary>
    /// Belirtilen kuryeyi siler (Soft Delete — IsDeleted = true, IsAvailable = false).
    /// Fiziksel veri silinmez; geçmiş sipariş ve finansal raporlar korunur.
    /// </summary>
    public async Task<ServiceResult<bool>> DeleteCourierAsync(
        Guid courierId,
        CancellationToken cancellationToken = default)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return ServiceResult<bool>.NotFound($"Kurye bulunamadı: {courierId}");

        courier.IsDeleted = true;
        courier.IsAvailable = false;
        courier.UpdatedBy = "system:soft_delete";

        _courierRepository.Update(courier);
        await _courierRepository.SaveChangesAsync();

        return ServiceResult<bool>.Success(true, "Kurye başarıyla silindi (arşive alındı).");
    }

    private static CourierDto MapToDto(Courier courier)
    {
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
            courier.CreatedAt,
            courier.IsOnline,
            courier.CurrentLatitude,
            courier.CurrentLongitude,
            courier.LastLocationUpdate,
            courier.CourierCompanyId);
    }
}
