// Common/Models/ServiceResult.cs

using System.Net;

namespace KuryeSistemi.Application.Common.Models;

public class ServiceResult<T>
{
    public bool IsSuccess { get; private set; }
    public T? Data { get; private set; }
    public string Message { get; private set; } = string.Empty;
    public int StatusCode { get; private set; }
    public List<string> Errors { get; private set; } = new();

    private ServiceResult() { }

    // --- Başarı ---
    public static ServiceResult<T> Success(T data, string message = "İşlem başarılı.", int statusCode = 200)
        => new() { IsSuccess = true, Data = data, Message = message, StatusCode = statusCode };

    public static ServiceResult<T> SuccessWithNoData(string message = "İşlem başarılı.", int statusCode = 200)
        => new() { IsSuccess = true, Data = default, Message = message, StatusCode = statusCode };

    public static ServiceResult<T> Created(T data, string message = "Kayıt oluşturuldu.")
        => new() { IsSuccess = true, Data = data, Message = message, StatusCode = (int)HttpStatusCode.Created };

    // --- Hata ---
    public static ServiceResult<T> Fail(string message, int statusCode = 400)
        => new() { IsSuccess = false, Message = message, StatusCode = statusCode };

    public static ServiceResult<T> Fail(List<string> errors, int statusCode = 400)
        => new() { IsSuccess = false, Errors = errors, StatusCode = statusCode, Message = "Doğrulama hatası." };

    public static ServiceResult<T> NotFound(string message = "Kayıt bulunamadı.")
        => Fail(message, (int)HttpStatusCode.NotFound);

    public static ServiceResult<T> Unauthorized(string message = "Bu işlem için yetkiniz yok.")
        => Fail(message, (int)HttpStatusCode.Unauthorized);

    public static ServiceResult<T> Conflict(string message = "Bu kayıt zaten mevcut.")
        => Fail(message, (int)HttpStatusCode.Conflict);

    public static ServiceResult<T> BadRequest(string message = "Geçersiz istek.")
        => Fail(message, (int)HttpStatusCode.BadRequest);

    public static ServiceResult<T> InternalError(string message = "Sunucu hatası oluştu.")
        => Fail(message, (int)HttpStatusCode.InternalServerError);
}

public class ServiceResult
{
    public bool IsSuccess { get; private set; }
    public string Message { get; private set; } = string.Empty;
    public int StatusCode { get; private set; }
    public List<string> Errors { get; private set; } = new();

    private ServiceResult() { }

    // --- Başarı ---
    public static ServiceResult Success(string message = "İşlem başarılı.", int statusCode = 200)
        => new() { IsSuccess = true, Message = message, StatusCode = statusCode };

    public static ServiceResult Created(string message = "Kayıt oluşturuldu.")
        => new() { IsSuccess = true, Message = message, StatusCode = (int)HttpStatusCode.Created };

    // --- Hata ---
    public static ServiceResult Fail(string message, int statusCode = 400)
        => new() { IsSuccess = false, Message = message, StatusCode = statusCode };

    public static ServiceResult Fail(List<string> errors, int statusCode = 400)
        => new() { IsSuccess = false, Errors = errors, StatusCode = statusCode, Message = "Doğrulama hatası." };

    public static ServiceResult NotFound(string message = "Kayıt bulunamadı.")
        => Fail(message, (int)HttpStatusCode.NotFound);

    public static ServiceResult Unauthorized(string message = "Bu işlem için yetkiniz yok.")
        => Fail(message, (int)HttpStatusCode.Unauthorized);

    public static ServiceResult Conflict(string message = "Bu kayıt zaten mevcut.")
        => Fail(message, (int)HttpStatusCode.Conflict);

    public static ServiceResult BadRequest(string message = "Geçersiz istek.")
        => Fail(message, (int)HttpStatusCode.BadRequest);

    public static ServiceResult InternalError(string message = "Sunucu hatası oluştu.")
        => Fail(message, (int)HttpStatusCode.InternalServerError);
}
