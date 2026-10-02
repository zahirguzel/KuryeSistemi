using KuryeSistemi.Application.DTOs.Products;
using KuryeSistemi.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KuryeSistemi.API.Controllers.Products;

/// <summary>
/// Ürün (Menü) yönetimi.
/// Hızlı Sipariş (POS) ekranında kullanılan ürünlerin CRUD işlemleri.
/// </summary>
[Authorize(Policy = "MerchantOnly")]
[Route("api/products")]
public class ProductsController : BaseController
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/products?merchantId=...&category=...&onlyAvailable=true
    // ──────────────────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetProducts(
        [FromQuery] Guid? merchantId = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? onlyAvailable = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = IsFirmOrAdmin()
            ? (merchantId ?? GetMerchantId())
            : GetMerchantId();

        if (IsFirmOrAdmin() && tenantId != Guid.Empty && !await CanAccessMerchantAsync(tenantId, cancellationToken))
            return Forbid();

        var result = await _productService.GetProductsAsync(tenantId, category, onlyAvailable, cancellationToken);
        return CreateActionResult(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/products/categories
    // ──────────────────────────────────────────────────────────────────────────

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(
        [FromQuery] Guid? merchantId = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = IsFirmOrAdmin()
            ? (merchantId ?? GetMerchantId())
            : GetMerchantId();

        if (IsFirmOrAdmin() && tenantId != Guid.Empty && !await CanAccessMerchantAsync(tenantId, cancellationToken))
            return Forbid();

        var result = await _productService.GetCategoriesAsync(tenantId, cancellationToken);
        return CreateActionResult(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/products
    // ──────────────────────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> CreateProduct(
        [FromBody] CreateProductRequest request,
        CancellationToken cancellationToken = default)
    {
        var merchantId = GetMerchantId();
        var email = GetUserEmail();

        var result = await _productService.CreateProductAsync(merchantId, request, email, cancellationToken);
        return CreateActionResult(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/products/bulk  (Excel import'tan gelen toplu ürünler)
    // ──────────────────────────────────────────────────────────────────────────

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkCreateProducts(
        [FromBody] BulkCreateProductsRequest request,
        CancellationToken cancellationToken = default)
    {
        var merchantId = IsFirmOrAdmin() && request.MerchantId.HasValue
            ? request.MerchantId.Value
            : GetMerchantId();

        if (IsFirmOrAdmin() && merchantId != Guid.Empty && !await CanAccessMerchantAsync(merchantId, cancellationToken))
            return Forbid();

        var email = GetUserEmail();
        var result = await _productService.BulkCreateProductsAsync(merchantId, request.Products, email, cancellationToken);
        return CreateActionResult(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUT /api/products/{id}
    // ──────────────────────────────────────────────────────────────────────────

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProduct(
        Guid id,
        [FromBody] UpdateProductRequest request,
        CancellationToken cancellationToken = default)
    {
        var merchantId = GetMerchantId();
        var email = GetUserEmail();

        var result = await _productService.UpdateProductAsync(merchantId, id, request, email, cancellationToken);
        return CreateActionResult(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DELETE /api/products/{id}
    // ──────────────────────────────────────────────────────────────────────────

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProduct(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var merchantId = GetMerchantId();
        var email = GetUserEmail();

        var result = await _productService.DeleteProductAsync(merchantId, id, email, cancellationToken);
        return CreateActionResult(result);
    }
}
