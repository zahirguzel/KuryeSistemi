using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KuryeSistemi.Infrastructure.Persistence.Configurations;

/// <summary>
/// Merchant tablosu için Fluent API yapılandırması.
/// Data Annotations kullanılmaz; tüm kısıtlamalar burada tanımlanır.
/// </summary>
internal sealed class MerchantConfiguration : IEntityTypeConfiguration<Merchant>
{
    public void Configure(EntityTypeBuilder<Merchant> builder)
    {
        // --- Tablo adı ---
        builder.ToTable("Merchants");

        // --- Primary Key ---
        builder.HasKey(m => m.Id);

        // --- Sütun konfigürasyonları ---
        builder.Property(m => m.Name)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(m => m.Email)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(m => m.PhoneNumber)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(m => m.Address)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(m => m.IsActive)
               .IsRequired()
               .HasDefaultValue(true);

        builder.Property(m => m.DefaultPackageFee)
               .HasColumnType("decimal(18,2)")
               .HasDefaultValue(75.00m);

        builder.Property(m => m.CourierCutFee)
               .HasColumnType("decimal(18,2)")
               .HasDefaultValue(40.00m);

        builder.Property(m => m.DispatchMode)
               .IsRequired();

        builder.Property(m => m.HexagonSizeMeters)
               .IsRequired()
               .HasDefaultValue(1120);

        builder.Property(m => m.MaxCourierDistanceKm)
               .IsRequired()
               .HasDefaultValue(6);

        builder.Property(m => m.MaxOrdersPerTour)
               .IsRequired()
               .HasDefaultValue(2);

        builder.Property(m => m.OrderBatchingTimeMinutes)
               .IsRequired()
               .HasDefaultValue(15);

        builder.Property(m => m.CrossRestaurantDistanceMeters)
               .IsRequired()
               .HasDefaultValue(200);

        builder.Property(m => m.ReconciliationPeriod)
               .IsRequired();

        builder.Property(m => m.IsOpen)
               .IsRequired()
               .HasDefaultValue(true);

        builder.Property(m => m.Latitude)
               .IsRequired(false);

        builder.Property(m => m.Longitude)
               .IsRequired(false);

        // --- Audit alanları ---
        builder.Property(m => m.CreatedAt)
               .IsRequired();

        builder.Property(m => m.CreatedBy)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(m => m.UpdatedBy)
               .HasMaxLength(100);

        // --- Unique kısıtlamalar ---
        builder.HasIndex(m => m.Email)
               .IsUnique()
               .HasDatabaseName("UQ_Merchants_Email");

        // --- Soft delete: Global Query Filter DbContext'te tanımlanır ---
        // builder.HasQueryFilter(...) -> AppDbContext'e taşındı.

        // --- İlişkiler ---
        builder.HasMany(m => m.Orders)
               .WithOne(o => o.Merchant)
               .HasForeignKey(o => o.MerchantId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(m => m.Couriers)
               .WithOne(c => c.Merchant)
               .HasForeignKey(c => c.MerchantId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
