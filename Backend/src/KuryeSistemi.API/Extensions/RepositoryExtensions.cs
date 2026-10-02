// Extensions/RepositoryExtensions.cs

using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Infrastructure.Repositories;

namespace KuryeSistemi.API.Extensions;

public static class RepositoryExtensions
{
    public static IServiceCollection AddRepositories(this IServiceCollection services)
    {
        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<ICourierRepository, CourierRepository>();
        services.AddScoped<IMerchantRepository, MerchantRepository>();

        return services;
    }
}
