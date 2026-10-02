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

    public OrdersController(
        IOrderService orderService,
        ICourierRepository courierRepository,
        IOrderRepository orderRepository)
    {
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
        CancellationToken cancellationToken)
    {
        if (IsFirmOrAdmin())
        {
            if (merchantId.HasValue && merchantId.Value != Guid.Empty)
            {
                var result = await _orderService.GetOrdersByMerchantAsync(merchantId.Value, status, cancellationToken);
                return CreateActionResult(result);
            }

            var allResult = await _orderService.GetAllOrdersAsync(status, cancellationToken);
            return CreateActionResult(allResult);
        }

        // Standart işletme sadece kendi siparişlerini listeleyebilir (Tenant İzolasyonu)
        var ownMerchantId = GetMerchantId();
        var ownResult = await _orderService.GetOrdersByMerchantAsync(ownMerchantId, status, cancellationToken);
        return CreateActionResult(ownResult);
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
        var effectiveMerchantId = IsFirmOrAdmin() && request.MerchantId != Guid.Empty
            ? request.MerchantId
            : GetMerchantId();

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
        var order = await _orderRepository.GetByIdAsync(id);
        if (order is null)
            return NotFound(new { message = $"Sipariş bulunamadı: {id}" });

        if (!IsFirmOrAdmin() && order.MerchantId != GetMerchantId())
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
        var order = await _orderRepository.GetByIdAsync(id);
        if (order is null)
            return NotFound(new { message = $"Sipariş bulunamadı: {id}" });

        var courierId = GetCourierId();
        if (courierId.HasValue)
        {
            // Kurye sadece kendi üzerine atanmış siparişi güncelleyebilir
            if (order.CourierId != courierId.Value && !IsFirmOrAdmin())
                return Forbid();
        }
        else
        {
            // İşletme sadece kendi siparişini güncelleyebilir
            if (!IsFirmOrAdmin() && order.MerchantId != GetMerchantId())
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
