using FluentValidation;
using MediatR;

namespace KuryeSistemi.Application.Common.Behaviours;

/// <summary>
/// MediatR Pipeline Behavior — tüm Command/Query'leri Handler'a ulaşmadan önce yakalar.
///
/// Çalışma mantığı:
///   1. DI container'dan ilgili IValidator&lt;TRequest&gt; örnekleri çekilir.
///   2. Hiç validator kayıtlı değilse doğrudan Handler'a geçilir (passthrough).
///   3. Validator varsa tüm kurallar paralel çalıştırılır.
///   4. Herhangi bir kural ihlali varsa ValidationException fırlatılır
///      (Handler asla çağrılmaz).
///   5. Tüm kurallar geçilirse Handler çağrılır ve sonucu döner.
/// </summary>
public sealed class ValidationBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        // Kayıtlı validator yoksa doğrudan ilerle
        if (!_validators.Any())
            return await next();

        // Tüm validator'ları paralel çalıştır — yüksek trafikte latency düşer
        var context = new ValidationContext<TRequest>(request);

        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count != 0)
            throw new Common.Exceptions.ValidationException(failures);

        return await next();
    }
}
