using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Products;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace KuryeSistemi.Application.Services.Concrete;

public sealed class ProductService : IProductService
{
    private readonly IApplicationDbContext _db;

    public ProductService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<ServiceResult<List<ProductDto>>> GetProductsAsync(
        Guid merchantId,
        string? category = null,
        bool? onlyAvailable = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Products
            .AsNoTracking()
            .Where(p => p.MerchantId == merchantId);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        if (onlyAvailable.HasValue)
            query = query.Where(p => p.IsAvailable == onlyAvailable.Value);

        var products = await query
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.Name)
            .Select(p => new ProductDto(
                p.Id,
                p.MerchantId,
                p.Name,
                p.Category,
                p.Price,
                p.Description,
                p.IsAvailable,
                p.DisplayOrder))
            .ToListAsync(cancellationToken);

        return ServiceResult<List<ProductDto>>.Success(products);
    }

    public async Task<ServiceResult<List<string>>> GetCategoriesAsync(
        Guid merchantId,
        CancellationToken cancellationToken = default)
    {
        var categories = await _db.Products
            .AsNoTracking()
            .Where(p => p.MerchantId == merchantId && p.IsAvailable)
            .Select(p => p.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(cancellationToken);

        return ServiceResult<List<string>>.Success(categories);
    }

    public async Task<ServiceResult<ProductDto>> CreateProductAsync(
        Guid merchantId,
        CreateProductRequest request,
        string userEmail,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return ServiceResult<ProductDto>.BadRequest("Ürün adı boş olamaz.");

        if (string.IsNullOrWhiteSpace(request.Category))
            return ServiceResult<ProductDto>.BadRequest("Ürün kategorisi boş olamaz.");

        if (request.Price < 0)
            return ServiceResult<ProductDto>.BadRequest("Ürün fiyatı negatif olamaz.");

        var product = new Product
        {
            MerchantId   = merchantId,
            Name         = request.Name.Trim(),
            Category     = request.Category.Trim(),
            Price        = request.Price,
            Description  = request.Description?.Trim(),
            IsAvailable  = request.IsAvailable,
            DisplayOrder = request.DisplayOrder,
            CreatedBy    = userEmail
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync(cancellationToken);

        var dto = new ProductDto(
            product.Id,
            product.MerchantId,
            product.Name,
            product.Category,
            product.Price,
            product.Description,
            product.IsAvailable,
            product.DisplayOrder);

        return ServiceResult<ProductDto>.Created(dto, "Ürün başarıyla oluşturuldu.");
    }

    public async Task<ServiceResult<int>> BulkCreateProductsAsync(
        Guid merchantId,
        List<CreateProductRequest> products,
        string userEmail,
        CancellationToken cancellationToken = default)
    {
        if (products == null || products.Count == 0)
            return ServiceResult<int>.BadRequest("En az bir ürün gönderilmelidir.");

        var productEntities = products
            .Where(p => !string.IsNullOrWhiteSpace(p.Name) && !string.IsNullOrWhiteSpace(p.Category) && p.Price >= 0)
            .Select(p => new Product
            {
                MerchantId   = merchantId,
                Name         = p.Name.Trim(),
                Category     = p.Category.Trim(),
                Price        = p.Price,
                Description  = p.Description?.Trim(),
                IsAvailable  = p.IsAvailable,
                DisplayOrder = p.DisplayOrder,
                CreatedBy    = userEmail
            }).ToList();

        if (productEntities.Count == 0)
            return ServiceResult<int>.BadRequest("Geçerli hiçbir ürün bulunamadı.");

        _db.Products.AddRange(productEntities);
        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult<int>.Success(productEntities.Count, $"{productEntities.Count} ürün başarıyla eklendi.");
    }

    public async Task<ServiceResult<ProductDto>> UpdateProductAsync(
        Guid merchantId,
        Guid productId,
        UpdateProductRequest request,
        string userEmail,
        CancellationToken cancellationToken = default)
    {
        var product = await _db.Products
            .FirstOrDefaultAsync(p => p.Id == productId && p.MerchantId == merchantId, cancellationToken);

        if (product is null)
            return ServiceResult<ProductDto>.NotFound("Ürün bulunamadı.");

        if (request.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return ServiceResult<ProductDto>.BadRequest("Ürün adı boş olamaz.");
            product.Name = request.Name.Trim();
        }

        if (request.Category is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Category))
                return ServiceResult<ProductDto>.BadRequest("Ürün kategorisi boş olamaz.");
            product.Category = request.Category.Trim();
        }

        if (request.Price.HasValue)
        {
            if (request.Price.Value < 0)
                return ServiceResult<ProductDto>.BadRequest("Ürün fiyatı negatif olamaz.");
            product.Price = request.Price.Value;
        }

        if (request.Description is not null)
            product.Description = request.Description.Trim();

        if (request.IsAvailable.HasValue)
            product.IsAvailable = request.IsAvailable.Value;

        if (request.DisplayOrder.HasValue)
            product.DisplayOrder = request.DisplayOrder.Value;

        product.UpdatedBy = userEmail;

        await _db.SaveChangesAsync(cancellationToken);

        var dto = new ProductDto(
            product.Id,
            product.MerchantId,
            product.Name,
            product.Category,
            product.Price,
            product.Description,
            product.IsAvailable,
            product.DisplayOrder);

        return ServiceResult<ProductDto>.Success(dto, "Ürün güncellendi.");
    }

    public async Task<ServiceResult<bool>> DeleteProductAsync(
        Guid merchantId,
        Guid productId,
        string userEmail,
        CancellationToken cancellationToken = default)
    {
        var product = await _db.Products
            .FirstOrDefaultAsync(p => p.Id == productId && p.MerchantId == merchantId, cancellationToken);

        if (product is null)
            return ServiceResult<bool>.NotFound("Ürün bulunamadı.");

        product.IsDeleted = true;
        product.UpdatedBy = userEmail;

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult<bool>.Success(true, "Ürün silindi.");
    }
}
