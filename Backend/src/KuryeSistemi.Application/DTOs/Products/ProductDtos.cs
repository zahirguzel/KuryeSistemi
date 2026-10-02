namespace KuryeSistemi.Application.DTOs.Products;

public record ProductDto(
    Guid Id,
    Guid MerchantId,
    string Name,
    string Category,
    decimal Price,
    string? Description,
    bool IsAvailable,
    int DisplayOrder
);

public record CreateProductRequest(
    string Name,
    string Category,
    decimal Price,
    string? Description = null,
    bool IsAvailable = true,
    int DisplayOrder = 0
);

public record UpdateProductRequest(
    string? Name,
    string? Category,
    decimal? Price,
    string? Description,
    bool? IsAvailable,
    int? DisplayOrder
);

public record BulkCreateProductsRequest(
    Guid? MerchantId,
    List<CreateProductRequest> Products
);
