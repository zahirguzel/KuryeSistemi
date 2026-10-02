using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Orders;
using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KuryeSistemi.API.Controllers.Orders;

[Produces("application/json")]
[Authorize]
public sealed class OrdersController : BaseController
{
    private readonly IOrderService _orderService;
    private readonly ICourierRepository _courierRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly ICreditService _creditService;

    public OrdersController(
        IOrderService orderService,
        ICourierRepository courierRepository,
        IOrderRepository orderRepository,
        ICreditService creditService)
    {
        _creditService = creditService;
        _orderService = orderService;
        _courierRepository = courierRepository;
        _orderRepository = orderRepository;
    }

    /// <summary>
    /// Siparişleri listeler. MerchantId verilmişse işletmeye göre, verilmemişse tüm siparişleri döner (Kurye Firması için).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<OrderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? merchantId,
        [FromQuery] OrderStatus? status,
        [FromQuery] bool today = false,
        CancellationToken cancellationToken = default)
    {
        if (IsFirmOrAdmin())
        {
            if (merchantId.HasValue && merchantId.Value != Guid.Empty)
            {
                if (!await CanAccessMerchantAsync(merchantId.Value, cancellationToken))
                    return Forbid();

                var result = await _orderService.GetOrdersByMerchantAsync(merchantId.Value, status, cancellationToken);
                return CreateActionResult(result);
            }

            // Tenant izolasyonu: firma kullanıcısı yalnızca kendi firmasının işletme siparişlerini görür;
            // kapsam sorguya iletilir, başka firmaların siparişleri veritabanından hiç çekilmez.
            var accessibleIds = await GetAccessibleMerchantIdsAsync(cancellationToken);
            var allResult = await _orderService.GetAllOrdersAsync(status, today, accessibleIds, cancellationToken);
            return CreateActionResult(allResult);
        }

        // Standart işletme sadece kendi siparişlerini listeleyebilir (Tenant İzolasyonu)
        var ownMerchantId = GetMerchantId();
        var ownResult = await _orderService.GetOrdersByMerchantAsync(ownMerchantId, status, cancellationToken);
        return CreateActionResult(ownResult);
    }

    /// <summary>
    /// Sunucu taraflı filtreli/sayfalı sipariş listesi (firma paneli). Tenant kapsamı sunucuda uygulanır;
    /// sayfa boyutu en fazla 200. Yanıt, durum sayaçlarını ve bugün teslim sayısını da içerir.
    /// </summary>
    [HttpGet("paged")]
    [ProducesResponseType(typeof(OrderPageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaged(
        [FromQuery] Guid? merchantId,
        [FromQuery] OrderStatus[]? status,
        [FromQuery] string? search,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] bool sortDesc = true,
        [FromQuery] int page = 1,
        [FromQuery] int size = 50,
        CancellationToken cancellationToken = default)
    {
        IReadOnlyCollection<Guid>? scope;
        Guid? merchantFilter = null;

        if (IsFirmOrAdmin())
        {
            if (merchantId.HasValue && merchantId.Value != Guid.Empty)
            {
                if (!await CanAccessMerchantAsync(merchantId.Value, cancellationToken))
                    return Forbid();
                merchantFilter = merchantId.Value;
            }

            scope = await GetAccessibleMerchantIdsAsync(cancellationToken);
        }
        else
        {
            // Standart işletme yalnızca kendi siparişlerini görür
            scope = new[] { GetMerchantId() };
        }

        var query = new OrderListQuery(
            scope, merchantFilter, status is { Length: > 0 } ? status : null, search,
            from?.ToUniversalTime(), to?.ToUniversalTime(), sortDesc, page, size);

        return CreateActionResult(await _orderService.GetOrdersPagedAsync(query, cancellationToken));
    }

    /// <summary>
    /// Belirli bir işletmenin aktif siparişlerini getirir (Pending, Assigned, PickedUp).
    /// </summary>
    [HttpGet("active/{merchantId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<OrderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActiveOrders(
        Guid merchantId,
        CancellationToken cancellationToken)
    {
        var effectiveMerchantId = ResolveTenantId(merchantId);
        if (IsFirmOrAdmin() && !await CanAccessMerchantAsync(effectiveMerchantId, cancellationToken))
            return Forbid();

        var result = await _orderService.GetActiveOrdersAsync(effectiveMerchantId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Giriş yapan işletmenin bugüne ait (aktif veya bugün tamamlanmış/iptal edilmiş) tüm siparişlerini döner.
    /// Sipariş Kanban Tablosu bu uç noktayı dinler.
    /// Güvenlik gereği MerchantId doğrudan JWT Token Claim'inden okunur.
    /// </summary>
    [HttpGet("merchant/today")]
    [ProducesResponseType(typeof(IReadOnlyList<OrderDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMerchantTodayOrders(CancellationToken cancellationToken)
    {
        var merchantId = GetMerchantId();
        var result = await _orderService.GetMerchantTodayOrdersAsync(merchantId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Yeni bir sipariş oluşturur (Hızlı Sipariş / POS).
    /// MerchantId gönderilmemişse JWT Token Claim'inden otomatik doldurulur.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = KuryeSistemi.Application.Common.Constants.AppRoles.MerchantAndFirmRoles)]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create(
        [FromBody] CreateOrderRequestDto request,
        CancellationToken cancellationToken)
    {
        // Firma alt kullanıcıları için yetki matrisi
        if (!await HasCompanyPermissionAsync(KuryeSistemi.Domain.Entities.CompanyPermission.ManageOrders, cancellationToken))
            return Forbid();

        var effectiveMerchantId = IsFirmOrAdmin() && request.MerchantId != Guid.Empty
            ? request.MerchantId
            : GetMerchantId();

        if (IsFirmOrAdmin() && !await CanAccessMerchantAsync(effectiveMerchantId, cancellationToken))
            return Forbid();

        var creditCheck = await _creditService.EnsureCanCreateOrderAsync(effectiveMerchantId, cancellationToken);
        if (!creditCheck.IsSuccess)
            return CreateActionResult(creditCheck);

        var effectiveRequest = request with { MerchantId = effectiveMerchantId };
        var result = await _orderService.CreateOrderAsync(effectiveRequest, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Bir siparişe kurye atar (Yalnızca sipariş sahibi işletme veya firma yöneticisi).
    /// </summary>
    [HttpPut("{id:guid}/assign")]
    [Authorize(Roles = KuryeSistemi.Application.Common.Constants.AppRoles.MerchantAndFirmRoles)]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Assign(
        Guid id,
        [FromBody] AssignOrderRequestDto request,
        CancellationToken cancellationToken)
    {
        // Firma alt kullanıcıları için yetki matrisi
        if (!await HasCompanyPermissionAsync(KuryeSistemi.Domain.Entities.CompanyPermission.ManageOrders, cancellationToken))
            return Forbid();

        var order = await _orderRepository.GetByIdAsync(id);
        if (order is null)
            return NotFound(new { message = $"Sipariş bulunamadı: {id}" });

        if (!await CanAccessMerchantAsync(order.MerchantId, cancellationToken))
            return Forbid();

        var result = await _orderService.AssignOrderAsync(id, request.CourierId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Sipariş durumunu günceller (Sahiplik ve rol kontrolü zorunludur).
    /// </summary>
    [HttpPut("{id:guid}/status")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateOrderStatusRequestDto request,
        CancellationToken cancellationToken)
    {
        // Firma alt kullanıcıları için yetki matrisi
        if (!await HasCompanyPermissionAsync(KuryeSistemi.Domain.Entities.CompanyPermission.ManageOrders, cancellationToken))
            return Forbid();

        var order = await _orderRepository.GetByIdAsync(id);
        if (order is null)
            return NotFound(new { message = $"Sipariş bulunamadı: {id}" });

        var courierId = GetCourierId();
        if (courierId.HasValue)
        {
            // Kurye sadece kendi üzerine atanmış siparişi güncelleyebilir
            if (order.CourierId != courierId.Value && !IsFirmOrAdmin())
                return Forbid();

            // Kurye yalnızca saha aşamalarını ilerletebilir (Paketi Aldım / Teslim Ettim);
            // iptal, havuza geri alma veya mutfak durumlarını değiştiremez.
            if (request.NewStatus != OrderStatus.PickedUp && request.NewStatus != OrderStatus.Delivered)
                return Forbid();
        }
        else
        {
            // İşletme sadece kendi siparişini, firma ise kendi firmasının siparişini güncelleyebilir
            if (!await CanAccessMerchantAsync(order.MerchantId, cancellationToken))
                return Forbid();
        }

        var result = await _orderService.UpdateStatusAsync(id, request.NewStatus, courierId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Kuryenin aktif görevlerini ve havuzdaki bekleyen tüm siparişleri döner.
    /// Kurye mobil uygulaması kokpit ekranı bu uç noktayı çağırır.
    /// </summary>
    [HttpGet("courier/active")]
    [Authorize(Roles = "Courier")]
    [ProducesResponseType(typeof(IReadOnlyList<OrderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCourierActiveOrders(CancellationToken cancellationToken)
    {
        var courierId = GetCourierId();
        if (!courierId.HasValue || courierId.Value == Guid.Empty)
        {
            var email = GetUserEmail();
            if (!string.IsNullOrEmpty(email))
            {
                var courier = await _courierRepository.GetByEmailAsync(email);
                if (courier != null) courierId = courier.Id;
            }
        }

        var result = await _orderService.GetCourierActiveOrdersAsync(courierId, cancellationToken);
        return CreateActionResult(result);
    }

    /// <summary>
    /// Kuryenin havuzdaki bir siparişi kendi üzerine almasını (kabul etmesini) sağlar.
    /// </summary>
    [HttpPost("{id:guid}/claim")]
    [Authorize(Roles = "Courier")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ClaimOrder(
        Guid id,
        CancellationToken cancellationToken)
    {
        var courierId = GetCourierId();
        if (!courierId.HasValue || courierId.Value == Guid.Empty)
        {
            var email = GetUserEmail();
            if (!string.IsNullOrEmpty(email))
            {
                var courier = await _courierRepository.GetByEmailAsync(email);
                if (courier != null) courierId = courier.Id;
            }
        }

        if (!courierId.HasValue || courierId.Value == Guid.Empty)
            return Unauthorized(new { message = "Kurye kimliği token içinde bulunamadı." });

        var result = await _orderService.ClaimOrderAsync(id, courierId.Value, cancellationToken);
        return CreateActionResult(result);
    }
}
