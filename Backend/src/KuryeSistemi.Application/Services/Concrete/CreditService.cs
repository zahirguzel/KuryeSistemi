// Services/Concrete/CreditService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Company;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Application.Services.Concrete;

public sealed class CreditService : ICreditService
{
    private const int MaxConcurrencyRetries = 3;
    private const int DeliveryCost = 1;

    private readonly IApplicationDbContext _db;
    private readonly ILogger<CreditService> _logger;

    public CreditService(IApplicationDbContext db, ILogger<CreditService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public Task<ServiceResult<CreditBalanceDto>> TopUpAsync(
        Guid companyId, int amount, string? referenceNumber, string? notes, string actor, CancellationToken ct = default)
    {
        if (amount <= 0)
            return Task.FromResult(ServiceResult<CreditBalanceDto>.BadRequest("Yüklenecek kontör miktarı 0'dan büyük olmalıdır."));

        return ApplyAsync(companyId, amount, CreditTransactionType.TopUp, referenceNumber, notes, null, actor, ct);
    }

    public Task<ServiceResult<CreditBalanceDto>> AdjustAsync(
        Guid companyId, int amount, string? reason, string actor, CancellationToken ct = default)
    {
        if (amount == 0)
            return Task.FromResult(ServiceResult<CreditBalanceDto>.BadRequest("Düzeltme miktarı 0 olamaz."));

        return ApplyAsync(companyId, amount, CreditTransactionType.ManualAdjustment, null, reason, null, actor, ct, rejectNegativeBalance: true);
    }

    public async Task<ServiceResult> DeductForDeliveryAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await _db.Orders.AsNoTracking()
            .Where(o => o.Id == orderId)
            .Select(o => new { o.Status, o.MerchantId })
            .FirstOrDefaultAsync(ct);

        if (order is null)
            return ServiceResult.NotFound("Sipariş bulunamadı.");

        if (order.Status != OrderStatus.Delivered)
            return ServiceResult.BadRequest("Yalnızca teslim edilmiş siparişten kontör düşülür.");

        var companyId = await _db.Merchants.AsNoTracking()
            .Where(m => m.Id == order.MerchantId)
            .Select(m => m.CourierCompanyId)
            .FirstOrDefaultAsync(ct);

        // Firmaya bağlanmamış (eski) işletme: kontör kapsamı dışında
        if (companyId is null)
            return ServiceResult.Success("İşletme bir firmaya bağlı değil; kontör düşülmedi.");

        var alreadyDeducted = await _db.CreditTransactions.AsNoTracking()
            .AnyAsync(t => t.OrderId == orderId && t.Type == CreditTransactionType.DeliveryDeduction, ct);
        if (alreadyDeducted)
            return ServiceResult.Success("Bu sipariş için kontör zaten düşülmüş.");

        var result = await ApplyAsync(
            companyId.Value, -DeliveryCost, CreditTransactionType.DeliveryDeduction,
            null, "Teslimat kontörü", orderId, "system", ct);

        return result.IsSuccess ? ServiceResult.Success(result.Message) : ServiceResult.Fail(result.Message, result.StatusCode);
    }

    public async Task<ServiceResult> EnsureCanCreateOrderAsync(Guid merchantId, CancellationToken ct = default)
    {
        var companyId = await _db.Merchants.AsNoTracking()
            .Where(m => m.Id == merchantId)
            .Select(m => m.CourierCompanyId)
            .FirstOrDefaultAsync(ct);

        if (companyId is null)
            return ServiceResult.Success();

        var company = await _db.CourierCompanies.AsNoTracking()
            .Where(c => c.Id == companyId.Value)
            .Select(c => new { c.CreditBalance, c.BlockOnZeroCredit })
            .FirstOrDefaultAsync(ct);

        if (company is { BlockOnZeroCredit: true, CreditBalance: <= 0 })
            return ServiceResult.Fail("Firmanın kontörü tükendi; yeni sipariş oluşturulamıyor. Lütfen firmanızla iletişime geçin.", 402);

        return ServiceResult.Success();
    }

    public async Task<ServiceResult<PagedResult<CreditTransactionDto>>> GetHistoryAsync(
        Guid companyId, int page, int size, CancellationToken ct = default)
    {
        (page, size) = PagedResult<CreditTransactionDto>.Normalize(page, size);

        var query = _db.CreditTransactions.AsNoTracking()
            .Where(t => t.CourierCompanyId == companyId)
            .OrderByDescending(t => t.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * size)
            .Take(size)
            .Select(t => new CreditTransactionDto(
                t.Id, t.Type, t.Amount, t.BalanceAfter, t.ReferenceNumber, t.Notes, t.OrderId, t.CreatedAt, t.CreatedBy))
            .ToListAsync(ct);

        return ServiceResult<PagedResult<CreditTransactionDto>>.Success(new PagedResult<CreditTransactionDto>(items, total, page, size));
    }

    /// <summary>
    /// Bakiyeyi değiştirir ve defter kaydını aynı SaveChanges içinde yazar. xmin çakışmasında kaydı
    /// yeniden okuyarak birkaç kez dener; sipariş kaynaklı tekrar (benzersiz indeks) idempotent kabul edilir.
    /// </summary>
    private async Task<ServiceResult<CreditBalanceDto>> ApplyAsync(
        Guid companyId, int delta, CreditTransactionType type, string? reference, string? notes,
        Guid? orderId, string actor, CancellationToken ct, bool rejectNegativeBalance = false)
    {
        for (var attempt = 1; attempt <= MaxConcurrencyRetries; attempt++)
        {
            var company = await _db.CourierCompanies.FirstOrDefaultAsync(c => c.Id == companyId && !c.IsDeleted, ct);
            if (company is null)
                return ServiceResult<CreditBalanceDto>.NotFound("Firma bulunamadı.");

            var newBalance = (long)company.CreditBalance + delta;
            if (newBalance > int.MaxValue)
                return ServiceResult<CreditBalanceDto>.BadRequest("Kontör bakiyesi üst sınırı aşıldı.");
            if (newBalance < int.MinValue || (rejectNegativeBalance && newBalance < 0))
                return ServiceResult<CreditBalanceDto>.BadRequest("Düzeltme sonrası bakiye negatif olamaz.");

            company.CreditBalance = (int)newBalance;
            company.UpdatedAt = DateTime.UtcNow;
            company.UpdatedBy = actor;

            _db.CreditTransactions.Add(new CreditTransaction
            {
                CourierCompanyId = company.Id,
                Type = type,
                Amount = delta,
                BalanceAfter = company.CreditBalance,
                ReferenceNumber = reference,
                Notes = notes,
                OrderId = orderId,
                CreatedBy = actor,
            });

            try
            {
                await _db.SaveChangesAsync(ct);
                return ServiceResult<CreditBalanceDto>.Success(
                    new CreditBalanceDto(company.CreditBalance),
                    type == CreditTransactionType.TopUp ? $"{delta} kontör yüklendi." : "Kontör güncellendi.");
            }
            catch (DbUpdateConcurrencyException)
            {
                _db.ClearTracking();
                _logger.LogInformation("--> [KONTÖR] Eşzamanlılık çakışması, yeniden deneniyor ({Attempt}/{Max}) Firma: {CompanyId}",
                    attempt, MaxConcurrencyRetries, companyId);
            }
            catch (DbUpdateException) when (orderId.HasValue)
            {
                // (OrderId, Type) benzersiz indeksi: aynı sipariş için eşzamanlı ikinci düşüm
                _db.ClearTracking();
                var current = await _db.CourierCompanies.AsNoTracking()
                    .Where(c => c.Id == companyId).Select(c => c.CreditBalance).FirstOrDefaultAsync(ct);
                return ServiceResult<CreditBalanceDto>.Success(new CreditBalanceDto(current), "Bu sipariş için kontör zaten düşülmüş.");
            }
        }

        return ServiceResult<CreditBalanceDto>.Conflict("Kontör işlemi eşzamanlı güncellemeler nedeniyle tamamlanamadı; lütfen tekrar deneyin.");
    }
}
