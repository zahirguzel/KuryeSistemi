// Services/Concrete/OrderService.cs

using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Orders;
using KuryeSistemi.Application.Features.Orders.DTOs;
using KuryeSistemi.Application.Interfaces;
using KuryeSistemi.Application.Repositories.Interfaces;
using KuryeSistemi.Application.Services.Interfaces;
using KuryeSistemi.Domain.Entities;
using KuryeSistemi.Domain.Enums;

namespace KuryeSistemi.Application.Services.Concrete;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepository;
    private readonly ICourierRepository _courierRepository;
    private readonly IMerchantRepository _merchantRepository;
    private readonly IBackgroundJobService _jobService;
    private readonly IHubNotificationService _notificationService;
    private readonly IAuditService _auditService;

    private static readonly Dictionary<OrderStatus, HashSet<OrderStatus>> AllowedTransitions = new()
    {
        [OrderStatus.Pending]   = [OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.Assigned, OrderStatus.PickedUp, OrderStatus.Cancelled],
        [OrderStatus.Preparing] = [OrderStatus.Ready, OrderStatus.Assigned, OrderStatus.PickedUp, OrderStatus.Pending, OrderStatus.Cancelled],
        [OrderStatus.Ready]     = [OrderStatus.Assigned, OrderStatus.PickedUp, OrderStatus.Delivered, OrderStatus.Pending, OrderStatus.Preparing, OrderStatus.Cancelled],
        [OrderStatus.Assigned]  = [OrderStatus.PickedUp, OrderStatus.Delivered, OrderStatus.Ready, OrderStatus.Pending, OrderStatus.Cancelled],
        [OrderStatus.PickedUp]  = [OrderStatus.Delivered, OrderStatus.Assigned, OrderStatus.Cancelled],
        [OrderStatus.Delivered] = [],
        [OrderStatus.Cancelled] = []
    };

    public OrderService(
        IOrderRepository orderRepository,
        ICourierRepository courierRepository,
        IMerchantRepository merchantRepository,
        IBackgroundJobService jobService,
        IHubNotificationService notificationService,
        IAuditService auditService)
    {
        _orderRepository = orderRepository;
        _courierRepository = courierRepository;
        _merchantRepository = merchantRepository;
        _jobService = jobService;
        _notificationService = notificationService;
        _auditService = auditService;
    }

    public async Task<ServiceResult<IReadOnlyList<OrderDto>>> GetAllOrdersAsync(
        OrderStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var orders = await _orderRepository.GetAllWithDetailsAsync(status);
        var dtos = orders.Select(MapToDto).ToList().AsReadOnly();
        return ServiceResult<IReadOnlyList<OrderDto>>.Success(dtos);
    }

    public async Task<ServiceResult<IReadOnlyList<OrderDto>>> GetActiveOrdersAsync(
        Guid merchantId,
        CancellationToken cancellationToken = default)
    {
        if (merchantId == Guid.Empty)
        {
            return ServiceResult<IReadOnlyList<OrderDto>>.BadRequest("Geçersiz işletme ID'si.");
        }

        var orders = await _orderRepository.GetActiveOrdersByMerchantAsync(merchantId);
        var dtos = orders.Select(MapToDto).ToList().AsReadOnly();

        return ServiceResult<IReadOnlyList<OrderDto>>.Success(dtos);
    }

    public async Task<ServiceResult<IReadOnlyList<OrderDto>>> GetOrdersByMerchantAsync(
        Guid merchantId,
        OrderStatus? status,
        CancellationToken cancellationToken = default)
    {
        if (merchantId == Guid.Empty)
        {
            return ServiceResult<IReadOnlyList<OrderDto>>.BadRequest("Geçersiz işletme ID'si.");
        }

        var orders = await _orderRepository.GetOrdersByMerchantAsync(merchantId, status);
        var dtos = orders.Select(MapToDto).ToList().AsReadOnly();

        return ServiceResult<IReadOnlyList<OrderDto>>.Success(dtos);
    }

    public async Task<ServiceResult<IReadOnlyList<OrderDto>>> GetMerchantTodayOrdersAsync(
        Guid merchantId,
        CancellationToken cancellationToken = default)
    {
        if (merchantId == Guid.Empty)
        {
            return ServiceResult<IReadOnlyList<OrderDto>>.BadRequest("Geçersiz işletme ID'si.");
        }

        var orders = await _orderRepository.GetMerchantTodayOrdersAsync(merchantId);
        var dtos = orders.Select(MapToDto).ToList().AsReadOnly();

        return ServiceResult<IReadOnlyList<OrderDto>>.Success(dtos);
    }

    public async Task<ServiceResult<IReadOnlyList<OrderDto>>> GetCourierActiveOrdersAsync(
        Guid? courierId,
        CancellationToken cancellationToken = default)
    {
        // 1. Kurye ID'si varsa, kuryenin üzerine atanmış aktif görevleri getir (Assigned, PickedUp)
        // 2. YALNIZCA Havuz Sistemi modundaki (DispatchMode.Pool) bekleyen (Pending) siparişleri getir.
        // Manuel atama (DispatchMode.Manual) modundaki siparişler kurye havuzuna düşmez, yönetici ataması bekler.
        var allOrders = await _orderRepository.GetCourierActiveOrdersAsync(courierId);

        var dtos = allOrders
            .Select(MapToDto)
            .ToList();

        return ServiceResult<IReadOnlyList<OrderDto>>.Success(dtos.AsReadOnly());
    }

    public async Task<ServiceResult<OrderDto>> CreateOrderAsync(
        CreateOrderRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.MerchantId == Guid.Empty)
        {
            return ServiceResult<OrderDto>.BadRequest("Geçersiz işletme ID'si.");
        }

        if (request.TotalOrderAmount < 0)
        {
            return ServiceResult<OrderDto>.BadRequest("Sipariş toplam tutarı negatif olamaz.");
        }

        var merchant = await _merchantRepository.GetByIdAsync(request.MerchantId);
        if (merchant is null)
        {
            return ServiceResult<OrderDto>.NotFound($"İşletme bulunamadı: {request.MerchantId}");
        }

        // Hızlı Sipariş Formu (POS): Alım adresi gönderilmemişse işletmenin kayıtlı restoran adresi ve koordinatları kullanılır
        var pickupAddressLine = string.IsNullOrWhiteSpace(request.PickupAddressLine)
            ? merchant.Address
            : request.PickupAddressLine.Trim();
        var pickupDistrict = string.IsNullOrWhiteSpace(request.PickupDistrict)
            ? "İskenderun"
            : request.PickupDistrict.Trim();
        var pickupCity = string.IsNullOrWhiteSpace(request.PickupCity)
            ? "Hatay"
            : request.PickupCity.Trim();
        var pickupLat = request.PickupLatitude != 0 ? request.PickupLatitude : (merchant.Latitude.HasValue ? (decimal)merchant.Latitude.Value : 0m);
        var pickupLng = request.PickupLongitude != 0 ? request.PickupLongitude : (merchant.Longitude.HasValue ? (decimal)merchant.Longitude.Value : 0m);

        if (string.IsNullOrWhiteSpace(pickupAddressLine) ||
            string.IsNullOrWhiteSpace(request.DeliveryAddressLine) ||
            string.IsNullOrWhiteSpace(request.RecipientName) ||
            string.IsNullOrWhiteSpace(request.RecipientPhone))
        {
            return ServiceResult<OrderDto>.BadRequest("Zorunlu teslimat adresi ve alıcı alanları doldurulmalıdır.");
        }

        if (request.PaymentMethod != PaymentMethod.Online && request.TotalOrderAmount <= 0)
        {
            return ServiceResult<OrderDto>.BadRequest(
                "Nakit (Cash) veya Kapıda Kredi Kartı ödemelerinde sipariş toplam tutarı (TotalOrderAmount) 0'dan büyük olmalıdır.");
        }

        var order = new Order
        {
            MerchantId = request.MerchantId,
            CourierId = null,
            Status = OrderStatus.Pending,
            PickupAddressLine = pickupAddressLine,
            PickupDistrict = pickupDistrict,
            PickupCity = pickupCity,
            PickupLatitude = pickupLat,
            PickupLongitude = pickupLng,
            DeliveryAddressLine = request.DeliveryAddressLine.Trim(),
            DeliveryDistrict = request.DeliveryDistrict?.Trim() ?? string.Empty,
            DeliveryCity = request.DeliveryCity?.Trim() ?? string.Empty,
            DeliveryLatitude = request.DeliveryLatitude,
            DeliveryLongitude = request.DeliveryLongitude,
            RecipientName = request.RecipientName.Trim(),
            RecipientPhone = request.RecipientPhone.Trim(),
            Notes = request.Notes?.Trim(),
            PaymentMethod = request.PaymentMethod,
            CourierEarning = (merchant != null && merchant.CourierCutFee > 0) ? merchant.CourierCutFee : 40.00m,
            FirmFee = (merchant != null && merchant.DefaultPackageFee > 0 && merchant.CourierCutFee > 0)
                ? Math.Max(0, merchant.DefaultPackageFee - merchant.CourierCutFee)
                : 0.00m,
            OrderCode = string.IsNullOrWhiteSpace(request.OrderCode)
                ? $"ORD-{DateTime.UtcNow:yyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}"
                : request.OrderCode.Trim(),
            Source = string.IsNullOrWhiteSpace(request.Source) ? "Direct" : request.Source.Trim(),
            DeliveryNeighborhood = request.DeliveryNeighborhood?.Trim(),
            EstimatedDistanceKm = (pickupLat != 0 && request.DeliveryLatitude != 0)
                ? Math.Round(CalculateDistanceKm((double)pickupLat, (double)pickupLng, (double)request.DeliveryLatitude, (double)request.DeliveryLongitude), 1)
                : null,
            EstimatedDeliveryMinutes = 25,
            CreatedBy = "system"
        };

        await _orderRepository.AddAsync(order);
        await _orderRepository.SaveChangesAsync();

        // ─── Akıllı GPS / H3 Dağıtım Motoru (DispatchMode.SmartAuto) ───
        if (merchant != null && merchant.DispatchMode == DispatchMode.SmartAuto)
        {
            var autoAssigned = await TrySmartAutoAssignAsync(order, merchant, cancellationToken);
            if (autoAssigned)
            {
                var autoAssignedDto = MapToDto(order);
                return ServiceResult<OrderDto>.Created(autoAssignedDto, $"Sipariş oluşturuldu ve akıllı dağıtım motoru ile ({order.Courier?.FirstName}) kuryesine atandı.");
            }
        }

        // ─── Manuel Atama (DispatchMode.Manual) ───
        if (merchant != null && merchant.DispatchMode == DispatchMode.Manual)
        {
            // 15 dakika kurye atanmazsa otomatik iptal kontrolü
            _jobService.ScheduleUnassignedOrderCheck(order.Id, TimeSpan.FromMinutes(15));

            // SignalR ile işletmeye/yönetici paneline bildir (kurye havuzuna düşmez)
            await _notificationService.SendOrderStatusChangedAsync(
                order.MerchantId, order.Id, OrderStatus.Pending.ToString(), "Yeni sipariş oluşturuldu. Yönetici kurye ataması bekleniyor.", courierId: Guid.Empty, cancellationToken);

            var manualDto = MapToDto(order);
            return ServiceResult<OrderDto>.Created(manualDto, "Sipariş başarıyla oluşturuldu. Manuel kurye ataması bekleniyor.");
        }

        // 15 dakika kurye atanmazsa otomatik iptal kontrolü
        _jobService.ScheduleUnassignedOrderCheck(order.Id, TimeSpan.FromMinutes(15));

        // SignalR ile havuza yeni sipariş düştüğünü tüm kuryelere ve işletmelere bildir
        await _notificationService.SendOrderStatusChangedAsync(
            order.MerchantId, order.Id, OrderStatus.Pending.ToString(), "Yeni sipariş havuza düştü.", courierId: null, cancellationToken);

        var dto = MapToDto(order);
        return ServiceResult<OrderDto>.Created(dto, "Sipariş başarıyla oluşturuldu.");
    }

    public async Task<ServiceResult<OrderDto>> AssignOrderAsync(
        Guid orderId,
        Guid courierId,
        CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order is null)
        {
            return ServiceResult<OrderDto>.NotFound($"Sipariş bulunamadı: {orderId}");
        }

        if (order.Status != OrderStatus.Pending &&
            order.Status != OrderStatus.Preparing &&
            order.Status != OrderStatus.Ready &&
            order.Status != OrderStatus.Assigned)
        {
            return ServiceResult<OrderDto>.Conflict(
                $"Mevcut durum: {order.Status}. Sadece beklemede, hazırlanıyor, hazır veya atanmış siparişlere kurye atanabilir.");
        }

        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is null)
        {
            return ServiceResult<OrderDto>.NotFound($"Kurye bulunamadı: {courierId}");
        }

        if (!courier.IsOnline)
        {
            return ServiceResult<OrderDto>.Conflict(
                $"Kurye '{courier.FirstName} {courier.LastName}' şu anda mesaide (çevrimdışı) değil.");
        }

        // Eğer daha önce başka bir kurye atanmışsa onu boşa çıkar
        if (order.CourierId.HasValue && order.CourierId.Value != courierId)
        {
            await FreeCourierAsync(order.CourierId.Value);
        }

        order.CourierId = courier.Id;
        order.Courier = courier;
        order.Status = OrderStatus.Assigned;
        order.AssignedAt = DateTime.UtcNow;
        order.UpdatedBy = "firm:manager";

        courier.IsAvailable = false;
        courier.UpdatedBy = "system";

        _orderRepository.Update(order);
        _courierRepository.Update(courier);
        await _orderRepository.SaveChangesAsync();

        // SignalR ile işletmeye ve kuryeye anlık bildirim gönder
        await _notificationService.SendOrderStatusChangedAsync(
            order.MerchantId, order.Id, OrderStatus.Assigned.ToString(), $"{courier.FirstName} {courier.LastName} siparişe atandı.", courier.Id, cancellationToken);

        await _notificationService.SendCourierStatusChangedAsync(
            courier.Id, courier.IsOnline, false, $"{courier.FirstName} {courier.LastName} siparişe atandı (Meşgul).", courier.MerchantId, cancellationToken);

        return ServiceResult<OrderDto>.Success(MapToDto(order), "Kurye siparişe başarıyla atandı.");
    }

    public async Task<ServiceResult<OrderDto>> ClaimOrderAsync(
        Guid orderId,
        Guid courierId,
        CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order is null)
        {
            return ServiceResult<OrderDto>.NotFound($"Sipariş bulunamadı: {orderId}");
        }

        if (order.CourierId.HasValue || order.Status == OrderStatus.Assigned)
        {
            return ServiceResult<OrderDto>.Conflict("Bu sipariş zaten başka bir kuryeye atanmıştır, havuzdan tekrar alınamaz.");
        }

        if (order.Status == OrderStatus.Delivered || order.Status == OrderStatus.Cancelled)
        {
            return ServiceResult<OrderDto>.Conflict("Tamamlanmış veya iptal edilmiş siparişler alınamaz.");
        }

        var merchant = await _merchantRepository.GetByIdAsync(order.MerchantId);
        if (merchant != null && merchant.DispatchMode == DispatchMode.Manual)
        {
            return ServiceResult<OrderDto>.BadRequest(
                "Bu işletme manuel atama modundadır. Sipariş kurye tarafından havuzdan alınamaz. Kurye ataması yalnızca restoran/firma yöneticisi tarafından yapılabilir.");
        }

        return await AssignOrderAsync(orderId, courierId, cancellationToken);
    }

    public async Task<ServiceResult<OrderDto>> UpdateStatusAsync(
        Guid orderId,
        OrderStatus newStatus,
        Guid? courierId = null,
        CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order is null)
        {
            return ServiceResult<OrderDto>.NotFound($"Sipariş bulunamadı: {orderId}");
        }

        if (!AllowedTransitions.TryGetValue(order.Status, out var allowed) || !allowed.Contains(newStatus))
        {
            return ServiceResult<OrderDto>.Conflict(
                $"Geçersiz durum geçişi: '{order.Status}' → '{newStatus}'.");
        }

        var now = DateTime.UtcNow;

        // Eğer sipariş PickedUp veya Assigned durumuna alınıyorsa, kurye atanmış olmalıdır
        if (newStatus == OrderStatus.PickedUp || newStatus == OrderStatus.Assigned)
        {
            var effectiveCourierId = courierId ?? order.CourierId;
            if (!effectiveCourierId.HasValue)
            {
                return ServiceResult<OrderDto>.BadRequest(
                    $"Sipariş bir kuryeye atanmadan '{newStatus}' durumuna geçirilemez.");
            }

            order.CourierId = effectiveCourierId.Value;
            var assignedCourier = await _courierRepository.GetByIdAsync(effectiveCourierId.Value);
            if (assignedCourier is not null)
            {
                var activeOrders = await _orderRepository.CountActiveOrdersByCourierAsync(effectiveCourierId.Value);
                var merchantForTour = await _merchantRepository.GetByIdAsync(order.MerchantId);
                var maxTour = (merchantForTour?.MaxOrdersPerTour > 0) ? merchantForTour.MaxOrdersPerTour : 2;
                if (activeOrders >= maxTour)
                {
                    assignedCourier.IsAvailable = false;
                }
                assignedCourier.UpdatedBy = "system";
                _courierRepository.Update(assignedCourier);
            }
        }

        // Eğer sipariş geri beklemeye/havuza alınıyorsa (Pending / Preparing) ve kuryesi varsa, kuryeyi serbest bırak
        if ((newStatus == OrderStatus.Pending || newStatus == OrderStatus.Preparing) && order.CourierId.HasValue)
        {
            await FreeCourierAsync(order.CourierId.Value);
            order.CourierId = null;
            order.Courier = null;
        }

        // Eğer mutfak/restoran siparişi "Paket Hazır" (Ready) yaptıysa:
        if (newStatus == OrderStatus.Ready)
        {
            // Eğer sipariş önceden atanmışsa ve hazır aşamasına geri çekildiyse kuryeyi boşa çıkar
            if (order.Status == OrderStatus.Assigned && order.CourierId.HasValue)
            {
                await FreeCourierAsync(order.CourierId.Value);
                order.CourierId = null;
                order.Courier = null;
            }

            // Kurye henüz atanmamışsa ve işletme Akıllı GPS (SmartAuto) modundaysa anında en yakın kuryeye otomatik ata
            if (!order.CourierId.HasValue)
            {
                var merchant = await _merchantRepository.GetByIdAsync(order.MerchantId);
                if (merchant != null && merchant.DispatchMode == DispatchMode.SmartAuto)
                {
                    var autoAssigned = await TrySmartAutoAssignAsync(order, merchant, cancellationToken);
                    if (autoAssigned)
                    {
                        newStatus = OrderStatus.Assigned;
                    }
                }
            }
        }

        switch (newStatus)
        {
            case OrderStatus.Assigned:
                order.AssignedAt = now;
                break;

            case OrderStatus.PickedUp:
                order.PickedUpAt = now;
                break;

            case OrderStatus.Delivered:
                order.DeliveredAt = now;
                var merchant = await _merchantRepository.GetByIdAsync(order.MerchantId);
                // Kurye hak ediş payı ve firma komisyonu mühürlenir
                decimal fee = (merchant != null && merchant.CourierCutFee > 0) ? merchant.CourierCutFee : 40.00m;
                order.CourierEarning = fee;
                order.FirmFee = (merchant != null && merchant.DefaultPackageFee > 0 && merchant.CourierCutFee > 0)
                    ? Math.Max(0, merchant.DefaultPackageFee - merchant.CourierCutFee)
                    : 0.00m;

                if (order.CourierId.HasValue)
                {
                    var courier = await _courierRepository.GetByIdAsync(order.CourierId.Value);
                    if (courier is not null)
                    {
                        // Tur kapasitesi kontrolü: Kuryenin halen aktif başka teslimatı var mı?
                        var currentActiveOrders = await _orderRepository.CountActiveOrdersByCourierAsync(courier.Id);
                        var remainingActive = Math.Max(0, currentActiveOrders - 1);
                        var maxOrdersPerTour = (merchant?.MaxOrdersPerTour > 0) ? merchant.MaxOrdersPerTour : 2;
                        courier.IsAvailable = remainingActive < maxOrdersPerTour;
                        courier.UpdatedBy = "system";

                        // ─── Mahsuplaşma (Reconciliation) ──────────────────────────────
                        // 1. Nakit ödeme: Kurye müşteriden tahsil ettiği nakit tutar kadar firmaya borçlanır
                        if (order.PaymentMethod == PaymentMethod.Cash)
                        {
                            courier.CurrentBalance -= order.TotalOrderAmount;
                        }

                        // 2. Hak ediş: Kuryenin paket teslimat kazancı firmadan alacak olarak bakiyesine eklenir
                        courier.CurrentBalance += order.CourierEarning;

                        _courierRepository.Update(courier);
                    }
                }
                break;

            case OrderStatus.Cancelled:
                if (order.CourierId.HasValue)
                {
                    await FreeCourierAsync(order.CourierId.Value);
                }
                break;
        }

        order.Status = newStatus;
        order.UpdatedBy = "system";

        _orderRepository.Update(order);
        await _orderRepository.SaveChangesAsync();

        // SignalR ile durum değişikliğini yayınla
        await _notificationService.SendOrderStatusChangedAsync(
            order.MerchantId, order.Id, newStatus.ToString(), $"Sipariş durumu güncellendi: {newStatus}", order.CourierId, cancellationToken);

        // Denetim günlüğüne (AuditLog) kaydet
        await _auditService.LogAsync(
            courierId,
            courierId.HasValue ? $"courier:{courierId.Value}" : "system",
            courierId.HasValue ? "Courier" : "System",
            order.MerchantId,
            "Order.StatusChange",
            "Order",
            order.Id.ToString(),
            $"Sipariş durumu güncellendi: {newStatus}",
            cancellationToken: cancellationToken);

        return ServiceResult<OrderDto>.Success(MapToDto(order), "Sipariş durumu güncellendi.");
    }

    private async Task<bool> TrySmartAutoAssignAsync(
        Order order,
        Merchant merchant,
        CancellationToken cancellationToken = default)
    {
        var maxDistanceKm = merchant.MaxCourierDistanceKm > 0 ? merchant.MaxCourierDistanceKm : 6;
        var maxOrdersPerTour = merchant.MaxOrdersPerTour > 0 ? merchant.MaxOrdersPerTour : 2;

        // 1. Öncelikle mesaide (IsOnline) kuryeleri getir (işletmeye bağlı olanlar)
        var candidateCouriers = await _courierRepository.GetAllAsync(c =>
            c.IsOnline && (c.MerchantId == order.MerchantId || c.MerchantId == merchant.Id));

        // Yalnızca kurye şirketi / admin ise ortak kurye havuzundan arama yapılabilir (Multi-tenant izolasyonu)
        if (candidateCouriers.Count == 0 && (merchant.Role == "CourierFirm" || merchant.Role == "Admin"))
        {
            candidateCouriers = await _courierRepository.GetAllAsync(c => c.IsOnline);
        }

        if (candidateCouriers.Count == 0)
            return false;

        // Referans koordinat: Alım noktası (restoran konumu)
        var refLat = order.PickupLatitude != 0 ? (double)order.PickupLatitude : (merchant.Latitude ?? 36.5867);
        var refLng = order.PickupLongitude != 0 ? (double)order.PickupLongitude : (merchant.Longitude ?? 36.1714);

        // Kuryelerin aktif sipariş sayılarını tek sorguda çek
        var candidateIds = candidateCouriers.Select(c => c.Id).ToList();
        var allActiveOrders = await _orderRepository.GetAllAsync(o =>
            o.CourierId.HasValue && candidateIds.Contains(o.CourierId.Value) &&
            (o.Status == OrderStatus.Assigned || o.Status == OrderStatus.PickedUp));

        var orderCountByCourier = allActiveOrders
            .GroupBy(o => o.CourierId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        var availableCandidates = new List<(Courier Courier, double DistanceKm, int ActiveOrderCount)>();

        foreach (var c in candidateCouriers)
        {
            var activeCount = orderCountByCourier.TryGetValue(c.Id, out var count) ? count : 0;
            if (activeCount < maxOrdersPerTour)
            {
                var hasGps = c.CurrentLatitude.HasValue && c.CurrentLongitude.HasValue;
                var dist = hasGps
                    ? CalculateDistanceKm(refLat, refLng, c.CurrentLatitude!.Value, c.CurrentLongitude!.Value)
                    : 999.0; // GPS sinyali olmayan kuryeye mesafe cezası ver (gerçek yakın kuryeler öncelikli olsun)

                // Mesafe sınırını kontrol et (GPS varsa)
                if (!hasGps || dist <= maxDistanceKm)
                {
                    availableCandidates.Add((c, dist, activeCount));
                }
            }
        }

        if (availableCandidates.Count == 0)
            return false;

        // En yakın ve en az yüklü kuryeyi seç
        var best = availableCandidates
            .OrderBy(x => x.DistanceKm)
            .ThenBy(x => x.ActiveOrderCount)
            .First();

        var selectedCourier = best.Courier;
        var newActiveCount = best.ActiveOrderCount + 1;

        order.CourierId = selectedCourier.Id;
        order.Courier = selectedCourier;
        order.Status = OrderStatus.Assigned;
        order.AssignedAt = DateTime.UtcNow;
        order.UpdatedBy = "system:smart_auto";

        // Tur kapasitesi dolduysa IsAvailable = false yap
        selectedCourier.IsAvailable = (newActiveCount < maxOrdersPerTour);
        selectedCourier.UpdatedBy = "system:smart_auto";

        _orderRepository.Update(order);
        _courierRepository.Update(selectedCourier);
        await _orderRepository.SaveChangesAsync();

        var distanceInfo = (selectedCourier.CurrentLatitude.HasValue && selectedCourier.CurrentLongitude.HasValue)
            ? $" ({best.DistanceKm:F1} km uzaklıkta, Tur: {newActiveCount}/{maxOrdersPerTour})"
            : $" (Tur: {newActiveCount}/{maxOrdersPerTour})";

        await _notificationService.SendOrderStatusChangedAsync(
            order.MerchantId,
            order.Id,
            OrderStatus.Assigned.ToString(),
            $"🤖 Akıllı GPS (H3): {selectedCourier.FirstName} {selectedCourier.LastName}{distanceInfo} otomatik atandı.",
            selectedCourier.Id,
            cancellationToken);

        await _notificationService.SendCourierStatusChangedAsync(
            selectedCourier.Id,
            selectedCourier.IsOnline,
            selectedCourier.IsAvailable,
            $"{selectedCourier.FirstName} yeni sipariş aldı (Tur: {newActiveCount}/{maxOrdersPerTour}).",
            selectedCourier.MerchantId,
            cancellationToken);

        return true;
    }

    private async Task FreeCourierAsync(Guid courierId)
    {
        var courier = await _courierRepository.GetByIdAsync(courierId);
        if (courier is not null)
        {
            courier.IsAvailable = true;
            courier.UpdatedBy = "system";
            _courierRepository.Update(courier);
            await _courierRepository.SaveChangesAsync();

            await _notificationService.SendCourierStatusChangedAsync(
                courier.Id,
                courier.IsOnline,
                true,
                $"🛵 {courier.FirstName} {courier.LastName} siparişi tamamladı ve müsait.",
                courier.MerchantId);
        }
    }

    private static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double r = 6371.0; // Earth radius in KM
        var dLat = (lat2 - lat1) * (Math.PI / 180.0);
        var dLon = (lon2 - lon1) * (Math.PI / 180.0);
        var a = Math.Sin(dLat / 2.0) * Math.Sin(dLat / 2.0) +
                Math.Cos(lat1 * (Math.PI / 180.0)) * Math.Cos(lat2 * (Math.PI / 180.0)) *
                Math.Sin(dLon / 2.0) * Math.Sin(dLon / 2.0);
        var c = 2.0 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));
        return r * c;
    }

    private static OrderDto MapToDto(Order order) => new(
        order.Id,
        order.MerchantId,
        order.CourierId,
        order.PickupAddressLine,
        order.PickupDistrict,
        order.PickupCity,
        order.PickupLatitude,
        order.PickupLongitude,
        order.DeliveryAddressLine,
        order.DeliveryDistrict,
        order.DeliveryCity,
        order.DeliveryLatitude,
        order.DeliveryLongitude,
        order.RecipientName,
        order.RecipientPhone,
        order.Notes,
        order.Status,
        order.PickedUpAt,
        order.DeliveredAt,
        order.CreatedAt,
        order.CourierEarning,
        order.PaymentMethod,
        order.TotalOrderAmount,
        order.Courier is not null ? $"{order.Courier.FirstName} {order.Courier.LastName}".Trim() : null,
        order.Merchant?.Name ?? string.Empty,
        order.OrderCode,
        order.Source,
        order.DeliveryNeighborhood,
        order.EstimatedDistanceKm,
        order.EstimatedDeliveryMinutes,
        order.AssignedAt);
}
