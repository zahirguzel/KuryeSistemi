using KuryeSistemi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Interfaces;

/// <summary>
/// Application katmanının veritabanına erişim sözleşmesi.
/// Infrastructure'daki AppDbContext bu interface'i uygular.
/// Bu sayede Application katmanı EF Core'a doğrudan bağımlı olmaz (DIP).
/// </summary>
public interface IApplicationDbContext
{
    DbSet<Merchant>          Merchants          { get; }
    DbSet<Courier>           Couriers           { get; }
    DbSet<Order>             Orders             { get; }
    DbSet<CashSettlement>    CashSettlements    { get; }
    DbSet<AuditLog>          AuditLogs          { get; }
    DbSet<Product>           Products           { get; }
    DbSet<CourierCompany>    CourierCompanies   { get; }
    DbSet<CompanyUser>       CompanyUsers       { get; }
    DbSet<CreditTransaction> CreditTransactions { get; }
    DbSet<AdminUser>         AdminUsers         { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
