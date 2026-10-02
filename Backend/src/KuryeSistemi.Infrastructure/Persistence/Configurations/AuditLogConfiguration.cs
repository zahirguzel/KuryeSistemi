using KuryeSistemi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KuryeSistemi.Infrastructure.Persistence.Configurations;

internal sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.UserEmail)
               .HasMaxLength(150);

        builder.Property(a => a.UserRole)
               .HasMaxLength(50);

        builder.Property(a => a.Action)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(a => a.EntityName)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(a => a.EntityId)
               .HasMaxLength(100);

        builder.Property(a => a.Details)
               .HasMaxLength(4000);

        builder.Property(a => a.IpAddress)
               .HasMaxLength(100);

        builder.Property(a => a.CreatedAt)
               .IsRequired();

        builder.Property(a => a.CreatedBy)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasIndex(a => a.MerchantId)
               .HasDatabaseName("IX_AuditLogs_MerchantId");

        builder.HasIndex(a => a.Action)
               .HasDatabaseName("IX_AuditLogs_Action");

        builder.HasIndex(a => a.CreatedAt)
               .HasDatabaseName("IX_AuditLogs_CreatedAt");
    }
}
