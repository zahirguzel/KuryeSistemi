using KuryeSistemi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KuryeSistemi.Infrastructure.Persistence.Configurations;

internal sealed class CourierCompanyConfiguration : IEntityTypeConfiguration<CourierCompany>
{
    public void Configure(EntityTypeBuilder<CourierCompany> builder)
    {
        builder.ToTable("CourierCompanies");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(c => c.Email)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(c => c.PhoneNumber)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(c => c.Address)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(c => c.TaxNumber)
               .HasMaxLength(20);

        builder.Property(c => c.CreditBalance)
               .IsRequired()
               .HasDefaultValue(0);

        builder.Property(c => c.CreditWarningThreshold)
               .IsRequired()
               .HasDefaultValue(100);

        builder.Property(c => c.IsActive)
               .IsRequired()
               .HasDefaultValue(true);

        builder.Property(c => c.BlockOnZeroCredit)
               .IsRequired()
               .HasDefaultValue(true);

        builder.Property(c => c.LogoUrl)
               .HasMaxLength(500);

        builder.Property(c => c.CreatedAt).IsRequired();
        builder.Property(c => c.CreatedBy).IsRequired().HasMaxLength(100);
        builder.Property(c => c.UpdatedBy).HasMaxLength(100);

        // Unique e-posta
        builder.HasIndex(c => c.Email)
               .IsUnique()
               .HasDatabaseName("UQ_CourierCompanies_Email");

        // İlişkiler
        builder.HasMany(c => c.Merchants)
               .WithOne(m => m.CourierCompany)
               .HasForeignKey(m => m.CourierCompanyId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(c => c.Users)
               .WithOne(u => u.CourierCompany)
               .HasForeignKey(u => u.CourierCompanyId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(c => c.CreditTransactions)
               .WithOne(t => t.CourierCompany)
               .HasForeignKey(t => t.CourierCompanyId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
