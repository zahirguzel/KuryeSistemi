using FluentValidation;
using KuryeSistemi.Application.Common.Behaviours;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace KuryeSistemi.Application;

/// <summary>
/// Application katmanının DI kayıt extension metodu.
/// API katmanı sadece bu metodu çağırır; MediatR ve handler detaylarını bilmesine gerek yoktur.
/// </summary>
public static class ApplicationServiceRegistration
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // MediatR: Bu assembly içindeki tüm IRequestHandler'ları otomatik tarar ve kaydeder.
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);

            // LoggingBehavior: İstek parametrelerini, çalışma süresini ve performans uyarılarını loglar.
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));

            // ValidationBehavior: Her Request Handler'dan ÖNCE çalışır.
            // Yeni bir Command için Validator yazıldığında buraya dokunmak gerekmez.
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

            // CachingBehavior: ICacheableQuery uygulayan sorguları Redis üzerinden önbellekler.
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(CachingBehavior<,>));

            // CacheInvalidationBehavior: ICacheRemoverCommand uygulayan komutlardan sonra önbelleği temizler.
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(CacheInvalidationBehavior<,>));
        });

        // FluentValidation: Bu assembly içindeki tüm AbstractValidator<T> sınıflarını
        // otomatik tarar ve Scoped olarak DI'a kaydeder.
        services.AddValidatorsFromAssembly(assembly);

        return services;
    }
}
