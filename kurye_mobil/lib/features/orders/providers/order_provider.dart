import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/realtime/signalr_service.dart';
import '../../../core/services/notification_alert_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../../location/providers/location_provider.dart';
import '../../wallet/providers/wallet_provider.dart';
import '../models/order_model.dart';
import '../repositories/order_repository.dart';

/// Sipariş Durum Modeli (OrderState)
class OrderState {
  const OrderState({
    this.orders = const [],
    this.activeOrder,
    this.isLoading = false,
    this.isUpdatingStatus = false,
    this.errorMessage,
  });

  final List<OrderModel> orders;
  final OrderModel? activeOrder;
  final bool isLoading;
  final bool isUpdatingStatus;
  final String? errorMessage;

  /// Kuryenin üzerinde şu anda teslim alacağı veya dağıtacağı aktif bir görev var mı?
  bool get hasActiveTask => activeOrder != null;

  OrderState copyWith({
    List<OrderModel>? orders,
    OrderModel? Function()? activeOrder,
    bool? isLoading,
    bool? isUpdatingStatus,
    String? errorMessage,
  }) {
    return OrderState(
      orders: orders ?? this.orders,
      activeOrder: activeOrder != null ? activeOrder() : this.activeOrder,
      isLoading: isLoading ?? this.isLoading,
      isUpdatingStatus: isUpdatingStatus ?? this.isUpdatingStatus,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// ─── Riverpod Providers ───────────────────────────────────────────────────

final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  final storageService = ref.watch(secureStorageProvider);
  return OrderRepository(dioClient, storageService);
});

// ─── Order Notifier (Modern Riverpod Notifier) ─────────────────────────────

class OrderNotifier extends Notifier<OrderState> {
  OrderRepository get _repository => ref.read(orderRepositoryProvider);
  StreamSubscription<Map<String, dynamic>>? _orderUpdateSub;
  StreamSubscription<SignalRConnectionStatus>? _statusSub;

  @override
  OrderState build() {
    final signalRService = ref.watch(signalRServiceProvider);
    final alertService = ref.watch(notificationAlertServiceProvider);
    final authState = ref.watch(authProvider);

    _orderUpdateSub?.cancel();
    _orderUpdateSub = signalRService.orderUpdatesStream.listen((event) async {
      debugPrint('[OrderNotifier] SignalR Sipariş Güncellemesi Bildirimi: $event');
      final status = (event['status'] ?? event['Status'] ?? '').toString();
      final message = (event['message'] ?? event['Message'] ?? 'Havuza yeni teslimat paketi eklendi.').toString();

      // Eğer havuza yeni sipariş düştüyse (Pending) veya kuryeye sipariş atandıysa (Assigned)
      final statusLower = status.toLowerCase();
      final msgLower = message.toLowerCase();
      if (statusLower == 'pending' || status == '0' || statusLower == 'created' || status.isEmpty) {
        // Manuel atama modundaki siparişler kurye havuzuna düşmez, yönetici ataması bekler
        if (msgLower.contains('yönetici') || msgLower.contains('manuel')) {
          debugPrint('[OrderNotifier] Manuel atama siparişi, kurye havuz alarmı tetiklenmedi.');
        } else {
          await alertService.triggerNewOrderAlert(
            title: '🔔 YENİ HAVUZ SİPARİŞİ!',
            message: message.isNotEmpty ? message : 'Havuza yeni bir sipariş paketi düştü.',
          );
        }
      } else if (statusLower == 'assigned' || status == '1') {
        await alertService.triggerNewOrderAlert(
          title: '📦 SİZE YENİ GÖREV ATANDI!',
          message: message.isNotEmpty ? message : 'Restorandan size yeni bir teslimat görevi atandı.',
        );
      } else {
        await alertService.triggerNewOrderAlert(
          title: '📢 SİPARİŞ GÜNCELLENDİ',
          message: message,
        );
      }

      // Aktif sipariş listesini ve bugünkü kazançları sunucudan anında tazele
      await fetchActiveOrders();
      ref.read(walletProvider.notifier).fetchTodayEarnings(isRefresh: true);
    });

    _statusSub?.cancel();
    _statusSub = signalRService.statusStream.listen((status) {
      if (status == SignalRConnectionStatus.connected) {
        debugPrint('[OrderNotifier] SignalR bağlandı -> Aktif siparişler tazeleyiniyor...');
        fetchActiveOrders();
      }
    });

    ref.onDispose(() {
      _orderUpdateSub?.cancel();
      _statusSub?.cancel();
    });

    // Oturum açıksa veya uygulama ilk açıldığında aktif siparişleri çek
    if (authState.isAuthenticated) {
      Future.microtask(() => fetchActiveOrders());
    }
    return const OrderState(isLoading: true);
  }

  /// Aktif siparişleri backend'den getir
  Future<void> fetchActiveOrders({String? merchantId}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final orders = await _repository.getActiveOrders(merchantId: merchantId);

      // Kuryenin üzerinde atanmış (Assigned veya PickedUp) bir sipariş ara
      OrderModel? currentActiveTask;
      for (final order in orders) {
        if (order.isActiveTask) {
          currentActiveTask = order;
          break;
        }
      }

      // Eğer sunucudan liste geldiyse ve atanmış varsa onu seç; yoksa listenin ilkini al
      if (currentActiveTask == null && orders.isNotEmpty) {
        currentActiveTask = orders.first;
      }

      state = state.copyWith(
        orders: orders,
        activeOrder: () => currentActiveTask,
        isLoading: false,
      );

      debugPrint(
        '[OrderNotifier] Aktif siparişler yüklendi: ${orders.length} adet. '
        'Mevcut Görev: ${currentActiveTask?.shortCode ?? "Yok"}',
      );
    } catch (e) {
      debugPrint('[OrderNotifier] Aktif sipariş çekme hatası: $e');
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Aktif siparişler getirilemedi: $e',
      );
    }
  }

  /// Havuzdaki bir siparişi kabul et / üzerine al (POST /api/orders/{id}/claim)
  Future<bool> claimOrder(String orderId) async {
    state = state.copyWith(isUpdatingStatus: true, errorMessage: null);

    try {
      final updated = await _repository.claimOrder(orderId);
      if (updated != null) {
        state = state.copyWith(
          activeOrder: () => updated,
          isUpdatingStatus: false,
        );
        await fetchActiveOrders();
        return true;
      }
      state = state.copyWith(isUpdatingStatus: false);
      return false;
    } on DioException catch (dioError) {
      debugPrint('[OrderNotifier] claimOrder DioException: ${dioError.message}');
      final responseData = dioError.response?.data;
      final msg = responseData is Map ? responseData['message']?.toString() : null;
      state = state.copyWith(
        isUpdatingStatus: false,
        errorMessage: msg ?? 'Sipariş kabul edilemedi. Başka bir kurye almış olabilir.',
      );
      return false;
    } catch (e) {
      debugPrint('[OrderNotifier] claimOrder hata: $e');
      state = state.copyWith(
        isUpdatingStatus: false,
        errorMessage: 'Sipariş kabul edilirken bir hata oluştu.',
      );
      return false;
    }
  }

  /// Sipariş durumunu güncelle (Assigned -> PickedUp veya PickedUp -> Delivered)
  /// Backend PUT /api/orders/{id}/status çağrısı yapar ve başarılı olunca aktif siparişleri yeniler.
  Future<bool> changeOrderStatus(int newStatus) async {
    final active = state.activeOrder;
    if (active == null) {
      debugPrint('[OrderNotifier] Değiştirilecek aktif sipariş bulunamadı.');
      return false;
    }

    // UI'da loading (spinner ve disabled) state'ini tetikle
    state = state.copyWith(isUpdatingStatus: true, errorMessage: null);

    try {
      await _repository.updateOrderStatus(active.id, newStatus);
      debugPrint(
        '[OrderNotifier] Sipariş ${active.shortCode} (${active.id}) durumu $newStatus olarak güncellendi.',
      );

      // İstek başarılı: backend'den güncel siparişleri ve cüzdan kazançlarını tekrar çek
      await fetchActiveOrders();
      ref.read(walletProvider.notifier).fetchTodayEarnings(isRefresh: true);

      state = state.copyWith(isUpdatingStatus: false);
      return true;
    } on DioException catch (dioError) {
      debugPrint('[OrderNotifier] changeOrderStatus DioException: statusCode=${dioError.response?.statusCode}, message=${dioError.message}');

      String userFriendlyMessage = 'İşlem gerçekleştirilemedi.';
      final responseData = dioError.response?.data;
      final serverMsg = responseData is Map
          ? (responseData['message'] ?? responseData['detail'] ?? responseData['title'] ?? '').toString()
          : '';

      if (serverMsg.isNotEmpty) {
        userFriendlyMessage = serverMsg;
      } else if (serverMsg.toLowerCase().contains('mesai') ||
          serverMsg.toLowerCase().contains('shift') ||
          (dioError.message != null && dioError.message!.toLowerCase().contains('mesai'))) {
        userFriendlyMessage = 'İşlem yapabilmek için lütfen önce mesainizi başlatın.';
      } else if (dioError.message != null &&
          dioError.message!.isNotEmpty &&
          !dioError.message!.contains('DioException')) {
        userFriendlyMessage = dioError.message!;
      }

      state = state.copyWith(
        isUpdatingStatus: false,
        errorMessage: userFriendlyMessage,
      );
      return false;
    } catch (e) {
      debugPrint('[OrderNotifier] changeOrderStatus beklenmeyen hata: $e');
      state = state.copyWith(
        isUpdatingStatus: false,
        errorMessage: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
      );
      return false;
    }
  }

  /// Belirli bir siparişi aktif görev olarak seç
  void selectActiveOrder(OrderModel order) {
    state = state.copyWith(activeOrder: () => order);
  }

  /// Mevcut görevi tamamlandı olarak işaretle (Yerel UI güncellemesi)
  void completeCurrentTask() {
    state = state.copyWith(activeOrder: () => null);
  }
}

/// Uygulama Genelinde Kullanılacak Order Provider
final orderProvider = NotifierProvider<OrderNotifier, OrderState>(OrderNotifier.new);
