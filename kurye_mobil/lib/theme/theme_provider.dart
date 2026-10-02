import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_provider.dart';

/// Tema Durumu Yöneticisi (ThemeModeNotifier)
/// Varsayılan: ThemeMode.light (Göz yormayan beyaz tema)
/// Ayarlar ekranından kullanıcı istediğinde Karanlık Modu aktif edebilir.
class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    final storage = ref.watch(secureStorageProvider);

    // Saklanan tercihi arka planda oku ve senkronize et
    Future.microtask(() async {
      final isDark = await storage.getDarkModeEnabled();
      state = isDark ? ThemeMode.dark : ThemeMode.light;
    });

    // İlk açılışta beyaz tema aktif başlasın
    return ThemeMode.light;
  }

  /// Temayı değiştir (Karanlık Mod On / Off)
  Future<void> toggleTheme(bool isDark) async {
    state = isDark ? ThemeMode.dark : ThemeMode.light;
    final storage = ref.read(secureStorageProvider);
    await storage.setDarkModeEnabled(isDark);
  }
}

final themeModeProvider =
    NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);
