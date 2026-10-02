import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../../auth/providers/auth_provider.dart';
import '../../location/providers/location_provider.dart';
import '../../orders/providers/order_provider.dart';
import '../../profile/providers/profile_provider.dart';

/// Kurye Mesai Durumu Modeli (ShiftState)
class ShiftState {
  const ShiftState({
    this.isActive = false,
    this.startedAt,
    this.isLoading = false,
    this.errorMessage,
  });

  final bool isActive;
  final DateTime? startedAt;
  final bool isLoading;
  final String? errorMessage;

  ShiftState copyWith({
    bool? isActive,
    DateTime? startedAt,
    bool? isLoading,
    String? errorMessage,
  }) {
    return ShiftState(
      isActive: isActive ?? this.isActive,
      startedAt: startedAt ?? this.startedAt,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

/// Kurye Mesai Notifier'ı (Riverpod 3.x Notifier)
class ShiftNotifier extends Notifier<ShiftState> {
  DioClient get _dio => ref.read(dioClientProvider);

  @override
  ShiftState build() {
    // Uygulama açılışında kurye profilini dinle ve sunucudaki IsOnline durumuna göre senkronize et
    ref.listen(profileProvider, (previous, next) {
      if (next.profile != null) {
        final serverIsOnline = next.profile!.isOnline;
        if (state.isActive != serverIsOnline) {
          state = state.copyWith(
            isActive: serverIsOnline,
            startedAt: serverIsOnline ? (state.startedAt ?? DateTime.now()) : null,
          );
        }
      }
    });

    return const ShiftState();
  }

  /// Mesai durumunu başlat veya bitir
  Future<void> toggleShift(bool active) async {
    state = state.copyWith(
      isActive: active,
      startedAt: active ? (state.startedAt ?? DateTime.now()) : null,
      isLoading: true,
      errorMessage: null,
    );

    try {
      // Backend POST /api/couriers/me/shift çağrısı
      final response = await _dio.post(
        '/api/couriers/me/shift',
        data: {'isOnline': active},
      );

      debugPrint('[ShiftNotifier] Mesai güncellendi: $active -> ${response.data}');

      if (active) {
        // 1. Canlı GPS takibini hemen başlat ve sunucuya anlık ilk konum gönder
        ref.read(locationProvider.notifier).startTracking();
        // 2. Aktif siparişleri sorgula
        ref.read(orderProvider.notifier).fetchActiveOrders();
      } else {
        // Mesai bittiğinde
        ref.read(locationProvider.notifier).stopTracking();
      }

      state = state.copyWith(isLoading: false);
    } catch (e) {
      debugPrint('[ShiftNotifier] Mesai güncelleme hatası: $e');
      String msg = 'Mesai durumu güncellenemedi.';
      if (e is DioException) {
        if (e.response?.data is Map && (e.response!.data as Map).containsKey('message')) {
          msg = (e.response!.data as Map)['message'].toString();
        } else if (e.message != null && e.message!.isNotEmpty) {
          msg = e.message!;
        }
      }
      // Sunucu hatası durumunda yerel durumu geri al
      state = state.copyWith(
        isActive: !active,
        startedAt: !active ? state.startedAt : null,
        isLoading: false,
        errorMessage: msg,
      );
    }
  }
}

final shiftProvider = NotifierProvider<ShiftNotifier, ShiftState>(ShiftNotifier.new);
