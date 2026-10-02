using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Domain.Common;
using KuryeSistemi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Infrastructure.Persistence;

/// <summary>
/// Uygulamanın ana veritabanı bağlamı.
///
/// Sorumluluklar:
///  1. DbSet tanımları (Merchant, Courier, Order)
///  2. Fluent API yapılandırmalarını otomatik yükleme (IEntityTypeConfiguration)
///  3. SaveChanges/SaveChangesAsync override → CreatedAt/UpdatedAt otomatik doldurma
///  4. Global Query Filter → IsDeleted = false (Soft Delete)
/// </summary>
public sealed class AppDbContext : DbContext, IApplicationDbContext
{
    // -------------------------------------------------------------------------
    // DbSet'ler
    // -------------------------------------------------------------------------

    public DbSet<Merchant>           Merchants           => Set<Merchant>();
    public DbSet<Courier>            Couriers            => Set<Courier>();
    public DbSet<Order>              Orders              => Set<Order>();
    public DbSet<CashSettlement>     CashSettlements     => Set<CashSettlement>();
    public DbSet<AuditLog>           AuditLogs           => Set<AuditLog>();
    public DbSet<Product>            Products            => Set<Product>();
    public DbSet<CourierCompany>     CourierCompanies    => Set<CourierCompany>();
    public DbSet<CompanyUser>        CompanyUsers        => Set<CompanyUser>();
    public DbSet<CreditTransaction>  CreditTransactions  => Set<CreditTransaction>();
    public DbSet<AdminUser>          AdminUsers          => Set<AdminUser>();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public void ClearTracking() => ChangeTracker.Clear();

    // -------------------------------------------------------------------------
    // Model Yapılandırması
    // -------------------------------------------------------------------------

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tüm IEntityTypeConfiguration<T> sınıflarını bu assembly'den otomatik yükle.
        // Yeni bir entity eklendiğinde sadece ilgili Configuration sınıfını oluşturmak yeterli.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // -----------------------------------------------------------------------
        // Global Query Filter — Soft Delete
        // BaseEntity'den türeyen TÜM entity'lere uygulanır.
        // IsDeleted = true olan kayıtlar varsayılan sorgularda görünmez.
        // IgnoreQueryFilters() ile devre dışı bırakılabilir (yönetimsel sorgular için).
        // -----------------------------------------------------------------------
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                            .HasQueryFilter(BuildSoftDeleteFilter(entityType.ClrType));
            }
        }
    }

    // -------------------------------------------------------------------------
    // SaveChanges Override — Audit Alanları Otomatik Doldurma
    // -------------------------------------------------------------------------

    /// <summary>
    /// Senkron kayıt. Audit alanlarını doldurup base'e delege eder.
    /// </summary>
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyAuditFields();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    /// <summary>
    /// Asenkron kayıt. Audit alanlarını doldurup base'e delege eder.
    /// </summary>
    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditFields();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    // -------------------------------------------------------------------------
    // Yardımcı Metotlar
    // -------------------------------------------------------------------------

    /// <summary>
    /// ChangeTracker üzerinden Added ve Modified entity'lere
    /// CreatedAt / UpdatedAt değerlerini otomatik atar.
    ///
    /// NOT: CreatedBy / UpdatedBy alanları ICurrentUserService aracılığıyla
    ///      Application katmanında doldurulacaktır (DI ile enjekte edilecek).
    ///      Bu aşamada sadece zaman damgaları yönetilmektedir.
    /// </summary>
    private void ApplyAuditFields()
    {
        var now = DateTime.UtcNow;

        var entries = ChangeTracker.Entries<BaseEntity>();

        foreach (var entry in entries)
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    // Id henüz set edilmemişse Guid üret (BaseEntity default zaten üretiyor, ama güvence için)
                    if (entry.Entity.Id == Guid.Empty)
                        entry.Entity.Id = Guid.NewGuid();
                    break;

                case EntityState.Modified:
                    // CreatedAt ve CreatedBy alanlarının değiştirilmesini engelle
                    entry.Property(e => e.CreatedAt).IsModified = false;
                    entry.Property(e => e.CreatedBy).IsModified = false;
                    entry.Entity.UpdatedAt = now;
                    break;
            }
        }
    }

    /// <summary>
    /// Belirtilen CLR tipi için <c>e => !((BaseEntity)e).IsDeleted</c>
    /// expression'ını dinamik olarak oluşturur.
    /// </summary>
    private static System.Linq.Expressions.LambdaExpression BuildSoftDeleteFilter(Type entityType)
    {
        var parameter = System.Linq.Expressions.Expression.Parameter(entityType, "e");
        var property  = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
        var condition = System.Linq.Expressions.Expression.Not(property);
        return System.Linq.Expressions.Expression.Lambda(condition, parameter);
    }
}
