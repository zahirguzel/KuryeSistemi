// Repositories/Interfaces/ICourierRepository.cs

using KuryeSistemi.Domain.Entities;

namespace KuryeSistemi.Application.Repositories.Interfaces;

public interface ICourierRepository : IGenericRepository<Courier>
{
    Task<IReadOnlyList<Courier>> GetCouriersByMerchantAsync(Guid merchantId, bool? isAvailable = null);
    Task<Courier?> GetByEmailAsync(string email);
    Task<bool> IsPlateOrPhoneExistsAsync(string licensePlate, string phoneNumber, Guid? excludeId = null);
    Task<Courier?> GetWithMerchantAsync(Guid courierId);
}
