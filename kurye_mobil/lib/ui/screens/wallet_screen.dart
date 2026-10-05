import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/navigation/navigation_provider.dart';
import '../../features/wallet/models/courier_earnings_model.dart';
import '../../features/wallet/providers/wallet_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';
import '../widgets/custom_bottom_nav.dart';

/// Hakediş ve Cüzdan Ekranı (WalletScreen)
/// Tarihsel Değişmezlik (Historical Invariance) ilkesiyle mühürlenmiş
/// dinamik kazanç ve teslimat listesini anlık olarak sergiler.
class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({
    super.key,
    this.showBottomNav = true,
  });

  final bool showBottomNav;

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  String _formatCurrency(double amount) {
    return '₺${amount.toStringAsFixed(2).replaceAll('.', ',')}';
  }

  String _formatTime(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _formatDate(DateTime dt) {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    final currentTabIndex = ref.watch(currentTabProvider);
    final walletState = ref.watch(walletProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // ── 1. Üst Başlık Çubuğu ─────────────────────────────────────────
            _buildTopAppBar(walletState),

            // ── 2. Kaydırılabilir Cüzdan Gövdesi ─────────────────────────────
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                backgroundColor: AppColors.surfaceContainerHigh,
                onRefresh: () async {
                  await ref
                      .read(walletProvider.notifier)
                      .fetchTodayEarnings(isRefresh: true);
                },
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  padding: EdgeInsets.only(
                    left: 16,
                    right: 16,
                    top: 14,
                    bottom: widget.showBottomNav ? 100 : 24,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Dinamik Dashboard Kartı: Bugünkü Kazanç & Paket Sayısı
                      _buildEarningsDashboardCard(walletState),
                      const SizedBox(height: 20),

                      // "Bugünkü Teslimatlar" Bölüm Başlığı
                      _buildSectionHeader(walletState),
                      const SizedBox(height: 12),

                      // Teslimat Listesi veya Boş Durum
                      _buildDeliveriesContent(walletState),
                      const SizedBox(height: 16),

                      // Mühürlü Tarife Bilgi Kartı
                      _buildSecurityTipCard(),
                    ],
                  ),
                ),
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

  // ─── 1. Üst Başlık Çubuğu ──────────────────────────────────────────────────
  Widget _buildTopAppBar(WalletState state) {
    return Container(
      height: 58,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow.withValues(alpha: 0.95),
        border: Border(
          bottom: BorderSide(
            color: AppColors.surfaceBright.withValues(alpha: 0.3),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Sol: Logo & Başlık
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryContainer],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.account_balance_wallet_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'KuryeSistemi',
                    style: AppTextStyles.headlineSm.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                      fontSize: 16,
                      letterSpacing: -0.2,
                    ),
                  ),
                  Text(
                    'Hakediş ve Cüzdan',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Sağ: Canlı Senkronizasyon Rozeti
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHighest.withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.secondary.withValues(alpha: 0.3),
                width: 0.8,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.secondary,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.secondary.withValues(alpha: 0.6),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  state.isRefreshing ? 'YENİLENİYOR' : 'CANLI BAKİYE',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
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

  // ─── 2. Dinamik Dashboard Kartı ────────────────────────────────────────────
  Widget _buildEarningsDashboardCard(WalletState state) {
    final earnings = state.earnings;
    final totalEarnings = earnings?.totalEarnings ?? 0.0;
    final deliveredCount = earnings?.deliveredPackageCount ?? 0;
    final avgPerPackage = earnings?.averagePerPackage ?? 0.0;

    final todayFormatted = _formatDate(DateTime.now());

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF1E2640),
            AppColors.surfaceContainerHigh.withValues(alpha: 0.95),
            const Color(0xFF151C30),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.5),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Üst Satır: Tarih & Durum Rozeti
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today_rounded,
                      size: 14,
                      color: AppColors.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Bugün, $todayFormatted',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppColors.secondary.withValues(alpha: 0.3),
                      width: 0.5,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.verified_rounded,
                        size: 12,
                        color: AppColors.secondary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'MÜHÜRLÜ HAKEDİŞ',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.secondary,
                          fontWeight: FontWeight.w800,
                          fontSize: 9.5,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Kazanç Etiketi
            Text(
              'BUGÜNKÜ TOPLAM KAZANÇ',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.onSurfaceVariant,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
                fontSize: 11,
              ),
            ),
            const SizedBox(height: 4),

            // Büyük Kazanç Rakamı
            state.isLoading && !state.isRefreshing
                ? Container(
                    height: 48,
                    width: 180,
                    margin: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceBright.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(8),
                    ),
                  )
                : Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        _formatCurrency(totalEarnings),
                        style: AppTextStyles.headlineLg.copyWith(
                          color: AppColors.secondary,
                          fontSize: 34,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'net kazanç',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
            const SizedBox(height: 18),

            // İki'li Özet İstatistik Çubuğu
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.background.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.surfaceBright.withValues(alpha: 0.2),
                  width: 0.8,
                ),
              ),
              child: Row(
                children: [
                  // 1. Teslim Edilen Paket
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Icon(
                            Icons.local_shipping_rounded,
                            color: AppColors.primary,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$deliveredCount Paket',
                              style: AppTextStyles.bodyMedium.copyWith(
                                fontWeight: FontWeight.w800,
                                color: AppColors.onSurface,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              'Tamamlandı',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.onSurfaceVariant,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Dikey Ayraç
                  Container(
                    width: 1,
                    height: 28,
                    color: AppColors.surfaceBright.withValues(alpha: 0.3),
                  ),
                  const SizedBox(width: 12),

                  // 2. Paket Başı Ortalama
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: AppColors.secondary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Icon(
                            Icons.trending_up_rounded,
                            color: AppColors.secondary,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _formatCurrency(avgPerPackage),
                              style: AppTextStyles.bodyMedium.copyWith(
                                fontWeight: FontWeight.w800,
                                color: AppColors.onSurface,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              'Paket Başı Ort.',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.onSurfaceVariant,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // FAST ile Para Çek Butonu
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Row(
                        children: [
                          Icon(Icons.flash_on_rounded, color: AppColors.secondary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Hakediş döneminiz sonunda bakiye tanımlı IBAN\'ınıza FAST ile anında aktarılır.',
                              style: AppTextStyles.bodySmall.copyWith(color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                      backgroundColor: AppColors.surfaceContainerHighest,
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: const Icon(Icons.flash_on_rounded, size: 18),
                label: Text(
                  'FAST ile Para Çek (7/24)',
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    fontSize: 13.5,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── 3. Bölüm Başlığı ──────────────────────────────────────────────────────
  Widget _buildSectionHeader(WalletState state) {
    final count = state.earnings?.deliveredPackageCount ?? 0;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Text(
              'Bugünkü Teslimatlar',
              style: AppTextStyles.headlineSm.copyWith(
                fontWeight: FontWeight.w800,
                fontSize: 16,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primaryContainer.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ),
        Text(
          'Mühürlü Değerler',
          style: AppTextStyles.caption.copyWith(
            color: AppColors.onSurfaceVariant,
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  // ─── 4. Teslimat Listesi / Boş Durum ────────────────────────────────────────
  Widget _buildDeliveriesContent(WalletState state) {
    if (state.isLoading && !state.isRefreshing) {
      return Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 40),
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    if (state.errorMessage != null && state.earnings == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.errorContainer.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            Icon(Icons.error_outline_rounded, color: AppColors.error),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                state.errorMessage!,
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.onErrorContainer),
              ),
            ),
            IconButton(
              icon: Icon(Icons.refresh_rounded, color: AppColors.error),
              onPressed: () {
                ref.read(walletProvider.notifier).fetchTodayEarnings();
              },
            ),
          ],
        ),
      );
    }

    final deliveries = state.earnings?.deliveries ?? [];

    if (deliveries.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.surfaceBright.withValues(alpha: 0.2),
            width: 0.8,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerHighest,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.inbox_rounded,
                size: 28,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Bugün Henüz Teslimat Yapılmadı',
              style: AppTextStyles.bodyLarge.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Teslim ettiğiniz siparişler anında işletmenin paket tarifesiyle mühürlenir ve burada listelenir.',
              textAlign: TextAlign.center,
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.onSurfaceVariant,
                height: 1.4,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: deliveries.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final item = deliveries[index];
        return _buildDeliveryItemCard(item);
      },
    );
  }

  // ─── 5. Tekil Teslimat Kartı ───────────────────────────────────────────────
  Widget _buildDeliveryItemCard(DeliveryHistoryItemModel item) {
    final timeStr = _formatTime(item.deliveredAt);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.25),
          width: 0.8,
        ),
      ),
      child: Row(
        children: [
          // Sol: Saat ve Teslimat İkonu
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.check_circle_rounded,
                  size: 16,
                  color: AppColors.secondary,
                ),
                const SizedBox(height: 2),
                Text(
                  timeStr,
                  style: AppTextStyles.caption.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.secondary,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Orta: Kod, Alıcı ve Adres
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      item.shortCode,
                      style: AppTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                        fontSize: 13.5,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'TESLİM EDİLDİ',
                        style: AppTextStyles.caption.copyWith(
                          fontSize: 8.5,
                          fontWeight: FontWeight.w700,
                          color: AppColors.secondary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  item.recipientName.isNotEmpty ? item.recipientName : 'Alıcı Belirtilmedi',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  item.deliveryAddress,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant.withValues(alpha: 0.7),
                    fontSize: 10.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),

          // Sağ: Mühürlü Dinamik Kazanç Rozeti
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: AppColors.secondary.withValues(alpha: 0.35),
                width: 0.8,
              ),
            ),
            child: Text(
              '+${_formatCurrency(item.earning)}',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.secondary,
                fontWeight: FontWeight.w900,
                fontSize: 13.5,
                letterSpacing: -0.2,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── 6. Tarihsel Güvence Bilgi Kartı ───────────────────────────────────────
  Widget _buildSecurityTipCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.2),
          width: 0.6,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.shield_rounded,
              color: AppColors.primary,
              size: 16,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tarihsel Değişmezlik Güvencesi',
                  style: AppTextStyles.bodySmall.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Teslim ettiğiniz her paketin hakedişi, teslim anındaki işletme tarifesinden veritabanına mühürlenir. İlerleyen günlerde tarife değişse dahi geçmiş kazançlarınız korunur.',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 11,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
