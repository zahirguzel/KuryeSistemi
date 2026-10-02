using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace KuryeSistemi.Application;

/// <summary>
/// Application katmanının DI kayıt extension metodu.
/// FluentValidation validator'larını otomatik tarar ve Scoped olarak DI'a kaydeder.
/// </summary>
public static class ApplicationServiceRegistration
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // FluentValidation: Bu assembly içindeki tüm AbstractValidator<T> sınıflarını
        // otomatik tarar ve Scoped olarak DI'a kaydeder.
        services.AddValidatorsFromAssembly(assembly);

        return services;
    }
}
