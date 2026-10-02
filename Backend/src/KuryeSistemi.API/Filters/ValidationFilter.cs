using FluentValidation;
using KuryeSistemi.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace KuryeSistemi.API.Filters;

/// <summary>
/// Gelen controller isteklerini kayıtlı FluentValidation IValidator&lt;T&gt; sınıfları üzerinden
/// doğrular. Doğrulama başarısız olduğunda sistem genelindeki standart ServiceResult formatında (HTTP 400) yanıt döner.
/// </summary>
public sealed class ValidationFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var services = context.HttpContext.RequestServices;
        var cancellationToken = context.HttpContext.RequestAborted;

        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null) continue;

            var argumentType = argument.GetType();
            var validatorType = typeof(IValidator<>).MakeGenericType(argumentType);

            if (services.GetService(validatorType) is IValidator validator)
            {
                var validationContext = new ValidationContext<object>(argument);
                var validationResult = await validator.ValidateAsync(validationContext, cancellationToken);

                if (!validationResult.IsValid)
                {
                    var errors = validationResult.Errors
                        .Select(e => e.ErrorMessage)
                        .Distinct()
                        .ToList();

                    var errorResult = ServiceResult<object>.Fail(errors, StatusCodes.Status400BadRequest);
                    context.Result = new BadRequestObjectResult(errorResult);
                    return;
                }
            }
        }

        await next();
    }
}
