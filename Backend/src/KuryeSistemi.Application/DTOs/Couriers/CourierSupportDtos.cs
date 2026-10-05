namespace KuryeSistemi.Application.DTOs.Couriers;

/// <summary>Kuryenin acil durum (SOS) çağrısı. Konum verilmezse kuryenin son bilinen konumu kullanılır.</summary>
public sealed record SosRequest(
    string? Note = null,
    double? Latitude = null,
    double? Longitude = null);

/// <summary>Kuryenin bağlı olduğu firmanın dispeçer iletişim bilgisi. Telefon tanımlı değilse null.</summary>
public sealed record CourierSupportInfoDto(
    string? DispatcherPhone,
    string CompanyName);

public sealed record CourierSosResultDto(DateTime SentAt);
