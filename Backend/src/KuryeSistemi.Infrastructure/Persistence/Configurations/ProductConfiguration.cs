using KuryeSistemi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KuryeSistemi.Infrastructure.Persistence.Configurations;

/// <summary>
/// Product tablosu için Fluent API yapılandırması.
/// </summary>
internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(p => p.Category)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(p => p.Price)
               .IsRequired()
               .HasColumnType("decimal(18,2)")
               .HasDefaultValue(0.00m);

        builder.Property(p => p.Description)
               .HasMaxLength(1000);

        builder.Property(p => p.IsAvailable)
               .HasDefaultValue(true);

        builder.Property(p => p.DisplayOrder)
               .HasDefaultValue(0);

        // --- Audit alanları ---
        builder.Property(p => p.CreatedAt).IsRequired();
        builder.Property(p => p.CreatedBy).IsRequired().HasMaxLength(100);
        builder.Property(p => p.UpdatedBy).HasMaxLength(100);

        // --- Multi-Tenant FK ---
        builder.Property(p => p.MerchantId).IsRequired();

        // --- Index'ler ---
        builder.HasIndex(p => p.MerchantId)
               .HasDatabaseName("IX_Products_MerchantId");

        builder.HasIndex(p => new { p.MerchantId, p.Category })
               .HasDatabaseName("IX_Products_MerchantId_Category");

        builder.HasIndex(p => new { p.MerchantId, p.IsAvailable })
               .HasDatabaseName("IX_Products_MerchantId_IsAvailable");

        // --- İlişki: Product → Merchant ---
        builder.HasOne(p => p.Merchant)
               .WithMany(m => m.Products)
               .HasForeignKey(p => p.MerchantId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
