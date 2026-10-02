using System.Text.Json.Serialization;

namespace KuryeSistemi.Domain.Enums;

/// <summary>
/// Kurye aracının tipi.
/// GPS konumu Redis'te tutulacağı için bu entity'de konum alanı bulunmamaktadır.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum VehicleType
{
    Motorcycle = 0,
    Car = 1,
    Van = 2,
    Bicycle = 3,
    ElectricScooter = 4
}
