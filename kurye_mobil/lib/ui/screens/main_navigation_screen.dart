import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/navigation/navigation_provider.dart';
import '../widgets/custom_bottom_nav.dart';
import 'active_order_map_screen.dart';
import 'home_screen.dart';
import 'profile_screen.dart';
import 'wallet_screen.dart';

/// Ana Navigasyon Kabuğu (MainNavigationScreen)
/// IndexedStack kullanarak sekmeler arası geçişte:
/// - Mesai durumunun (SwipeShiftToggle) sıfırlanmasını kesin olarak önler.
/// - Harita (OpenStreetMap) ve konum durumunu bellekte canlı tutar.
/// - Cüzdan ve Profil ekranlarının gereksiz dispose edilmesini engeller.
class MainNavigationScreen extends ConsumerWidget {
  const MainNavigationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentTabIndex = ref.watch(currentTabProvider);

    return Scaffold(
      body: IndexedStack(
        index: currentTabIndex.clamp(0, 3),
        children: const [
          // Sekme 0: Kokpit
          HomeScreen(showBottomNav: false),
          // Sekme 1: Canlı Harita (OpenStreetMap)
          ActiveOrderMapScreen(showBottomNav: false),
          // Sekme 2: Hakediş ve Cüzdan
          WalletScreen(showBottomNav: false),
          // Sekme 3: Profil & Kasa Mahsuplaşma
          ProfileScreen(showBottomNav: false),
        ],
      ),
      bottomNavigationBar: CustomBottomNav(
        currentIndex: currentTabIndex,
        onTap: (index) {
          ref.read(currentTabProvider.notifier).setTab(index);
        },
      ),
    );
  }
}
