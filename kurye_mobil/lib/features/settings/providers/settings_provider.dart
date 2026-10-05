import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';

/// Kuryenin günlük teslimat hedefi (paket). Cihazda saklanır; ana ekran ilerleme kartı bunu kullanır.
class DailyGoalNotifier extends Notifier<int> {
  static const int minGoal = 1;
  static const int maxGoal = 200;

  @override
  int build() {
    Future.microtask(() async {
      final saved = await ref.read(secureStorageProvider).getDailyGoal();
      state = saved;
    });
    return 20;
  }

  Future<void> setGoal(int goal) async {
    final clamped = goal.clamp(minGoal, maxGoal);
    state = clamped;
    await ref.read(secureStorageProvider).setDailyGoal(clamped);
  }
}

final dailyGoalProvider = NotifierProvider<DailyGoalNotifier, int>(DailyGoalNotifier.new);

/// Varsayılan navigasyon uygulaması tercihi (kalıcı).
class NavigationAppNotifier extends Notifier<String> {
  static const List<String> options = ['Google Haritalar', 'Yandex Navigasyon', 'Dahili Harita (OSM)'];

  @override
  String build() {
    Future.microtask(() async {
      final saved = await ref.read(secureStorageProvider).getNavigationApp();
      state = options.contains(saved) ? saved : options.first;
    });
    return options.first;
  }

  Future<void> setApp(String app) async {
    state = app;
    await ref.read(secureStorageProvider).setNavigationApp(app);
  }
}

final navigationAppProvider = NotifierProvider<NavigationAppNotifier, String>(NavigationAppNotifier.new);
