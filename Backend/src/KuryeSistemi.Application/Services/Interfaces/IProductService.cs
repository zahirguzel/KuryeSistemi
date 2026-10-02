using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Products;

namespace KuryeSistemi.Application.Services.Interfaces;

public interface IProductService
{
    Task<ServiceResult<List<ProductDto>>> GetProductsAsync(
        Guid merchantId,
        string? category = null,
        bool? onlyAvailable = null,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<List<string>>> GetCategoriesAsync(
        Guid merchantId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<ProductDto>> CreateProductAsync(
        Guid merchantId,
        CreateProductRequest request,
        string userEmail,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<int>> BulkCreateProductsAsync(
        Guid merchantId,
        List<CreateProductRequest> products,
        string userEmail,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<ProductDto>> UpdateProductAsync(
        Guid merchantId,
        Guid productId,
        UpdateProductRequest request,
        string userEmail,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<bool>> DeleteProductAsync(
        Guid merchantId,
        Guid productId,
        string userEmail,
        CancellationToken cancellationToken = default);
}
