// Middlewares/GlobalExceptionMiddleware.cs

using System.Net;
using System.Text.Json;
using KuryeSistemi.Application.Common.Exceptions;
using KuryeSistemi.Application.Common.Models;

namespace KuryeSistemi.API.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "İşlenmeyen istisna: {Message} | Path: {Path} | Method: {Method}",
                ex.Message,
                context.Request.Path,
                context.Request.Method);

            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        int statusCode;
        string message;
        List<string> errors = new();

        switch (exception)
        {
            case UnauthorizedAccessException:
                statusCode = (int)HttpStatusCode.Unauthorized;
                message = exception.Message ?? "Bu işlem için yetkiniz bulunmuyor.";
                break;

            case AppException customEx:
                statusCode = customEx.StatusCode;
                message = customEx.Message;
                break;

            case ValidationException valEx:
                statusCode = (int)HttpStatusCode.BadRequest;
                message = "Doğrulama hatası.";
                errors = valEx.Errors.SelectMany(e => e.Value).ToList();
                break;

            case KeyNotFoundException:
                statusCode = (int)HttpStatusCode.NotFound;
                message = "İstenen kayıt bulunamadı.";
                break;

            case ArgumentException argEx:
                statusCode = (int)HttpStatusCode.BadRequest;
                message = argEx.Message;
                break;

            default:
                statusCode = (int)HttpStatusCode.InternalServerError;
                message = "Sunucu tarafında beklenmedik bir hata oluştu.";
                break;
        }

        context.Response.StatusCode = statusCode;

        var result = errors.Any() 
            ? ServiceResult.Fail(errors, statusCode)
            : ServiceResult.Fail(message, statusCode);

        var json = JsonSerializer.Serialize(result, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        return context.Response.WriteAsync(json);
    }
}
