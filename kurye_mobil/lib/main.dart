import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/config/app_config.dart';
import 'core/services/notification_alert_service.dart';
import 'theme/app_theme.dart';
import 'theme/theme_provider.dart';
import 'ui/screens/login_screen.dart';

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

class KuryeMobilApp extends ConsumerWidget {
  const KuryeMobilApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
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
