namespace KuryeSistemi.Application.Common.Exceptions;

/// <summary>
/// FluentValidation kurallarından geçemeyen durumlarda fırlatılan domain exception.
/// Hata listesi field → mesaj formatında taşınır.
/// API katmanındaki global exception handler bu tipi yakalar ve 400 döner.
/// </summary>
public sealed class ValidationException : Exception
{
    /// <summary>
    /// Alan adı (property path) → hata mesajları eşlemesi.
    /// Birden fazla kural ihlalinde aynı alan için birden fazla mesaj olabilir.
    /// </summary>
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(
        IEnumerable<FluentValidation.Results.ValidationFailure> failures)
        : base("Bir veya daha fazla doğrulama hatası oluştu.")
    {
        Errors = failures
            .GroupBy(f => f.PropertyName, f => f.ErrorMessage)
            .ToDictionary(
                group => group.Key,
                group => group.ToArray());
    }
}
