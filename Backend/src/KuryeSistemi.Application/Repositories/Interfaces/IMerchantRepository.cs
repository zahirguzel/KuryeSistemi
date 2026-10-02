// Repositories/Interfaces/IMerchantRepository.cs

using KuryeSistemi.Domain.Entities;

namespace KuryeSistemi.Application.Repositories.Interfaces;

public interface IMerchantRepository : IGenericRepository<Merchant>
{
    Task<Merchant?> GetByEmailAsync(string email);
    Task<bool> IsEmailExistsAsync(string email, Guid? excludeId = null);
    Task<IReadOnlyList<Merchant>> GetAllActiveAsync();
}
