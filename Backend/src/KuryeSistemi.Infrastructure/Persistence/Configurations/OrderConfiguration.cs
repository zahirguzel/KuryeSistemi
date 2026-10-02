using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KuryeSistemi.Infrastructure.Persistence.Configurations;

/// <summary>
/// Order tablosu için Fluent API yapılandırması.
/// Durum makinesi (OrderStatus), adres alanları ve FK kısıtlamaları burada tanımlanır.
/// </summary>
internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        // --- Tablo adı ---
        builder.ToTable("Orders");

        // --- Primary Key ---
        builder.HasKey(o => o.Id);

        // --- Durum Makinesi ---
        builder.Property(o => o.Status)
               .IsRequired()
               .HasConversion<string>()  // Enum → string (migration okunabilirliği için)
               .HasMaxLength(20)
               .HasDefaultValue(OrderStatus.Pending);

        // --- Alım Adresi ---
        builder.Property(o => o.PickupAddressLine)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(o => o.PickupDistrict)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(o => o.PickupCity)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(o => o.PickupLatitude)
               .HasColumnType("decimal(9,6)");

        builder.Property(o => o.PickupLongitude)
               .HasColumnType("decimal(9,6)");

        // --- Teslim Adresi ---
        builder.Property(o => o.DeliveryAddressLine)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(o => o.DeliveryDistrict)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(o => o.DeliveryCity)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(o => o.DeliveryLatitude)
               .HasColumnType("decimal(9,6)");

        builder.Property(o => o.DeliveryLongitude)
               .HasColumnType("decimal(9,6)");

        // --- Alıcı Bilgileri ---
        builder.Property(o => o.RecipientName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(o => o.RecipientPhone)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(o => o.Notes)
               .HasMaxLength(1000);

        // --- Zaman damgaları ---
        builder.Property(o => o.PickedUpAt)
               .IsRequired(false);

        builder.Property(o => o.DeliveredAt)
               .IsRequired(false);

        // --- Kurye Hakedişi & Firma Payı (Mühürlü Değerler) ---
        builder.Property(o => o.CourierEarning)
               .HasColumnType("decimal(18,2)")
               .HasDefaultValue(0.00m);

        builder.Property(o => o.FirmFee)
               .HasColumnType("decimal(18,2)")
               .HasDefaultValue(0.00m);

        builder.Property(o => o.IsReconciled)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(o => o.CashSettlementId)
               .IsRequired(false);

        // PostgreSQL xmin tabanlı Concurrency Token (Race Condition Koruması)
        builder.UseXminAsConcurrencyToken();

        // --- Ödeme Yöntemi ve Toplam Tutar ---
        builder.Property(o => o.PaymentMethod)
               .IsRequired()
               .HasConversion<string>()
               .HasMaxLength(30)
               .HasDefaultValue(PaymentMethod.Online);

        builder.Property(o => o.TotalOrderAmount)
               .IsRequired()
               .HasColumnType("decimal(18,2)")
               .HasDefaultValue(0.00m);

        // --- Ekstra Platform ve Lokasyon Alanları ---
        builder.Property(o => o.OrderCode)
               .HasMaxLength(50);

        builder.Property(o => o.Source)
               .HasMaxLength(50);

        builder.Property(o => o.DeliveryNeighborhood)
               .HasMaxLength(100);

        builder.Property(o => o.AssignedAt)
               .IsRequired(false);

        // --- Audit alanları ---
        builder.Property(o => o.CreatedAt)
               .IsRequired();

        builder.Property(o => o.CreatedBy)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(o => o.UpdatedBy)
               .HasMaxLength(100);

        // --- Multi-Tenant: MerchantId ---
        builder.Property(o => o.MerchantId)
               .IsRequired();

        // --- Nullable FK: CourierId ---
        builder.Property(o => o.CourierId)
               .IsRequired(false);

        // --- Index'ler (yüksek trafik için kritik) ---
        builder.HasIndex(o => o.MerchantId)
               .HasDatabaseName("IX_Orders_MerchantId");

        builder.HasIndex(o => o.CourierId)
               .HasDatabaseName("IX_Orders_CourierId");

        builder.HasIndex(o => o.Status)
               .HasDatabaseName("IX_Orders_Status");

        builder.HasIndex(o => new { o.MerchantId, o.Status })
               .HasDatabaseName("IX_Orders_MerchantId_Status");

        // --- İlişkiler ---
        builder.HasOne(o => o.Merchant)
               .WithMany(m => m.Orders)
               .HasForeignKey(o => o.MerchantId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.Courier)
               .WithMany(c => c.Orders)
               .HasForeignKey(o => o.CourierId)
               .OnDelete(DeleteBehavior.SetNull)
               .IsRequired(false);
    }
}
