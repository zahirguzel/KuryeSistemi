// Repositories/CourierRepository.cs

using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Infrastructure.Repositories;

public class CourierRepository : GenericRepository<Courier>, ICourierRepository
{
    public CourierRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Courier>> GetCouriersByMerchantAsync(Guid merchantId, bool? isAvailable = null)
    {
        var query = _dbSet
            .AsNoTracking()
            .Where(c => c.MerchantId == merchantId);

        if (isAvailable.HasValue)
        {
            query = query.Where(c => c.IsAvailable == isAvailable.Value);
        }

        return await query
            .OrderBy(c => c.FirstName)
            .ThenBy(c => c.LastName)
            .ToListAsync();
    }

    public async Task<Courier?> GetByEmailAsync(string email)
    {
        var normalizedEmail = email.ToLowerInvariant();
        return await _dbSet
            .FirstOrDefaultAsync(c => c.Email.ToLower() == normalizedEmail);
    }

    public async Task<bool> IsPlateOrPhoneExistsAsync(string licensePlate, string phoneNumber, Guid? excludeId = null)
    {
        var normalizedPlate = licensePlate.ToUpperInvariant().Trim();
        var normalizedPhone = phoneNumber.Trim();

        var query = _dbSet.AsNoTracking();

        if (excludeId.HasValue)
        {
            query = query.Where(c => c.Id != excludeId.Value);
        }

        return await query.AnyAsync(c =>
            c.LicensePlate.ToUpper() == normalizedPlate ||
            c.PhoneNumber == normalizedPhone);
    }

    public async Task<Courier?> GetWithMerchantAsync(Guid courierId)
    {
        return await _dbSet
            .Include(c => c.Merchant)
            .FirstOrDefaultAsync(c => c.Id == courierId);
    }
}
