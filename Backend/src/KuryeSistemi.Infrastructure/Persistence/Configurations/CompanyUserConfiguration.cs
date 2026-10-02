using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KuryeSistemi.Infrastructure.Persistence.Configurations;

internal sealed class CompanyUserConfiguration : IEntityTypeConfiguration<CompanyUser>
{
    public void Configure(EntityTypeBuilder<CompanyUser> builder)
    {
        builder.ToTable("CompanyUsers");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.CourierCompanyId).IsRequired();

        builder.Property(u => u.FirstName)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(u => u.LastName)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(u => u.Email)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(u => u.PasswordHash)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(u => u.PhoneNumber)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(u => u.Role)
               .IsRequired()
               .HasDefaultValue(CompanyUserRole.Operator);

        // Granüler izinler - nullable bool sütunlar
        builder.Property(u => u.CanViewReports).IsRequired(false);
        builder.Property(u => u.CanManageFinance).IsRequired(false);
        builder.Property(u => u.CanManageCouriers).IsRequired(false);
        builder.Property(u => u.CanManageOrders).IsRequired(false);
        builder.Property(u => u.CanManageMerchants).IsRequired(false);
        builder.Property(u => u.CanEditCompanySettings).IsRequired(false);

        builder.Property(u => u.IsActive)
               .IsRequired()
               .HasDefaultValue(true);

        builder.Property(u => u.LastLoginAt).IsRequired(false);

        builder.Property(u => u.CreatedAt).IsRequired();
        builder.Property(u => u.CreatedBy).IsRequired().HasMaxLength(100);
        builder.Property(u => u.UpdatedBy).HasMaxLength(100);

        // Platform genelinde unique e-posta
        builder.HasIndex(u => u.Email)
               .IsUnique()
               .HasDatabaseName("UQ_CompanyUsers_Email");

        // İlişki - navigation
        builder.HasOne(u => u.CourierCompany)
               .WithMany(c => c.Users)
               .HasForeignKey(u => u.CourierCompanyId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
