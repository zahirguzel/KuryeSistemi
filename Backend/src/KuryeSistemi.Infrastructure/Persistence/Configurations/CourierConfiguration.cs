using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KuryeSistemi.Infrastructure.Persistence.Configurations;

/// <summary>
/// Courier tablosu için Fluent API yapılandırması.
/// GPS konum bilgisi bu tabloda saklanmaz (Redis'e bırakıldı).
/// </summary>
internal sealed class CourierConfiguration : IEntityTypeConfiguration<Courier>
{
    public void Configure(EntityTypeBuilder<Courier> builder)
    {
        // --- Tablo adı ---
        builder.ToTable("Couriers");

        // --- Primary Key ---
        builder.HasKey(c => c.Id);

        // --- Kişisel Bilgiler ---
        builder.Property(c => c.FirstName)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(c => c.LastName)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(c => c.PhoneNumber)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(c => c.Email)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(c => c.PasswordHash)
               .IsRequired()
               .HasMaxLength(255)
               .HasDefaultValue(string.Empty);

        // --- Araç Bilgileri ---
        builder.Property(c => c.VehicleType)
               .IsRequired()
               .HasConversion<string>()   // Enum → string (okunabilirlik için)
               .HasMaxLength(30);

        builder.Property(c => c.LicensePlate)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(c => c.VehicleBrand)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(c => c.VehicleModel)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(c => c.IsAvailable)
               .IsRequired()
               .HasDefaultValue(true);

        builder.Property(c => c.IsOnBreak)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(c => c.IsOnline)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(c => c.CurrentLatitude)
               .IsRequired(false);

        builder.Property(c => c.CurrentLongitude)
               .IsRequired(false);

        builder.Property(c => c.LastLocationUpdate)
               .IsRequired(false);

        // --- Kasa / Mahsuplaşma Bakiyesi ---
        builder.Property(c => c.CurrentBalance)
               .IsRequired()
               .HasColumnType("decimal(18,2)")
               .HasDefaultValue(0.00m);

        // PostgreSQL xmin tabanlı Concurrency Token (Race Condition Koruması)
        builder.UseXminAsConcurrencyToken();

        // --- Audit alanları ---
        builder.Property(c => c.CreatedAt)
               .IsRequired();

        builder.Property(c => c.CreatedBy)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(c => c.UpdatedBy)
               .HasMaxLength(100);

        // --- Multi-Tenant: CourierCompanyId & MerchantId ---
        builder.Property(c => c.CourierCompanyId)
               .IsRequired();

        builder.Property(c => c.MerchantId)
               .IsRequired(false);

        // --- Unique & Index kısıtlamalar ---
        builder.HasIndex(c => c.LicensePlate)
               .IsUnique()
               .HasDatabaseName("UQ_Couriers_LicensePlate");

        builder.HasIndex(c => c.PhoneNumber)
               .IsUnique()
               .HasDatabaseName("UQ_Couriers_PhoneNumber");

        builder.HasIndex(c => c.CourierCompanyId)
               .HasDatabaseName("IX_Couriers_CourierCompanyId");

        builder.HasIndex(c => c.MerchantId)
               .HasDatabaseName("IX_Couriers_MerchantId");

        // --- İlişkiler ---
        builder.HasOne(c => c.CourierCompany)
               .WithMany(cc => cc.Couriers)
               .HasForeignKey(c => c.CourierCompanyId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Merchant)
               .WithMany(m => m.Couriers)
               .HasForeignKey(c => c.MerchantId)
               .IsRequired(false)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
