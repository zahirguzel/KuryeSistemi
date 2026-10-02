import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';
import '../widgets/operational_network_badge.dart';
import '../widgets/login_input_field.dart';
import '../widgets/primary_action_button.dart';
import 'main_navigation_screen.dart';

/// Sadeleştirilmiş & Modern Kurye Giriş Ekranı
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final TextEditingController _idController = TextEditingController();
  final TextEditingController _passController = TextEditingController();
  bool _obscurePassword = true;
  bool _rememberMe = true;
  String? _savedFirmName;

  @override
  void initState() {
    super.initState();
    _loadSavedFirm();
  }

  Future<void> _loadSavedFirm() async {
    try {
      final name = await ref.read(secureStorageProvider).getMerchantName();
      if (name != null && name.trim().isNotEmpty && mounted) {
        setState(() => _savedFirmName = name.trim());
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _idController.dispose();
    _passController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    final email = _idController.text.trim();
    final password = _passController.text;

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Lütfen telefon/e-posta ve şifrenizi giriniz.'),
          backgroundColor: AppColors.errorContainer,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }

    ref.read(authProvider.notifier).login(email, password);
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final topPadding = MediaQuery.of(context).padding.top;

    // ── Riverpod Auth State Dinleyicisi ───────────────────────────────────
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.isError && next.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(child: Text(next.errorMessage!)),
              ],
            ),
            backgroundColor: AppColors.errorContainer,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      } else if (next.isAuthenticated) {
        final merchant = next.authResponse?.merchantName;
        final welcomeSuffix =
            merchant != null && merchant.isNotEmpty ? ', $merchant' : '';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: AppColors.secondary),
                const SizedBox(width: 8),
                Text('Giriş başarılı$welcomeSuffix!'),
              ],
            ),
            backgroundColor: AppColors.surfaceContainerHigh,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            duration: const Duration(seconds: 2),
          ),
        );

        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            pageBuilder: (_, __, ___) => const MainNavigationScreen(),
            transitionsBuilder: (_, animation, __, child) =>
                FadeTransition(opacity: animation, child: child),
            transitionDuration: const Duration(milliseconds: 300),
          ),
        );
      }
    });

    final authState = ref.watch(authProvider);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: 20,
                vertical: topPadding > 0 ? 12 : 24,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // ── Sadeleştirilmiş Logo ve Başlık ──────────────────────
                  _buildBrandingHeader(),
                  const SizedBox(height: 24),

                  // ── Ana Giriş Kartı ─────────────────────────────────────
                  _buildLoginCard(authState.isLoading),
                  const SizedBox(height: 24),

                  // ── Minimalist Alt Bilgi ────────────────────────────────
                  _buildMinimalFooter(),
                  SizedBox(height: bottomPadding),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sade Başlık & Logo
  // ─────────────────────────────────────────────────────────────────────────
  Widget _buildBrandingHeader() {
    return Column(
      children: [
        Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerHigh,
            shape: BoxShape.circle,
            border: Border.all(
              color: AppColors.primaryContainer.withValues(alpha: 0.35),
              width: 2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Center(
            child: Icon(
              Icons.two_wheeler_rounded,
              color: AppColors.primaryContainer,
              size: 40,
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Kurye Girişi',
          style: AppTextStyles.headlineLg.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Saha Dağıtım & Operasyon Portalı',
          style: AppTextStyles.bodyMd.copyWith(
            color: AppColors.onSurfaceVariant,
            fontSize: 13,
          ),
        ),
      ],
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Ana Login Kartı (Sade, Ferah, Odaklı)
  // ─────────────────────────────────────────────────────────────────────────
  Widget _buildLoginCard(bool isLoading) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.outlineVariant.withValues(alpha: 0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Ağ / Firma Rozeti (Marmara yerine firmadan gelen veya genel ağ)
          OperationalNetworkBadge(
            regionText: _savedFirmName != null
                ? 'Firma: $_savedFirmName'
                : 'Merkez Operasyon',
          ),
          const SizedBox(height: 18),

          // Telefon veya E-posta Girişi
          LoginInputField(
            label: 'TELEFON VEYA E-POSTA',
            hint: '05XX XXX XX XX veya kurye@firma.com',
            hint2: '',
            icon: Icons.person_outline_rounded,
            controller: _idController,
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 14),

          // Şifre Girişi
          LoginInputField(
            label: 'ŞİFRE',
            hint: '••••••••',
            hint2: '',
            icon: Icons.lock_outline_rounded,
            isPassword: true,
            obscureText: _obscurePassword,
            onTogglePassword: () =>
                setState(() => _obscurePassword = !_obscurePassword),
            controller: _passController,
          ),
          const SizedBox(height: 10),

          // Beni Hatırla
          _buildRememberRow(),
          const SizedBox(height: 18),

          // Giriş Yap Butonu
          PrimaryActionButton(
            label: 'Giriş Yap',
            icon: Icons.arrow_forward_rounded,
            isLoading: isLoading,
            onPressed: _handleLogin,
          ),
        ],
      ),
    );
  }

  Widget _buildRememberRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        GestureDetector(
          onTap: () => setState(() => _rememberMe = !_rememberMe),
          child: Row(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: _rememberMe
                      ? AppColors.primaryContainer
                      : AppColors.surfaceContainer,
                  borderRadius: BorderRadius.circular(5),
                ),
                child: _rememberMe
                    ? const Icon(Icons.check, color: Colors.white, size: 14)
                    : null,
              ),
              const SizedBox(width: 8),
              Text(
                'Beni Hatırla',
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.onSurface,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
        Text(
          '7/24 Saha Desteği',
          style: AppTextStyles.caption.copyWith(
            color: AppColors.secondary,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildMinimalFooter() {
    return Text(
      'KuryeSistemi • Güvenli Saha Ağı',
      style: AppTextStyles.caption.copyWith(
        color: AppColors.onSurfaceVariant.withValues(alpha: 0.6),
        fontSize: 11,
      ),
    );
  }
}
