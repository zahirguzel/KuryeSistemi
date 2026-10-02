namespace KuryeSistemi.Application.Interfaces;

/// <summary>
/// Sistem genelinde denetim ve işlem izleme (Audit Log) kayıt sözleşmesi.
/// </summary>
public interface IAuditService
{
    Task LogAsync(
        Guid? userId,
        string userEmail,
        string userRole,
        Guid? merchantId,
        string action,
        string entityName,
        string entityId,
        string? details = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);
}
