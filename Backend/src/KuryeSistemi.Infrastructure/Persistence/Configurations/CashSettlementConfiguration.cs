using KuryeSistemi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KuryeSistemi.Infrastructure.Persistence.Configurations;

/// <summary>
/// CashSettlement tablosu için Fluent API yapılandırması.
/// Finansal denetim (audit log) ve kasa mahsuplaşma geçmişi.
/// </summary>
internal sealed class CashSettlementConfiguration : IEntityTypeConfiguration<CashSettlement>
{
    public void Configure(EntityTypeBuilder<CashSettlement> builder)
    {
        // --- Tablo Adı ---
        builder.ToTable("CashSettlements");

        // --- Primary Key ---
        builder.HasKey(cs => cs.Id);

        // --- Finansal & Sayısal Alanlar ---
        builder.Property(cs => cs.SettledAmount)
               .IsRequired()
               .HasColumnType("decimal(18,2)");

        builder.Property(cs => cs.CashCollectedTotal)
               .IsRequired()
               .HasColumnType("decimal(18,2)");

        builder.Property(cs => cs.CourierEarningsTotal)
               .IsRequired()
               .HasColumnType("decimal(18,2)");

        builder.Property(cs => cs.DeliveredPackageCount)
               .IsRequired();

        builder.Property(cs => cs.SettledAt)
               .IsRequired();

        builder.Property(cs => cs.Notes)
               .HasMaxLength(500);

        // --- Audit Alanları (BaseEntity) ---
        builder.Property(cs => cs.CreatedBy)
               .HasMaxLength(150);

        builder.Property(cs => cs.UpdatedBy)
               .HasMaxLength(150);

        // --- İlişkiler ---
        builder.HasOne(cs => cs.Merchant)
               .WithMany(m => m.CashSettlements)
               .HasForeignKey(cs => cs.MerchantId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(cs => cs.Courier)
               .WithMany(c => c.CashSettlements)
               .HasForeignKey(cs => cs.CourierId)
               .OnDelete(DeleteBehavior.Restrict);

        // --- İndeksler (Sorgu Performansı) ---
        builder.HasIndex(cs => new { cs.MerchantId, cs.SettledAt });
        builder.HasIndex(cs => cs.CourierId);
    }
}
