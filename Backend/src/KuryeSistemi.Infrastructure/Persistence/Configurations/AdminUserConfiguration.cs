using KuryeSistemi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KuryeSistemi.Infrastructure.Persistence.Configurations;

internal sealed class AdminUserConfiguration : IEntityTypeConfiguration<AdminUser>
{
    public void Configure(EntityTypeBuilder<AdminUser> builder)
    {
        builder.ToTable("AdminUsers");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.FullName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(a => a.Email)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(a => a.PasswordHash)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(a => a.IsActive)
               .IsRequired()
               .HasDefaultValue(true);

        builder.Property(a => a.LastLoginAt).IsRequired(false);

        builder.Property(a => a.CreatedAt).IsRequired();
        builder.Property(a => a.CreatedBy).IsRequired().HasMaxLength(100);
        builder.Property(a => a.UpdatedBy).HasMaxLength(100);

        // Platform genelinde unique e-posta
        builder.HasIndex(a => a.Email)
               .IsUnique()
               .HasDatabaseName("UQ_AdminUsers_Email");
    }
}
