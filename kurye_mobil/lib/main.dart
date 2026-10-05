import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/config/app_config.dart';
import 'core/services/notification_alert_service.dart';
import 'theme/app_theme.dart';
import 'theme/theme_provider.dart';
import 'features/auth/providers/auth_provider.dart';
import 'theme/app_colors.dart';
import 'ui/screens/login_screen.dart';

/// Oturum düştüğünde (401) ekran bağlamından bağımsız login'e dönebilmek için.
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConfig.initialize();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const ProviderScope(child: KuryeMobilApp()));
}

/// Verilen elementin altındaki tüm widget'ları yeniden çizer (State'ler korunur).
void _rebuildAll(Element root) {
  void rebuild(Element el) {
    el.markNeedsBuild();
    el.visitChildren(rebuild);
  }

  root.visitChildren(rebuild);
}

class KuryeMobilApp extends ConsumerWidget {
  const KuryeMobilApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    // AppColors aktif paleti bu bayrağa göre seçer; MaterialApp kurulmadan önce güncellenmeli
    AppColors.isDark = themeMode == ThemeMode.dark;

    // Tema değişince, Theme'e bağlı olmayan widget'lar da yeni renklerle yeniden çizilsin (durum korunur)
    ref.listen<ThemeMode>(themeModeProvider, (previous, next) {
      AppColors.isDark = next == ThemeMode.dark;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final ctx = rootNavigatorKey.currentContext;
        if (ctx is Element) _rebuildAll(ctx);
      });
    });

    // Oturum açıkken kapanırsa (çıkış veya sunucu 401'i) tüm ekranları kapatıp login'e dön
    ref.listen<AuthState>(authProvider, (previous, next) {
      if ((previous?.isAuthenticated ?? false) && next.status == AuthStatus.initial) {
        rootNavigatorKey.currentState?.pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    });

    return MaterialApp(
      navigatorKey: rootNavigatorKey,
      scaffoldMessengerKey: rootScaffoldMessengerKey,
      title: 'KuryeSistemi Saha Mobil',
      theme: lightAppTheme,
      darkTheme: darkAppTheme,
      themeMode: themeMode,
      debugShowCheckedModeBanner: false,
      home: const LoginScreen(),
    );
  }
}
