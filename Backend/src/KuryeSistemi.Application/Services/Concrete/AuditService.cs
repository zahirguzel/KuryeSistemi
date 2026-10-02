using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace KuryeSistemi.Application.Services.Concrete;

/// <summary>
/// Audit log kayıtlarını veritabanına işleyen servis.
/// </summary>
public sealed class AuditService : IAuditService
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<AuditService> _logger;

    public AuditService(
        IApplicationDbContext db,
        ILogger<AuditService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task LogAsync(
        Guid? userId,
        string userEmail,
        string userRole,
        Guid? merchantId,
        string action,
        string entityName,
        string entityId,
        string? details = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var log = new AuditLog
            {
                UserId = userId,
                UserEmail = userEmail ?? string.Empty,
                UserRole = userRole ?? string.Empty,
                MerchantId = merchantId,
                Action = action,
                EntityName = entityName,
                EntityId = entityId,
                Details = details,
                IpAddress = ipAddress,
                CreatedBy = userEmail ?? "system",
                CreatedAt = DateTime.UtcNow
            };

            _db.AuditLogs.Add(log);
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit log hatası ana akışı kesmemeli, loglanmalı
            _logger.LogError(ex, "--> [AUDIT LOG ERROR] Denetim kaydı oluşturulamadı: {Action} - {EntityName}:{EntityId}", action, entityName, entityId);
        }
    }
}
