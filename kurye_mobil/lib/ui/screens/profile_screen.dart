import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/navigation/navigation_provider.dart';
import '../../core/services/notification_alert_service.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/location/providers/location_provider.dart';
import '../../features/profile/models/courier_profile_model.dart';
import '../../features/profile/providers/profile_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';
import '../../theme/theme_provider.dart';
import '../widgets/custom_bottom_nav.dart';
import 'earnings_history_screen.dart';
import 'login_screen.dart';

/// Kurye Profil, Ayarlar ve Kasa Mahsuplaşma Ekranı (ProfileScreen)
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({
    super.key,
    this.showBottomNav = true,
  });

  final bool showBottomNav;

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  // ── Kurye Çalışma & Bildirim Ayarları ────────────────────────────────────
  bool _soundNotification = true;
  bool _vibrationNotification = true;
  String _selectedNavigationApp = 'Google Haritalar';

  @override
  void initState() {
    super.initState();
    _loadNotificationPreferences();
  }

  Future<void> _loadNotificationPreferences() async {
    final storage = ref.read(secureStorageProvider);
    final sound = await storage.getSoundNotificationEnabled();
    final vibration = await storage.getVibrationNotificationEnabled();
    if (mounted) {
      setState(() {
        _soundNotification = sound;
        _vibrationNotification = vibration;
      });
    }
  }

  String _formatCurrency(double amount) {
    return '₺${amount.toStringAsFixed(2).replaceAll('.', ',')}';
  }


  @override
  Widget build(BuildContext context) {
    super.build(context);

    final currentTabIndex = ref.watch(currentTabProvider);
    final profileState = ref.watch(profileProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // ── 1. Üst Başlık Çubuğu ─────────────────────────────────────────
            _buildTopAppBar(profileState),

            // ── 2. Kaydırılabilir İçerik (Pull-to-Refresh) ──────────────────
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primaryContainer,
                backgroundColor: AppColors.surfaceContainerHigh,
                onRefresh: () async {
                  await ref
                      .read(profileProvider.notifier)
                      .fetchProfile(isRefresh: true);
                },
                child: _buildBody(profileState),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: widget.showBottomNav
          ? CustomBottomNav(
              currentIndex: currentTabIndex,
              onTap: (index) {
                ref.read(currentTabProvider.notifier).setTab(index);
              },
            )
          : null,
    );
  }

  // ─── 1. Üst Başlık ─────────────────────────────────────────────────────────
  Widget _buildTopAppBar(ProfileState state) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest.withValues(alpha: 0.95),
        border: Border(
          bottom: BorderSide(
            color: AppColors.surfaceBright.withValues(alpha: 0.25),
            width: 0.8,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: AppColors.primaryContainer.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: const Icon(
                  Icons.person_rounded,
                  color: AppColors.primaryContainer,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Kurye Profili & Kasa',
                    style: AppTextStyles.titleMedium.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                      letterSpacing: -0.3,
                    ),
                  ),
                  Text(
                    'Hesap ve Mahsuplaşma',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Eylemler: Yenileme ve Doğrudan Çıkış Yap Butonu
          Row(
            children: [
              if (state.isRefreshing)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryContainer),
                  ),
                )
              else
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, size: 22),
                  color: AppColors.onSurfaceVariant,
                  tooltip: 'Yenile',
                  onPressed: () {
                    ref
                        .read(profileProvider.notifier)
                        .fetchProfile(isRefresh: true);
                  },
                ),
              const SizedBox(width: 4),
              IconButton(
                icon: const Icon(Icons.logout_rounded, size: 22, color: AppColors.error),
                tooltip: 'Çıkış Yap',
                onPressed: _showLogoutConfirmDialog,
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── 2. Ana Gövde ──────────────────────────────────────────────────────────
  Widget _buildBody(ProfileState state) {
    if (state.isLoading && !state.isRefreshing) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryContainer),
        ),
      );
    }

    if (state.isError && state.profile == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    color: AppColors.error,
                    size: 48,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Profil Bilgisi Alınamadı',
                    style: AppTextStyles.titleMedium.copyWith(
                      color: AppColors.onSurface,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    state.errorMessage ?? 'Sunucu bağlantısı kurulamadı.',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ElevatedButton.icon(
                        onPressed: () =>
                            ref.read(profileProvider.notifier).fetchProfile(),
                        icon: const Icon(Icons.refresh_rounded, size: 18),
                        label: const Text('Tekrar Dene'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryContainer,
                          foregroundColor: AppColors.onPrimaryContainer,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton.icon(
                        onPressed: _showLogoutConfirmDialog,
                        icon: const Icon(Icons.logout_rounded, size: 18, color: AppColors.error),
                        label: const Text('Çıkış Yap', style: TextStyle(color: AppColors.error)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.error),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    final profile = state.profile;
    if (profile == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.account_circle_outlined, size: 64, color: AppColors.surfaceVariant),
            const SizedBox(height: 12),
            Text(
              'Profil Yüklenemedi',
              style: AppTextStyles.titleMedium.copyWith(color: AppColors.onSurface),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _showLogoutConfirmDialog,
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: const Text('Çıkış Yap ve Yeniden Gir'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
      children: [
        // ── 2.1. Kasa Durumu (Reconciliation Card - En Dikkat Çekici Bölüm) ───
        _buildReconciliationCard(profile),
        const SizedBox(height: 16),

        // ── 2.2. Kurye Kimlik ve Bilgi Kartı ─────────────────────────────────
        _buildCourierInfoCard(profile),
        const SizedBox(height: 14),

        // ── 2.3. Araç ve Plaka Kartı ─────────────────────────────────────────
        _buildVehicleCard(profile),
        const SizedBox(height: 14),

        // ── 2.4. Performans ve Teslimat İstatistikleri (Tarih Bazlı Rapor) ───
        _buildStatsCard(profile),
        const SizedBox(height: 14),

        // ── 2.5. Çalışma & Uygulama Ayarları ─────────────────────────────────
        _buildSettingsSection(),
        const SizedBox(height: 24),

        // ── 2.6. Güvenli Çıkış Yap (Logout) Butonu ───────────────────────────
        _buildLogoutButton(),
        const SizedBox(height: 16),

        // ── 2.7. Versiyon ve Sistem Sağlığı Etiketi ──────────────────────────
        _buildAppVersionInfo(),
      ],
    );
  }


  // ─── 3. Kasa Durumu Kartı (Mahsuplaşma Odak Noktası) ────────────────────────
  Widget _buildReconciliationCard(CourierProfileModel profile) {
    final isIndebted = profile.isIndebted;
    final isCreditor = profile.isCreditor;

    // Renk ve Tema Belirleme:
    // Borçlu: Kırmızı / Amber
    // Alacaklı: Zümrüt Yeşili
    // Dengede: Modern Mavi / Nötr
    final Color mainColor = isIndebted
        ? const Color(0xFFFF5252)
        : (isCreditor ? AppColors.secondary : const Color(0xFF4FC3F7));

    final Color bgColor = isIndebted
        ? const Color(0xFF2C1010)
        : (isCreditor ? const Color(0xFF0C2417) : const Color(0xFF0F1E2A));

    final Color borderColor = mainColor.withValues(alpha: 0.35);

    final String statusBadge = isIndebted
        ? 'FİRMAYA BORÇ'
        : (isCreditor ? 'FİRMADAN ALACAK' : 'HESAP DENGEDE');

    final String titleText = isIndebted
        ? 'İşletmeye Ödenecek'
        : (isCreditor ? 'İşletmeden Alacaklı' : 'Kasa Durumu');

    final String amountText = isIndebted
        ? _formatCurrency(profile.absoluteBalance)
        : (isCreditor
            ? '+${_formatCurrency(profile.absoluteBalance)}'
            : _formatCurrency(0.0));

    final String descriptionText = isIndebted
        ? 'Müşterilerden tahsil ettiğiniz nakit ödemeler firmanıza borç olarak yansımıştır.'
        : (isCreditor
            ? 'Tamamladığınız teslimat hak edişleriniz, nakit borcunuzdan fazladır.'
            : 'Tahsil edilen nakit ile paket teslimat hak edişleriniz tam olarak eşittir.');

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: mainColor.withValues(alpha: 0.14),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Rozet & İkon Satırı
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: mainColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: mainColor.withValues(alpha: 0.45),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isIndebted
                          ? Icons.warning_amber_rounded
                          : (isCreditor
                              ? Icons.account_balance_wallet_rounded
                              : Icons.check_circle_outline_rounded),
                      size: 14,
                      color: mainColor,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      statusBadge,
                      style: AppTextStyles.caption.copyWith(
                        color: mainColor,
                        fontWeight: FontWeight.w900,
                        fontSize: 10.5,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                profile.merchantName,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Tutar ve Başlık
          Text(
            titleText,
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            amountText,
            style: AppTextStyles.displayLarge.copyWith(
              color: mainColor,
              fontWeight: FontWeight.w900,
              fontSize: 34,
              letterSpacing: -1,
            ),
          ),
          const SizedBox(height: 10),

          // Açıklama Metni
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.25),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline_rounded,
                  size: 14,
                  color: AppColors.onSurfaceVariant.withValues(alpha: 0.8),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    descriptionText,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 11,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── 4. Kurye Bilgi Kartı ──────────────────────────────────────────────────
  Widget _buildCourierInfoCard(CourierProfileModel profile) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.3),
          width: 0.8,
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: AppColors.primaryContainer.withValues(alpha: 0.2),
                child: Text(
                  profile.firstName.isNotEmpty
                      ? profile.firstName[0].toUpperCase()
                      : 'K',
                  style: AppTextStyles.headlineMedium.copyWith(
                    color: AppColors.primaryContainer,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.fullName,
                      style: AppTextStyles.titleMedium.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: profile.isAvailable
                                ? AppColors.secondary
                                : Colors.amber,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          profile.isAvailable
                              ? 'Göreve Hazır (Aktif)'
                              : 'Meşgul / Çevrimdışı',
                          style: AppTextStyles.caption.copyWith(
                            color: profile.isAvailable
                                ? AppColors.secondary
                                : Colors.amber,
                            fontWeight: FontWeight.w700,
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: AppColors.surfaceBright),
          const SizedBox(height: 14),

          // İletişim Satırları
          _buildInfoRow(
            icon: Icons.phone_rounded,
            label: 'Telefon',
            value: profile.phoneNumber.isNotEmpty ? profile.phoneNumber : 'Belirtilmedi',
          ),
          const SizedBox(height: 10),
          _buildInfoRow(
            icon: Icons.alternate_email_rounded,
            label: 'E-Posta',
            value: profile.email.isNotEmpty ? profile.email : 'Belirtilmedi',
          ),
          const SizedBox(height: 10),
          _buildInfoRow(
            icon: Icons.store_mall_directory_rounded,
            label: 'Bağlı İşletme',
            value: profile.merchantName,
          ),
        ],
      ),
    );
  }

  // ─── 5. Araç ve Plaka Kartı ────────────────────────────────────────────────
  Widget _buildVehicleCard(CourierProfileModel profile) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.3),
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.two_wheeler_rounded,
                size: 20,
                color: AppColors.primaryContainer,
              ),
              const SizedBox(width: 8),
              Text(
                'Kayıtlı Araç Bilgileri',
                style: AppTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          Row(
            children: [
              // Plaka Plaketi
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppColors.surfaceBright,
                    width: 1.2,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0D47A1),
                        borderRadius: BorderRadius.circular(3),
                      ),
                      child: const Text(
                        'TR',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      profile.licensePlate.isNotEmpty
                          ? profile.licensePlate
                          : 'PLAKA YOK',
                      style: AppTextStyles.bodyLarge.copyWith(
                        fontWeight: FontWeight.w900,
                        color: AppColors.onSurface,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),

              // Araç Tipi & Modeli
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.vehicleType,
                      style: AppTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                      ),
                    ),
                    Text(
                      '${profile.vehicleBrand} ${profile.vehicleModel}'.trim().isNotEmpty
                          ? '${profile.vehicleBrand} ${profile.vehicleModel}'.trim()
                          : 'Standart Kurye Aracı',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── 6. Performans & İstatistik Kartı (Tarih Bazlı Rapor Bağlantılı) ───────
  Widget _buildStatsCard(CourierProfileModel profile) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.3),
          width: 0.8,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => const EarningsHistoryScreen(),
              ),
            );
          },
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.insights_rounded,
                          size: 20,
                          color: AppColors.secondary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Teslimat İstatistikleri',
                          style: AppTextStyles.bodyMedium.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          'Tüm Geçmiş',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.primaryContainer,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.arrow_forward_ios_rounded,
                          size: 11,
                          color: AppColors.primaryContainer,
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                Row(
                  children: [
                    Expanded(
                      child: _buildMiniStat(
                        title: 'Bugün Teslim',
                        value: '${profile.completedDeliveriesToday} Paket',
                        icon: Icons.check_circle_outline_rounded,
                        color: AppColors.secondary,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildMiniStat(
                        title: 'Bugünkü Kazanç',
                        value: _formatCurrency(profile.totalEarningsToday),
                        icon: Icons.trending_up_rounded,
                        color: AppColors.primaryContainer,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildMiniStat(
                        title: 'Toplam Teslim',
                        value: '${profile.totalDeliveriesAllTime}',
                        icon: Icons.all_inbox_rounded,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Tarih Filtreli Rapor Çağrısı
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppColors.primaryContainer.withValues(alpha: 0.2),
                      width: 0.8,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.calendar_month_rounded,
                        size: 14,
                        color: AppColors.primaryContainer,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Tarih bazlı geçmiş kazanç ve paketleri incele',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.primaryContainer,
                          fontWeight: FontWeight.w700,
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─── 7. Profesyonel Çalışma & Uygulama Ayarları Bölümü ───────────────────────
  Widget _buildSettingsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          child: Text(
            'ÇALIŞMA & UYGULAMA AYARLARI',
            style: AppTextStyles.caption.copyWith(
              color: AppColors.onSurfaceVariant,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.0,
              fontSize: 11,
            ),
          ),
        ),
        const SizedBox(height: 8),

        // 0. Grup: Tema & Görünüm (Karanlık Mod / Açık Mod)
        _buildSettingsCard(
          title: 'Görünüm & Tema',
          icon: Icons.palette_outlined,
          iconColor: Colors.amber,
          children: [
            _buildSwitchTile(
              title: 'Karanlık Mod (Dark Mode)',
              subtitle: ref.watch(themeModeProvider) == ThemeMode.dark
                  ? 'Gece sürüşü için karanlık tema aktif'
                  : 'Göz yormayan ferah beyaz tema aktif',
              value: ref.watch(themeModeProvider) == ThemeMode.dark,
              onChanged: (val) {
                ref.read(themeModeProvider.notifier).toggleTheme(val);
              },
            ),
          ],
        ),
        const SizedBox(height: 12),

        // 1. Grup: Bildirim ve Sesler
        _buildSettingsCard(
          title: 'Ses & Bildirim Tercihleri',
          icon: Icons.notifications_active_outlined,
          iconColor: AppColors.primaryContainer,
          children: [
            _buildSwitchTile(
              title: 'Yeni Sipariş Bildirim Sesi',
              subtitle: 'Sipariş düştüğünde yüksek sesli kurye tonu çalar',
              value: _soundNotification,
              onChanged: (val) async {
                setState(() => _soundNotification = val);
                await ref.read(secureStorageProvider).setSoundNotificationEnabled(val);
                if (val) {
                  ref.read(notificationAlertServiceProvider).triggerTestAlert();
                }
              },
            ),
            const Divider(color: AppColors.surfaceContainerHigh, height: 1),
            _buildSwitchTile(
              title: 'Titreşimli Uyarı',
              subtitle: 'Telefon cebinizdeyken güçlü titreşim üretir',
              value: _vibrationNotification,
              onChanged: (val) async {
                setState(() => _vibrationNotification = val);
                await ref.read(secureStorageProvider).setVibrationNotificationEnabled(val);
                if (val) {
                  ref.read(notificationAlertServiceProvider).triggerTestAlert();
                }
              },
            ),
            const Divider(color: AppColors.surfaceContainerHigh, height: 1),
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              leading: Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.volume_up_rounded,
                  color: AppColors.primaryContainer,
                  size: 20,
                ),
              ),
              title: Text(
                'Ses ve Titreşimi Test Et',
                style: AppTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                  fontSize: 13.5,
                ),
              ),
              subtitle: Text(
                'Alarm sesini ve titreşimi anında dene',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
              trailing: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryContainer,
                  foregroundColor: AppColors.onPrimaryContainer,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                onPressed: () {
                  ref.read(notificationAlertServiceProvider).triggerTestAlert();
                },
                child: const Text('Test Et', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // 2. Grup: Harita & Navigasyon Tercihi
        _buildSettingsCard(
          title: 'Harita & Navigasyon',
          icon: Icons.map_outlined,
          iconColor: AppColors.secondary,
          children: [
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
              title: Text(
                'Varsayılan Navigasyon',
                style: AppTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                  fontSize: 13.5,
                ),
              ),
              subtitle: Text(
                _selectedNavigationApp,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.secondary,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
              trailing: const Icon(
                Icons.arrow_forward_ios_rounded,
                size: 14,
                color: AppColors.onSurfaceVariant,
              ),
              onTap: _showNavigationPickerSheet,
            ),
          ],
        ),
        const SizedBox(height: 12),

        // 3. Grup: Sistem & Donanım Sağlığı
        _buildSettingsCard(
          title: 'Sistem & Donanım Durumu',
          icon: Icons.speed_rounded,
          iconColor: AppColors.tertiary,
          children: [
            _buildStatusItem(
              title: 'Arka Plan Konum İzni',
              status: 'Her Zaman İzin Verildi',
              isHealthy: true,
              icon: Icons.gps_fixed_rounded,
            ),
            const Divider(color: AppColors.surfaceContainerHigh, height: 1),
            _buildStatusItem(
              title: 'Pil Optimizasyonu',
              status: 'Kısıtlamasız (Yüksek Hassasiyet)',
              isHealthy: true,
              icon: Icons.battery_charging_full_rounded,
            ),
            const Divider(color: AppColors.surfaceContainerHigh, height: 1),
            _buildStatusItem(
              title: 'Canlı Sunucu Bağlantısı',
              status: 'SignalR Çevrimiçi',
              isHealthy: true,
              icon: Icons.wifi_rounded,
            ),
          ],
        ),
        const SizedBox(height: 12),

        // 4. Grup: Güvenlik & Destek
        _buildSettingsCard(
          title: 'Güvenlik & Saha Desteği',
          icon: Icons.security_rounded,
          iconColor: AppColors.primary,
          children: [
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
              leading: const Icon(Icons.lock_reset_rounded, size: 20, color: AppColors.onSurfaceVariant),
              title: Text(
                'Giriş Şifresini Değiştir',
                style: AppTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                  fontSize: 13.5,
                ),
              ),
              trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.onSurfaceVariant),
              onTap: _showChangePasswordDialog,
            ),
            const Divider(color: AppColors.surfaceContainerHigh, height: 1),
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
              leading: const Icon(Icons.support_agent_rounded, size: 20, color: AppColors.secondary),
              title: Text(
                'Kurye Saha Destek & WhatsApp',
                style: AppTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                  fontSize: 13.5,
                ),
              ),
              trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.onSurfaceVariant),
              onTap: _showSupportDialog,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSettingsCard({
    required String title,
    required IconData icon,
    required Color iconColor,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.25),
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
            child: Row(
              children: [
                Icon(icon, size: 18, color: iconColor),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface,
                    fontSize: 13.5,
                  ),
                ),
              ],
            ),
          ),
          ...children,
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            activeThumbColor: AppColors.primaryContainer,
            activeTrackColor: AppColors.primaryContainer.withValues(alpha: 0.4),
            inactiveThumbColor: AppColors.onSurfaceVariant,
            inactiveTrackColor: AppColors.surfaceContainerHigh,
            onChanged: onChanged,
          ),

        ],
      ),
    );
  }

  Widget _buildStatusItem({
    required String title,
    required String status,
    required bool isHealthy,
    required IconData icon,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              style: AppTextStyles.bodyMedium.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.onSurface,
                fontSize: 12.5,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isHealthy
                  ? AppColors.secondary.withValues(alpha: 0.15)
                  : AppColors.error.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: isHealthy
                    ? AppColors.secondary.withValues(alpha: 0.3)
                    : AppColors.error.withValues(alpha: 0.3),
                width: 0.6,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isHealthy ? AppColors.secondary : AppColors.error,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  status,
                  style: AppTextStyles.caption.copyWith(
                    color: isHealthy ? AppColors.secondary : AppColors.error,
                    fontWeight: FontWeight.w700,
                    fontSize: 10.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Navigasyon Seçici BottomSheet ──────────────────────────────────────────
  void _showNavigationPickerSheet() {
    final apps = ['Google Haritalar', 'Yandex Navigasyon', 'Dahili Harita (OSM)'];

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceContainerHigh,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Varsayılan Navigasyon Tercihi',
                  style: AppTextStyles.titleMedium.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Sipariş teslimatında rotayı açarken kullanılacak uygulama',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                ...apps.map((app) {
                  final isSelected = _selectedNavigationApp == app;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                      color: isSelected ? AppColors.primaryContainer : AppColors.onSurfaceVariant,
                    ),
                    title: Text(
                      app,
                      style: AppTextStyles.bodyMedium.copyWith(
                        fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                        color: AppColors.onSurface,
                      ),
                    ),
                    onTap: () {
                      setState(() => _selectedNavigationApp = app);
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Navigasyon "$app" olarak ayarlandı.'),
                          behavior: SnackBarBehavior.floating,
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Şifre Değiştir Dialog'u ────────────────────────────────────────────────
  void _showChangePasswordDialog() {
    final oldPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return AlertDialog(
          backgroundColor: AppColors.surfaceContainerHigh,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              const Icon(Icons.lock_outline_rounded, color: AppColors.primaryContainer),
              const SizedBox(width: 8),
              Text(
                'Şifre Değiştir',
                style: AppTextStyles.titleMedium.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: oldPasswordController,
                obscureText: true,
                style: const TextStyle(color: AppColors.onSurface),
                decoration: const InputDecoration(
                  labelText: 'Mevcut Şifre',
                  prefixIcon: Icon(Icons.key_outlined, size: 18),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: newPasswordController,
                obscureText: true,
                style: const TextStyle(color: AppColors.onSurface),
                decoration: const InputDecoration(
                  labelText: 'Yeni Şifre (En az 6 karakter)',
                  prefixIcon: Icon(Icons.password_outlined, size: 18),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmPasswordController,
                obscureText: true,
                style: const TextStyle(color: AppColors.onSurface),
                decoration: const InputDecoration(
                  labelText: 'Yeni Şifre Tekrar',
                  prefixIcon: Icon(Icons.check_circle_outline, size: 18),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text('İptal'),
            ),
            ElevatedButton(
              onPressed: () {
                if (newPasswordController.text.length < 6) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Yeni şifre en az 6 karakter olmalıdır.'),
                      backgroundColor: AppColors.error,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  return;
                }
                if (newPasswordController.text != confirmPasswordController.text) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Yeni şifreler birbiriyle uyuşmuyor.'),
                      backgroundColor: AppColors.error,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  return;
                }

                Navigator.pop(dialogCtx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Şifreniz başarıyla güncellendi!'),
                    backgroundColor: AppColors.secondary,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryContainer,
                foregroundColor: AppColors.onPrimaryContainer,
              ),
              child: const Text('Güncelle'),
            ),
          ],
        );
      },
    );
  }

  // ── Saha Destek Dialog'u ───────────────────────────────────────────────────
  void _showSupportDialog() {
    showDialog(
      context: context,
      builder: (dialogCtx) {
        return AlertDialog(
          backgroundColor: AppColors.surfaceContainerHigh,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              const Icon(Icons.headset_mic_rounded, color: AppColors.secondary),
              const SizedBox(width: 8),
              Text(
                'Kurye Saha Desteği',
                style: AppTextStyles.titleMedium.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Sipariş teslimatı, adres bulma veya müşteri ulaşılamama durumlarında merkez dispeçer hattına 7/24 ulaşabilirsiniz.',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLowest,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.phone_in_talk_rounded, color: AppColors.secondary),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Dispeçer Acil Çağrı',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 11,
                          ),
                        ),
                        Text(
                          '0850 300 00 00',
                          style: AppTextStyles.bodyLarge.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text('Kapat'),
            ),
          ],
        );
      },
    );
  }

  // ── 8. Versiyon ve Sistem Sağlığı Etiketi ───────────────────────────────────
  Widget _buildAppVersionInfo() {
    return Center(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.secondary,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                'KuryeSistemi Pro • v1.2.0-enterprise',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.onSurfaceVariant.withValues(alpha: 0.7),
                  fontWeight: FontWeight.w700,
                  fontSize: 11,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Tüm hakları saklıdır • Güvenli Kurye Ağı',
            style: AppTextStyles.caption.copyWith(
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.4),
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildMiniStat({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.2),
          width: 0.6,
        ),
      ),
      child: Column(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 6),
          Text(
            value,
            style: AppTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.onSurface,
              fontSize: 13,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.onSurfaceVariant,
              fontSize: 10,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.onSurfaceVariant),
        const SizedBox(width: 10),
        Text(
          label,
          style: AppTextStyles.caption.copyWith(
            color: AppColors.onSurfaceVariant,
            fontWeight: FontWeight.w600,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.onSurface,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  // ─── 7. Güvenli Çıkış Yap (Logout) Butonu & Zombi Süreç Temizliği ──────────
  Widget _buildLogoutButton() {
    return Container(
      width: double.infinity,
      height: 52,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.error.withValues(alpha: 0.4),
          width: 1,
        ),
      ),
      child: Material(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: _showLogoutConfirmDialog,
          borderRadius: BorderRadius.circular(14),
          splashColor: AppColors.error.withValues(alpha: 0.2),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.logout_rounded,
                color: AppColors.error,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Güvenli Çıkış Yap',
                style: AppTextStyles.bodyLarge.copyWith(
                  color: AppColors.error,
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Çıkış Onay Modalı ve Hayalet (Zombi) Süreç Temizliği
  void _showLogoutConfirmDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: AppColors.surfaceContainerHigh,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.power_settings_new_rounded,
                  color: AppColors.error,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Oturumu Kapat',
                style: AppTextStyles.titleMedium.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
            ],
          ),
          content: Text(
            'Çıkış yapmak istediğinize emin misiniz?\n\n'
            'Arka plandaki GPS konum takibi ve canlı sunucu bağlantısı güvenle sonlandırılacaktır.',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.onSurfaceVariant,
              height: 1.4,
            ),
          ),
          actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text(
                'Vazgeç',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _performCleanLogout();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text('Çıkış Yap'),
            ),
          ],
        );
      },
    );
  }

  /// Zombi süreçleri temizleyip çıkış yapan ana metot
  Future<void> _performCleanLogout() async {
    // 1. Zombi GPS ve SignalR süreçlerini durdur
    try {
      await ref.read(locationProvider.notifier).stopTracking();
    } catch (e) {
      debugPrint('[Logout] locationProvider stopTracking hatası: $e');
    }

    // 2. Token ve yerel oturum verilerini sil
    await ref.read(authProvider.notifier).logout();

    // 3. Login ekranına temiz yönlendirme
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }
}
