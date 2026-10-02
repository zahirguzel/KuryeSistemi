using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KuryeSistemi.Infrastructure.Persistence.Configurations;

internal sealed class CreditTransactionConfiguration : IEntityTypeConfiguration<CreditTransaction>
{
    public void Configure(EntityTypeBuilder<CreditTransaction> builder)
    {
        builder.ToTable("CreditTransactions");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.CourierCompanyId).IsRequired();

        builder.Property(t => t.Type)
               .IsRequired();

        builder.Property(t => t.Amount)
               .IsRequired();

        builder.Property(t => t.BalanceAfter)
               .IsRequired();

        builder.Property(t => t.OrderId).IsRequired(false);

        builder.Property(t => t.ReferenceNumber)
               .HasMaxLength(100);

        builder.Property(t => t.Notes)
               .HasMaxLength(500);

        builder.Property(t => t.CreatedAt).IsRequired();
        builder.Property(t => t.CreatedBy).IsRequired().HasMaxLength(100);
        builder.Property(t => t.UpdatedBy).HasMaxLength(100);

        // İlişkiler
        builder.HasOne(t => t.CourierCompany)
               .WithMany(c => c.CreditTransactions)
               .HasForeignKey(t => t.CourierCompanyId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Order)
               .WithMany(o => o.CreditTransactions)
               .HasForeignKey(t => t.OrderId)
               .OnDelete(DeleteBehavior.SetNull);

        // Hızlı sorgular için indeksler
        builder.HasIndex(t => t.CourierCompanyId)
               .HasDatabaseName("IX_CreditTransactions_CompanyId");

        builder.HasIndex(t => t.OrderId)
               .HasDatabaseName("IX_CreditTransactions_OrderId");

        // Bir sipariş için en fazla bir teslimat kontörü düşümü (Type = DeliveryDeduction = 2): eşzamanlı çift düşümü engeller
        builder.HasIndex(t => new { t.OrderId, t.Type })
               .IsUnique()
               .HasFilter("\"OrderId\" IS NOT NULL AND \"Type\" = 2")
               .HasDatabaseName("UX_CreditTransactions_Order_Delivery");

        builder.HasIndex(t => t.CreatedAt)
               .HasDatabaseName("IX_CreditTransactions_CreatedAt");
    }
}
