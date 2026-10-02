// Common/Exceptions/AppException.cs

namespace KuryeSistemi.Application.Common.Exceptions;

public class AppException : Exception
{
    public int StatusCode { get; }

    public AppException(string message, int statusCode = 400)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public static AppException NotFound(string message = "Kayıt bulunamadı.")
        => new(message, 404);

    public static AppException Unauthorized(string message = "Bu işlem için yetkiniz yok.")
        => new(message, 401);

    public static AppException Forbidden(string message = "Bu kaynağa erişim yasaktır.")
        => new(message, 403);

    public static AppException BadRequest(string message = "Geçersiz istek.")
        => new(message, 400);

    public static AppException Conflict(string message = "Bu kayıt zaten mevcut.")
        => new(message, 409);
}
