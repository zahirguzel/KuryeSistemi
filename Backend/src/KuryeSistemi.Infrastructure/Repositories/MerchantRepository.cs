// Repositories/MerchantRepository.cs

using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Infrastructure.Repositories;

public class MerchantRepository : GenericRepository<Merchant>, IMerchantRepository
{
    public MerchantRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Merchant?> GetByEmailAsync(string email)
    {
        var normalizedEmail = email.ToLowerInvariant();
        return await _dbSet
            .FirstOrDefaultAsync(m => m.Email.ToLower() == normalizedEmail);
    }

    public async Task<bool> IsEmailExistsAsync(string email, Guid? excludeId = null)
    {
        var normalizedEmail = email.ToLowerInvariant();
        var query = _dbSet.AsNoTracking();

        if (excludeId.HasValue)
        {
            query = query.Where(m => m.Id != excludeId.Value);
        }

        return await query.AnyAsync(m => m.Email.ToLower() == normalizedEmail);
    }

    public async Task<IReadOnlyList<Merchant>> GetAllActiveAsync()
    {
        return await _dbSet
            .AsNoTracking()
            .Where(m => m.IsActive && m.Role != "CourierFirm")
            .OrderBy(m => m.Name)
            .ToListAsync();
    }

}
