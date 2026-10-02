namespace KuryeSistemi.Application.Common.Settings;

/// <summary>
/// appsettings.json → "JwtSettings" bölümüne karşılık gelen POCO.
/// IOptions&lt;JwtSettings&gt; ile inject edilir.
/// </summary>
public sealed class JwtSettings
{
    public const string SectionName = "JwtSettings";

    public string SecretKey      { get; init; } = string.Empty;
    public string Issuer         { get; init; } = string.Empty;
    public string Audience       { get; init; } = string.Empty;
    public int    ExpiryMinutes  { get; init; } = 60;
}
