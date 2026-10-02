import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/courier_earnings_model.dart';
import '../repositories/wallet_repository.dart';

/// Cüzdan Durumu (WalletState)
class WalletState {
  const WalletState({
    this.isLoading = false,
    this.isRefreshing = false,
    this.errorMessage,
    this.earnings,
  });

  final bool isLoading;
  final bool isRefreshing;
  final String? errorMessage;
  final CourierEarningsModel? earnings;

  bool get hasDeliveries =>
      earnings != null && earnings!.deliveries.isNotEmpty;

  double get totalEarnings => earnings?.totalEarnings ?? 0.0;
  int get deliveredCount => earnings?.deliveredPackageCount ?? 0;
  double get averagePerPackage => earnings?.averagePerPackage ?? 0.0;

  factory WalletState.initial() => const WalletState(isLoading: true);

  WalletState copyWith({
    bool? isLoading,
    bool? isRefreshing,
    String? errorMessage,
    CourierEarningsModel? earnings,
  }) {
    return WalletState(
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      errorMessage: errorMessage,
      earnings: earnings ?? this.earnings,
    );
  }
}

// ─── Wallet Repository Provider ──────────────────────────────────────────

final walletRepositoryProvider = Provider<WalletRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  final storageService = ref.watch(secureStorageProvider);
  return WalletRepository(dioClient, storageService);
});

// ─── Wallet Notifier ──────────────────────────────────────────────────────

class WalletNotifier extends Notifier<WalletState> {
  @override
  WalletState build() {
    // Ekran açıldığında bugünkü kazançları otomatik çek
    Future.microtask(() => fetchTodayEarnings());
    return WalletState.initial();
  }

  WalletRepository get _repository => ref.read(walletRepositoryProvider);

  /// Bugünkü kazanç ve tamamlanan teslimatları getirir
  Future<void> fetchTodayEarnings({bool isRefresh = false}) async {
    if (isRefresh) {
      state = state.copyWith(isRefreshing: true, errorMessage: null);
    } else {
      state = state.copyWith(isLoading: true, errorMessage: null);
    }

    try {
      final earnings = await _repository.getTodayEarnings();
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        earnings: earnings,
        errorMessage: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        errorMessage: 'Cüzdan verileri alınamadı: $e',
      );
    }
  }
}

/// Uygulama Genelinde Kullanılacak Wallet Provider
final walletProvider = NotifierProvider<WalletNotifier, WalletState>(WalletNotifier.new);

// ─── Tarih Bazlı Kazanç Geçmişi (Earnings History) ──────────────────────────

enum HistoryFilterType {
  today('Bugün'),
  yesterday('Dün'),
  thisWeek('Bu Hafta'),
  thisMonth('Bu Ay'),
  custom('Özel Tarih');

  const HistoryFilterType(this.label);
  final String label;
}

class EarningsHistoryState {
  const EarningsHistoryState({
    this.isLoading = false,
    this.isRefreshing = false,
    this.errorMessage,
    this.earnings,
    required this.filterType,
    required this.startDate,
    required this.endDate,
  });

  final bool isLoading;
  final bool isRefreshing;
  final String? errorMessage;
  final CourierEarningsModel? earnings;
  final HistoryFilterType filterType;
  final DateTime startDate;
  final DateTime endDate;

  bool get hasDeliveries =>
      earnings != null && earnings!.deliveries.isNotEmpty;

  double get totalEarnings => earnings?.totalEarnings ?? 0.0;
  int get deliveredCount => earnings?.deliveredPackageCount ?? 0;
  double get averagePerPackage => earnings?.averagePerPackage ?? 0.0;

  EarningsHistoryState copyWith({
    bool? isLoading,
    bool? isRefreshing,
    String? errorMessage,
    CourierEarningsModel? earnings,
    HistoryFilterType? filterType,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    return EarningsHistoryState(
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      errorMessage: errorMessage,
      earnings: earnings ?? this.earnings,
      filterType: filterType ?? this.filterType,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
    );
  }
}

class EarningsHistoryNotifier extends Notifier<EarningsHistoryState> {
  @override
  EarningsHistoryState build() {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final endOfDay = DateTime(now.year, now.month, now.day, 23, 59, 59);

    final initial = EarningsHistoryState(
      isLoading: true,
      filterType: HistoryFilterType.today,
      startDate: startOfDay,
      endDate: endOfDay,
    );

    Future.microtask(() => fetchHistory(filterType: HistoryFilterType.today));
    return initial;
  }

  WalletRepository get _repository => ref.read(walletRepositoryProvider);

  /// Filtre tipine göre tarihleri hesaplar ve veriyi çeker
  Future<void> fetchHistory({
    HistoryFilterType? filterType,
    DateTime? customStart,
    DateTime? customEnd,
    bool isRefresh = false,
  }) async {
    final currentFilter = filterType ?? state.filterType;
    final now = DateTime.now();

    DateTime start;
    DateTime end;

    switch (currentFilter) {
      case HistoryFilterType.today:
        start = DateTime(now.year, now.month, now.day);
        end = DateTime(now.year, now.month, now.day, 23, 59, 59);
        break;
      case HistoryFilterType.yesterday:
        final yesterday = now.subtract(const Duration(days: 1));
        start = DateTime(yesterday.year, yesterday.month, yesterday.day);
        end = DateTime(yesterday.year, yesterday.month, yesterday.day, 23, 59, 59);
        break;
      case HistoryFilterType.thisWeek:
        // Haftanın ilk günü (Pazartesi: 1)
        final weekday = now.weekday;
        final monday = now.subtract(Duration(days: weekday - 1));
        start = DateTime(monday.year, monday.month, monday.day);
        end = DateTime(now.year, now.month, now.day, 23, 59, 59);
        break;
      case HistoryFilterType.thisMonth:
        start = DateTime(now.year, now.month, 1);
        end = DateTime(now.year, now.month, now.day, 23, 59, 59);
        break;
      case HistoryFilterType.custom:
        start = customStart ?? state.startDate;
        end = customEnd ?? state.endDate;
        break;
    }

    if (isRefresh) {
      state = state.copyWith(isRefreshing: true, errorMessage: null);
    } else {
      state = state.copyWith(
        isLoading: true,
        errorMessage: null,
        filterType: currentFilter,
        startDate: start,
        endDate: end,
      );
    }

    try {
      final earnings = await _repository.getEarningsHistory(
        startDate: start,
        endDate: end,
      );

      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        earnings: earnings,
        errorMessage: null,
        filterType: currentFilter,
        startDate: start,
        endDate: end,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        errorMessage: 'Geçmiş verileri alınamadı: $e',
      );
    }
  }
}

final earningsHistoryProvider =
    NotifierProvider<EarningsHistoryNotifier, EarningsHistoryState>(
  EarningsHistoryNotifier.new,
);

