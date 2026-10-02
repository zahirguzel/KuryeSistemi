using Microsoft.EntityFrameworkCore;
using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Merchants;
using KuryeSistemi.Application.Features.Merchants.DTOs;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.Services.Concrete;

public class MerchantService : IMerchantService
{
    private readonly IMerchantRepository _merchantRepository;
    private readonly ICourierRepository _courierRepository;
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasherService _passwordHasherService;
    private readonly IAuditService _auditService;

    public MerchantService(
        IMerchantRepository merchantRepository,
        ICourierRepository courierRepository,
        IApplicationDbContext db,
        IPasswordHasherService passwordHasherService,
        IAuditService auditService)
    {
        _merchantRepository = merchantRepository;
        _courierRepository = courierRepository;
        _db = db;
        _passwordHasherService = passwordHasherService;
        _auditService = auditService;
    }

    public async Task<ServiceResult<IReadOnlyList<MerchantDto>>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var merchants = await _merchantRepository.GetAllActiveAsync();
        var dtos = merchants.Select(MapToDto).ToList().AsReadOnly();

        return ServiceResult<IReadOnlyList<MerchantDto>>.Success(dtos);
    }

    public async Task<ServiceResult<MerchantDto>> CreateAsync(
        CreateMerchantRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return ServiceResult<MerchantDto>.BadRequest("İşletme adı, e-posta ve şifre zorunludur.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var exists = await _merchantRepository.IsEmailExistsAsync(normalizedEmail);
        if (exists)
        {
            return ServiceResult<MerchantDto>.Conflict($"'{request.Email}' adresi ile kayıtlı bir işletme zaten mevcut.");
        }

        var merchant = new Merchant
        {
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = _passwordHasherService.HashPassword(request.Password),
            PhoneNumber = request.PhoneNumber?.Trim() ?? string.Empty,
            Address = request.Address?.Trim() ?? string.Empty,
            DefaultPackageFee = request.DefaultPackageFee ?? 50.00m,
            DispatchMode = request.DispatchMode ?? Domain.Enums.DispatchMode.Pool,
            ReconciliationPeriod = request.ReconciliationPeriod ?? Domain.Enums.ReconciliationPeriod.Daily,
            Latitude = request.Latitude ?? 36.5867,
            Longitude = request.Longitude ?? 36.1714,
            Role = "Merchant",
            IsActive = true,
            IsOpen = true,
            CreatedBy = "firm:manager"
        };

        await _merchantRepository.AddAsync(merchant);
        await _merchantRepository.SaveChangesAsync();

        var dto = MapToDto(merchant);
        return ServiceResult<MerchantDto>.Created(dto, "İşletme başarıyla oluşturuldu.");
    }

    public async Task<ServiceResult<bool>> DeleteAsync(
        Guid merchantId,
        CancellationToken cancellationToken = default)
    {
        var merchant = await _merchantRepository.GetByIdAsync(merchantId);
        if (merchant is null)
            return ServiceResult<bool>.NotFound("İşletme bulunamadı.");

        // Soft delete: IsActive = false veya hard delete
        merchant.IsActive = false;
        merchant.IsDeleted = true;
        _merchantRepository.Update(merchant);
        await _merchantRepository.SaveChangesAsync();

        return ServiceResult<bool>.Success(true, "İşletme başarıyla silindi.");
    }

    public async Task<ServiceResult<MerchantDto>> GetByIdAsync(
        Guid merchantId,
        CancellationToken cancellationToken = default)
    {
        var merchant = await _merchantRepository.GetByIdAsync(merchantId);
        if (merchant is null)
            return ServiceResult<MerchantDto>.NotFound("İşletme bulunamadı.");

        return ServiceResult<MerchantDto>.Success(MapToDto(merchant));
    }

    public async Task<ServiceResult<MerchantDto>> UpdateSettingsAsync(
        Guid merchantId,
        UpdateMerchantSettingsDto request,
        CancellationToken cancellationToken = default)
    {
        var merchant = await _merchantRepository.GetByIdAsync(merchantId);
        if (merchant is null)
            return ServiceResult<MerchantDto>.NotFound("İşletme bulunamadı.");

        // Sadece gönderilen alanları güncelle (PATCH semantiği)
        if (!string.IsNullOrWhiteSpace(request.Name))
            merchant.Name = request.Name.Trim();

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            merchant.PhoneNumber = request.PhoneNumber.Trim();

        if (!string.IsNullOrWhiteSpace(request.Address))
            merchant.Address = request.Address.Trim();

        if (request.IsOpen.HasValue)
            merchant.IsOpen = request.IsOpen.Value;

        // GPS — her iki koordinat da gelmeli, birini eksik bırakma
        if (request.Latitude.HasValue && request.Longitude.HasValue)
        {
            if (request.Latitude.Value is < -90 or > 90)
                return ServiceResult<MerchantDto>.BadRequest("Geçersiz enlem değeri (−90 ile 90 arası olmalı).");
            if (request.Longitude.Value is < -180 or > 180)
                return ServiceResult<MerchantDto>.BadRequest("Geçersiz boylam değeri (−180 ile 180 arası olmalı).");

            merchant.Latitude  = request.Latitude.Value;
            merchant.Longitude = request.Longitude.Value;
        }

        // Dağıtım stratejisi (Havuz / Manuel / Akıllı GPS)
        if (request.DispatchMode.HasValue)
            merchant.DispatchMode = request.DispatchMode.Value;

        // H3 Hexagon ve Dağıtım Motoru Algoritma Ayarları
        if (request.HexagonSizeMeters.HasValue && request.HexagonSizeMeters.Value > 0)
            merchant.HexagonSizeMeters = request.HexagonSizeMeters.Value;

        if (request.MaxCourierDistanceKm.HasValue && request.MaxCourierDistanceKm.Value > 0)
            merchant.MaxCourierDistanceKm = request.MaxCourierDistanceKm.Value;

        if (request.MaxOrdersPerTour.HasValue && request.MaxOrdersPerTour.Value > 0)
            merchant.MaxOrdersPerTour = request.MaxOrdersPerTour.Value;

        if (request.OrderBatchingTimeMinutes.HasValue && request.OrderBatchingTimeMinutes.Value >= 0)
            merchant.OrderBatchingTimeMinutes = request.OrderBatchingTimeMinutes.Value;

        if (request.CrossRestaurantDistanceMeters.HasValue && request.CrossRestaurantDistanceMeters.Value >= 0)
            merchant.CrossRestaurantDistanceMeters = request.CrossRestaurantDistanceMeters.Value;

        // Kurye teslimat başı taşıma ücreti (TL)
        if (request.DefaultPackageFee.HasValue && request.DefaultPackageFee.Value >= 0)
            merchant.DefaultPackageFee = request.DefaultPackageFee.Value;

        // Kurye hakediş payı (TL)
        if (request.CourierCutFee.HasValue && request.CourierCutFee.Value >= 0)
            merchant.CourierCutFee = request.CourierCutFee.Value;

        // Mahsuplaşma periyodu (Günlük / Haftalık / Aylık)
        if (request.ReconciliationPeriod.HasValue)
            merchant.ReconciliationPeriod = request.ReconciliationPeriod.Value;

        _merchantRepository.Update(merchant);
        await _merchantRepository.SaveChangesAsync();

        return ServiceResult<MerchantDto>.Success(MapToDto(merchant), "Ayarlar başarıyla güncellendi.");
    }

    public async Task<ServiceResult<CourierReconciliationDto>> ReconcileCourierAsync(
        Guid merchantId,
        Guid courierId,
        CancellationToken cancellationToken = default)
    {
        if (merchantId == Guid.Empty || courierId == Guid.Empty)
            return ServiceResult<CourierReconciliationDto>.BadRequest("Geçersiz işletme veya kurye ID'si.");

        var merchant = await _merchantRepository.GetByIdAsync(merchantId);
        if (merchant is null)
            return ServiceResult<CourierReconciliationDto>.NotFound("İşletme bulunamadı.");

        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
            return ServiceResult<CourierReconciliationDto>.NotFound("Kurye bulunamadı.");

        var isFirm = merchant.Role == "CourierFirm";
        if (!isFirm && courier.MerchantId != merchantId)
            return ServiceResult<CourierReconciliationDto>.BadRequest("Bu kurye işletmenize bağlı değildir.");

        // Çift / gereksiz mahsuplaşma koruması (Idempotency)
        if (courier.CurrentBalance == 0.00m)
        {
            return ServiceResult<CourierReconciliationDto>.BadRequest(
                $"Kurye {courier.FirstName} {courier.LastName} için mahsuplaşılacak açık bakiye bulunmamaktadır (Bakiye: 0.00 TL).");
        }

        var previousBalance = courier.CurrentBalance;

        // Kuryenin henüz mahsuplaşılmamış teslim edilmiş siparişlerini hesapla
        var ordersQuery = _db.Orders
            .Where(o => o.CourierId == courierId && o.Status == OrderStatus.Delivered && !o.IsReconciled && !o.IsDeleted);

        if (!isFirm)
        {
            ordersQuery = ordersQuery.Where(o => o.MerchantId == merchantId);
        }

        var deliveredOrders = await ordersQuery.ToListAsync(cancellationToken);

        var deliveredCount = deliveredOrders.Count;
        var cashCollected = deliveredOrders
            .Where(o => o.PaymentMethod == PaymentMethod.Cash)
            .Sum(o => o.TotalOrderAmount);
        var earningsTotal = deliveredOrders
            .Sum(o => o.CourierEarning);

        // Sipariş bulunamayıp bakiye manuel girilmişse bakiyeden türet
        if (cashCollected == 0 && previousBalance < 0)
            cashCollected = Math.Abs(previousBalance);
        if (earningsTotal == 0 && previousBalance > 0)
            earningsTotal = previousBalance;

        // Kurye bakiyesini sıfırla
        courier.CurrentBalance = 0.00m;
        courier.UpdatedBy = isFirm ? $"firm:{merchant.Name}" : $"merchant:{merchant.Name}";

        // Finansal denetim (audit log) için CashSettlement kaydı oluştur
        var settlement = new CashSettlement
        {
            MerchantId = courier.MerchantId, // Kuryenin gerçek bağlı olduğu işletme
            CourierId = courierId,
            SettledAmount = previousBalance,
            CashCollectedTotal = cashCollected,
            CourierEarningsTotal = earningsTotal,
            DeliveredPackageCount = deliveredCount,
            SettledAt = DateTime.UtcNow,
            Notes = $"Gün sonu kasa mahsuplaşması tamamlandı. Kurye: {courier.FirstName} {courier.LastName} (İşleyen: {merchant.Name})",
            CreatedBy = isFirm ? $"firm:{merchant.Name}" : $"merchant:{merchant.Name}"
        };

        // Siparişleri bu mahsuplaşmaya mühürle (Mükerrer hesaplamayı önler)
        foreach (var ord in deliveredOrders)
        {
            ord.IsReconciled = true;
            ord.CashSettlementId = settlement.Id;
            ord.UpdatedAt = DateTime.UtcNow;
            ord.UpdatedBy = isFirm ? $"firm:{merchant.Name}" : $"merchant:{merchant.Name}";
        }

        _courierRepository.Update(courier);
        _db.CashSettlements.Add(settlement);

        // Kurye bakiye güncellemesi, sipariş mühürleri ve mahsuplaşma kaydını aynı transaction içinde kaydet
        await _db.SaveChangesAsync(cancellationToken);

        // Denetim günlüğüne (AuditLog) kaydet
        await _auditService.LogAsync(
            merchantId,
            merchant.Email,
            merchant.Role ?? "Merchant",
            merchant.Id,
            "Reconciliation.Courier",
            "Courier",
            courier.Id.ToString(),
            $"Mahsuplaşma yapıldı. Kurye: {courier.FirstName} {courier.LastName}, Tutar: {previousBalance:N2} TL, Paket: {deliveredCount}",
            cancellationToken: cancellationToken);

        var dto = new CourierReconciliationDto(
            CourierId: courier.Id,
            CourierFullName: $"{courier.FirstName} {courier.LastName}".Trim(),
            SettledAmount: previousBalance,
            NewBalance: 0.00m,
            ReconciledAt: settlement.SettledAt,
            Message: $"Kurye {courier.FirstName} {courier.LastName} ile kasa mahsuplaşması tamamlandı. Sıfırlanan bakiye: {previousBalance:N2} ₺."
        );

        return ServiceResult<CourierReconciliationDto>.Success(dto, dto.Message);
    }

    public async Task<ServiceResult<IReadOnlyList<CashSettlementDto>>> GetMerchantSettlementsAsync(
        Guid merchantId,
        CancellationToken cancellationToken = default)
    {
        if (merchantId == Guid.Empty)
            return ServiceResult<IReadOnlyList<CashSettlementDto>>.BadRequest("Geçersiz işletme ID'si.");

        var merchant = await _merchantRepository.GetByIdAsync(merchantId);
        var isFirm = merchant?.Role == "CourierFirm";

        var query = _db.CashSettlements
            .AsNoTracking()
            .Include(s => s.Courier)
            .Where(s => !s.IsDeleted);

        if (!isFirm)
        {
            query = query.Where(s => s.MerchantId == merchantId);
        }

        var settlements = await query
            .OrderByDescending(s => s.SettledAt)
            .Select(s => new CashSettlementDto(
                s.Id,
                s.MerchantId,
                s.CourierId,
                $"{s.Courier.FirstName} {s.Courier.LastName}".Trim(),
                s.Courier.PhoneNumber,
                s.SettledAmount,
                s.CashCollectedTotal,
                s.CourierEarningsTotal,
                s.DeliveredPackageCount,
                s.SettledAt,
                s.Notes
            ))
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyList<CashSettlementDto>>.Success(settlements);
    }

    public async Task<ServiceResult<MerchantFinanceSummaryDto>> GetMerchantFinanceSummaryAsync(
        Guid merchantId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        string? paymentMethod = null,
        CancellationToken cancellationToken = default)
    {
        if (merchantId == Guid.Empty)
            return ServiceResult<MerchantFinanceSummaryDto>.BadRequest("Geçersiz işletme ID'si.");

        var merchant = await _merchantRepository.GetByIdAsync(merchantId);
        if (merchant is null)
            return ServiceResult<MerchantFinanceSummaryDto>.NotFound("İşletme bulunamadı.");

        var defaultPackageFee = merchant.DefaultPackageFee;

        // İşletmenin teslim edilmiş siparişlerini çek
        var query = _db.Orders
            .AsNoTracking()
            .Include(o => o.Courier)
            .Where(o => o.MerchantId == merchantId && o.Status == OrderStatus.Delivered && !o.IsDeleted);

        if (startDate.HasValue)
        {
            var startUtc = DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc);
            query = query.Where(o => (o.DeliveredAt ?? o.CreatedAt) >= startUtc);
        }

        if (endDate.HasValue)
        {
            var endUtc = DateTime.SpecifyKind(endDate.Value, DateTimeKind.Utc);
            query = query.Where(o => (o.DeliveredAt ?? o.CreatedAt) <= endUtc);
        }

        var deliveredOrders = await query
            .OrderByDescending(o => o.DeliveredAt ?? o.CreatedAt)
            .ToListAsync(cancellationToken);

        // Tarih aralığındaki genel teslimat ve tahsilat toplamları
        var totalDeliveredCount = deliveredOrders.Count;
        var totalCashAmount = deliveredOrders
            .Where(o => o.PaymentMethod == PaymentMethod.Cash)
            .Sum(o => o.TotalOrderAmount);

        var totalOnlineAmount = deliveredOrders
            .Where(o => o.PaymentMethod == PaymentMethod.Online)
            .Sum(o => o.TotalOrderAmount);

        var totalCardAmount = deliveredOrders
            .Where(o => o.PaymentMethod == PaymentMethod.CreditCardOnDelivery)
            .Sum(o => o.TotalOrderAmount);

        var totalDirectRevenue = totalOnlineAmount + totalCardAmount;
        var totalFirmDeliveryFee = totalDeliveredCount * defaultPackageFee;
        var netSettlementBalance = totalCashAmount - totalFirmDeliveryFee;

        string settlementDirection;
        if (netSettlementBalance > 0)
            settlementDirection = "CourierFirmOwesMerchant";
        else if (netSettlementBalance < 0)
            settlementDirection = "MerchantOwesCourierFirm";
        else
            settlementDirection = "Balanced";

        // Kurye bazlı dağılım (Hangi kurye kaç teslimat yaptı, ne kadar nakit topladı)
        var courierBreakdowns = deliveredOrders
            .Where(o => o.CourierId.HasValue && o.Courier != null)
            .GroupBy(o => o.CourierId!.Value)
            .Select(g =>
            {
                var courier = g.First().Courier!;
                var cash = g.Where(o => o.PaymentMethod == PaymentMethod.Cash).Sum(o => o.TotalOrderAmount);
                return new CourierDeliveryBreakdownDto(
                    courier.Id,
                    $"{courier.FirstName} {courier.LastName}".Trim(),
                    courier.PhoneNumber,
                    courier.LicensePlate,
                    g.Count(),
                    cash
                );
            })
            .OrderByDescending(c => c.DeliveredCount)
            .ToList();

        // Ödeme yöntemi filtresi istenmişse sipariş listesini filtrele (Özet KPI'lar genel kalır)
        var filteredOrders = deliveredOrders.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(paymentMethod) && !paymentMethod.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (paymentMethod.Equals("cash", StringComparison.OrdinalIgnoreCase))
                filteredOrders = filteredOrders.Where(o => o.PaymentMethod == PaymentMethod.Cash);
            else if (paymentMethod.Equals("online", StringComparison.OrdinalIgnoreCase))
                filteredOrders = filteredOrders.Where(o => o.PaymentMethod == PaymentMethod.Online);
            else if (paymentMethod.Equals("card", StringComparison.OrdinalIgnoreCase))
                filteredOrders = filteredOrders.Where(o => o.PaymentMethod == PaymentMethod.CreditCardOnDelivery);
        }

        // Ortalama teslimat süresi hesabı (Dakika)
        var validDurations = deliveredOrders
            .Where(o => o.DeliveredAt.HasValue)
            .Select(o => Math.Max(1.0, (o.DeliveredAt!.Value - o.CreatedAt).TotalMinutes))
            .ToList();

        var averageDeliveryDurationMinutes = validDurations.Count > 0
            ? Math.Round(validDurations.Average(), 1)
            : 0.0;

        var orderDtos = filteredOrders.Select(o =>
        {
            var isCash = o.PaymentMethod == PaymentMethod.Cash;
            var netCashEffect = isCash ? (o.TotalOrderAmount - defaultPackageFee) : -defaultPackageFee;
            var courierName = o.Courier != null ? $"{o.Courier.FirstName} {o.Courier.LastName}".Trim() : null;

            int? durationMins = null;
            string? durationFormatted = null;

            if (o.DeliveredAt.HasValue)
            {
                var diff = o.DeliveredAt.Value - o.CreatedAt;
                var rawMins = (int)Math.Round(diff.TotalMinutes);
                var mins = Math.Max(1, rawMins);
                durationMins = mins;

                if (mins >= 60)
                {
                    var h = mins / 60;
                    var m = mins % 60;
                    durationFormatted = m > 0 ? $"{h} sa {m} dk" : $"{h} sa";
                }
                else
                {
                    durationFormatted = $"{mins} dk";
                }
            }

            return new MerchantFinanceOrderDto(
                o.Id,
                $"ORD-{o.Id.ToString()[..8].ToUpper()}",
                o.RecipientName,
                o.RecipientPhone,
                $"{o.DeliveryAddressLine} {o.DeliveryDistrict}/{o.DeliveryCity}".Trim(),
                o.PaymentMethod.ToString(),
                o.TotalOrderAmount,
                defaultPackageFee,
                netCashEffect,
                o.CourierId,
                courierName,
                o.Courier?.LicensePlate,
                o.CreatedAt,
                o.DeliveredAt,
                durationMins,
                durationFormatted
            );
        }).ToList();

        var summaryDto = new MerchantFinanceSummaryDto(
            merchant.Id,
            merchant.Name,
            defaultPackageFee,
            totalDeliveredCount,
            totalCashAmount,
            totalOnlineAmount,
            totalCardAmount,
            totalDirectRevenue,
            totalFirmDeliveryFee,
            netSettlementBalance,
            settlementDirection,
            averageDeliveryDurationMinutes,
            courierBreakdowns,
            orderDtos
        );

        return ServiceResult<MerchantFinanceSummaryDto>.Success(summaryDto);
    }

    private static MerchantDto MapToDto(Merchant merchant) => new(
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
