import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/wallet/models/courier_earnings_model.dart';
import '../../features/wallet/providers/wallet_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';
import '../widgets/delivery_detail_sheet.dart';

/// Tarih Bazlı Kurye Kazanç ve Teslimat Raporu Ekranı
class EarningsHistoryScreen extends ConsumerStatefulWidget {
  const EarningsHistoryScreen({super.key});

  @override
  ConsumerState<EarningsHistoryScreen> createState() =>
      _EarningsHistoryScreenState();
}

class _EarningsHistoryScreenState extends ConsumerState<EarningsHistoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// Arama metni kod, alıcı, adres veya restoran adıyla eşleşiyor mu? (büyük/küçük harf duyarsız)
  bool _matchesQuery(DeliveryHistoryItemModel item) {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return true;
    return item.searchText.contains(q);
  }

  String _formatDate(DateTime d) {
    final day = d.day.toString().padLeft(2, '0');
    final month = d.month.toString().padLeft(2, '0');
    return '$day.$month.${d.year}';
  }

  String _formatTime(DateTime d) {
    final hour = d.hour.toString().padLeft(2, '0');
    final minute = d.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String _formatCurrency(double amount) {
    return '₺${amount.toStringAsFixed(2).replaceAll('.', ',')}';
  }

  Future<void> _pickCustomDateRange() async {
    final historyState = ref.read(earningsHistoryProvider);
    final now = DateTime.now();

    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2025, 1, 1),
      lastDate: now,
      initialDateRange: DateTimeRange(
        start: historyState.startDate,
        end: historyState.endDate.isAfter(now) ? now : historyState.endDate,
      ),
      builder: (context, child) {
        // Seçici, uygulamanın aktif temasını (açık/karanlık) izler
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: AppColors.primaryContainer,
                  onPrimary: AppColors.onPrimaryContainer,
                ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final start = DateTime(
          picked.start.year, picked.start.month, picked.start.day);
      final end = DateTime(
          picked.end.year, picked.end.month, picked.end.day, 23, 59, 59);

      ref.read(earningsHistoryProvider.notifier).fetchHistory(
            filterType: HistoryFilterType.custom,
            customStart: start,
            customEnd: end,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(earningsHistoryProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceContainerLowest,
        elevation: 0,
        centerTitle: false,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded,
              color: AppColors.onSurface, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Teslimat & Kazanç Raporu',
              style: AppTextStyles.titleMedium.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.onSurface,
                fontSize: 17,
              ),
            ),
            Text(
              'Tarih bazlı geçmiş analizler',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.onSurfaceVariant,
                fontSize: 11,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh_rounded,
                color: AppColors.onSurfaceVariant),
            onPressed: state.isLoading
                ? null
                : () {
                    ref
                        .read(earningsHistoryProvider.notifier)
                        .fetchHistory(isRefresh: true);
                  },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // ── 1. Tarih Filtre Çipleri ───────────────────────────────────────
            _buildFilterChips(state),

            // ── 2. Ana İçerik ────────────────────────────────────────────────
            Expanded(
              child: state.isLoading
                  ? Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(
                            AppColors.primaryContainer),
                      ),
                    )
                  : RefreshIndicator(
                      color: AppColors.primaryContainer,
                      backgroundColor: AppColors.surfaceContainerHigh,
                      onRefresh: () async {
                        await ref
                            .read(earningsHistoryProvider.notifier)
                            .fetchHistory(isRefresh: true);
                      },
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 16),
                        children: [
                          // Hata Mesajı Varsa
                          if (state.errorMessage != null)
                            Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: AppColors.error.withValues(alpha: 0.3),
                                ),
                              ),
                              child: Text(
                                state.errorMessage!,
                                style: AppTextStyles.caption
                                    .copyWith(color: AppColors.error),
                              ),
                            ),

                          // ── Özet KPI Kartı ─────────────────────────────────
                          _buildSummaryCard(state),
                          const SizedBox(height: 20),

                          // ── Teslimat Listesi Başlığı ─────────────────────────
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Teslimat Dökümü',
                                style: AppTextStyles.bodyMedium.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.onSurface,
                                  fontSize: 15,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceContainerHigh,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '${state.deliveredCount} Paket',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.secondary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // ── Arama ──────────────────────────────────────────
                          if (state.hasDeliveries) _buildSearchField(state),

                          // ── Teslimat Öğeleri ───────────────────────────────
                          if (!state.hasDeliveries)
                            _buildEmptyState()
                          else ...[
                            ...state.earnings!.deliveries
                                .where(_matchesQuery)
                                .map((item) => _buildDeliveryCard(item)),
                            if (!state.earnings!.deliveries.any(_matchesQuery))
                              _buildNoSearchResult(),
                          ],
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ── 1. Filtre Çipleri ───────────────────────────────────────────────────────
  Widget _buildFilterChips(EarningsHistoryState state) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        border: Border(
          bottom: BorderSide(
            color: AppColors.surfaceBright.withValues(alpha: 0.25),
            width: 0.8,
          ),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            ...HistoryFilterType.values.map((type) {
              final isSelected = state.filterType == type;

              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: InkWell(
                  onTap: () {
                    if (type == HistoryFilterType.custom) {
                      _pickCustomDateRange();
                    } else {
                      ref
                          .read(earningsHistoryProvider.notifier)
                          .fetchHistory(filterType: type);
                    }
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primaryContainer
                          : AppColors.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primaryContainer
                            : AppColors.surfaceBright.withValues(alpha: 0.3),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (type == HistoryFilterType.custom) ...[
                          Icon(
                            Icons.date_range_rounded,
                            size: 14,
                            color: isSelected
                                ? AppColors.onPrimaryContainer
                                : AppColors.onSurfaceVariant,
                          ),
                          const SizedBox(width: 6),
                        ],
                        Text(
                          type.label,
                          style: AppTextStyles.caption.copyWith(
                            color: isSelected
                                ? AppColors.onPrimaryContainer
                                : AppColors.onSurfaceVariant,
                            fontWeight: isSelected
                                ? FontWeight.w800
                                : FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  // ── 2. Özet Kartı ──────────────────────────────────────────────────────────
  Widget _buildSummaryCard(EarningsHistoryState state) {
    final startStr = _formatDate(state.startDate);
    final endStr = _formatDate(state.endDate);
    final dateRangeLabel =
        startStr == endStr ? startStr : '$startStr - $endStr';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.surfaceContainerLow,
            AppColors.surfaceContainerLowest,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.primaryContainer.withValues(alpha: 0.25),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tarih Etiketi
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.calendar_today_rounded,
                        size: 12, color: AppColors.primaryContainer),
                    const SizedBox(width: 6),
                    Text(
                      dateRangeLabel,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.primaryContainer,
                        fontWeight: FontWeight.w700,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.auto_graph_rounded,
                  color: AppColors.secondary, size: 20),
            ],
          ),
          const SizedBox(height: 14),

          // Toplam Kazanç
          Text(
            'Toplam Dönem Kazancı',
            style: AppTextStyles.caption.copyWith(
              color: AppColors.onSurfaceVariant,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              _formatCurrency(state.totalEarnings),
              style: AppTextStyles.headlineLg.copyWith(
                fontWeight: FontWeight.w900,
                color: AppColors.onSurface,
                fontSize: 32,
                letterSpacing: -1,
              ),
            ),
          ),
          const SizedBox(height: 18),
          Divider(color: AppColors.surfaceContainerHigh, height: 1),
          const SizedBox(height: 16),

          // Alt 2'li İstatistik Barı
          Row(
            children: [
              Expanded(
                child: _buildSubStat(
                  label: 'Teslim Edilen',
                  value: '${state.deliveredCount} Paket',
                  icon: Icons.check_circle_outline_rounded,
                  color: AppColors.secondary,
                ),
              ),
              Container(
                width: 1,
                height: 36,
                color: AppColors.surfaceContainerHigh,
              ),
              Expanded(
                child: _buildSubStat(
                  label: 'Paket Başı Ort.',
                  value: _formatCurrency(state.averagePerPackage),
                  icon: Icons.price_check_rounded,
                  color: AppColors.tertiary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSubStat({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  label,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── 3. Teslimat Kartı ──────────────────────────────────────────────────────
  Widget _buildSearchField(EarningsHistoryState state) {
    final total = state.earnings?.deliveries.length ?? 0;
    final shown = state.earnings?.deliveries.where(_matchesQuery).length ?? 0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: _searchController,
        onChanged: (v) => setState(() => _query = v),
        textInputAction: TextInputAction.search,
        style: TextStyle(color: AppColors.onSurface),
        decoration: InputDecoration(
          hintText: 'Ara: sipariş kodu, alıcı, adres veya restoran',
          prefixIcon: Icon(Icons.search_rounded, color: AppColors.onSurfaceVariant),
          suffixIcon: _query.isEmpty
              ? null
              : IconButton(
                  icon: const Icon(Icons.close_rounded),
                  tooltip: 'Aramayı temizle',
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _query = '');
                  },
                ),
          helperText: _query.trim().isEmpty ? null : '$shown / $total teslimat gösteriliyor',
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildNoSearchResult() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
      alignment: Alignment.center,
      child: Column(
        children: [
          Icon(Icons.search_off_rounded, size: 34, color: AppColors.onSurfaceVariant),
          const SizedBox(height: 10),
          Text(
            '"${_query.trim()}" ile eşleşen teslimat yok',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurface, fontWeight: FontWeight.w700),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            'Seçili tarih aralığında arama yapılır. Aralığı genişletmeyi deneyin.',
            style: AppTextStyles.caption.copyWith(color: AppColors.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildDeliveryCard(DeliveryHistoryItemModel item) {
    return InkWell(
      onTap: () => showDeliveryDetailSheet(context, item),
      borderRadius: BorderRadius.circular(14),
      child: _buildDeliveryCardBody(item),
    );
  }

  Widget _buildDeliveryCardBody(DeliveryHistoryItemModel item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.2),
          width: 0.8,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Teslim İkonu
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.done_all_rounded,
              color: AppColors.secondary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),

          // Bilgiler
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      item.orderCode ?? item.shortCode,
                      style: AppTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      '${_formatDate(item.deliveredAt)} ${_formatTime(item.deliveredAt)}',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.merchantName != null ? '${item.merchantName} → ${item.recipientName}' : item.recipientName,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  item.deliveryAddress,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 11,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),

          // Mühürlü Hakediş Rozeti
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: AppColors.secondary.withValues(alpha: 0.3),
                width: 0.8,
              ),
            ),
            child: Text(
              '+${_formatCurrency(item.earning)}',
              style: AppTextStyles.bodyMedium.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.secondary,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── 4. Boş Durum ───────────────────────────────────────────────────────────
  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 20),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.2),
          width: 0.8,
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHigh,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.inventory_2_outlined,
              size: 30,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Teslimat Kaydı Bulunamadı',
            style: AppTextStyles.bodyLarge.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Seçtiğiniz tarih aralığında tamamlanan bir paket teslimatı bulunmuyor.',
            style: AppTextStyles.caption.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
