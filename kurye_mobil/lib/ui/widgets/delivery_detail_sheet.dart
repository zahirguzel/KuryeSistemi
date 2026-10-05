import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../features/wallet/models/courier_earnings_model.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Geçmiş bir teslimatın tüm detaylarını gösteren alt sayfa.
Future<void> showDeliveryDetailSheet(BuildContext context, DeliveryHistoryItemModel item) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surfaceContainerHigh,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => DraggableScrollableSheet(
      initialChildSize: 0.78,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (ctx, scroll) => _DeliveryDetailBody(item: item, controller: scroll),
    ),
  );
}

String _two(int n) => n.toString().padLeft(2, '0');
String _date(DateTime d) => '${_two(d.day)}.${_two(d.month)}.${d.year}';
String _time(DateTime d) => '${_two(d.hour)}:${_two(d.minute)}';
String _money(double v) => '₺${v.toStringAsFixed(2).replaceAll('.', ',')}';

String _paymentLabel(String? raw) {
  switch (raw) {
    case 'Cash':
      return 'Nakit (müşteriden tahsil edildi)';
    case 'Online':
      return 'Online ödeme';
    case 'CreditCardOnDelivery':
      return 'Kapıda kredi kartı';
    default:
      return raw ?? '—';
  }
}

String _duration(DateTime from, DateTime to) {
  final diff = to.difference(from);
  if (diff.isNegative) return '—';
  if (diff.inMinutes < 1) return '1 dk\'dan az';
  if (diff.inHours < 1) return '${diff.inMinutes} dk';
  return '${diff.inHours} sa ${diff.inMinutes % 60} dk';
}

class _DeliveryDetailBody extends StatelessWidget {
  const _DeliveryDetailBody({required this.item, required this.controller});

  final DeliveryHistoryItemModel item;
  final ScrollController controller;

  @override
  Widget build(BuildContext context) {
    final code = item.orderCode ?? item.shortCode;
    final steps = <(String, DateTime?)>[
      ('Sipariş oluşturuldu', item.createdAt),
      ('Size atandı', item.assignedAt),
      ('Restorandan teslim alındı', item.pickedUpAt),
      ('Müşteriye teslim edildi', item.deliveredAt),
    ].where((s) => s.$2 != null).toList();

    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
      children: [
        Center(
          child: Container(
            width: 42,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Teslimat Detayı',
                    style: AppTextStyles.caption.copyWith(color: AppColors.onSurfaceVariant, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          code,
                          style: AppTextStyles.titleMedium.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppColors.onSurface,
                            fontSize: 20,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        tooltip: 'Kodu kopyala',
                        visualDensity: VisualDensity.compact,
                        icon: Icon(Icons.copy_rounded, size: 18, color: AppColors.onSurfaceVariant),
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: code));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Sipariş kodu kopyalandı'),
                              duration: Duration(seconds: 1),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('Kazancınız', style: AppTextStyles.caption.copyWith(color: AppColors.secondary, fontSize: 10)),
                  Text(
                    '+${_money(item.earning)}',
                    style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w900, color: AppColors.secondary),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _Section(
          title: 'RESTORAN',
          icon: Icons.storefront_rounded,
          rows: [
            _Row('Restoran', item.merchantName ?? '—'),
            if (item.pickupAddress != null) _Row('Alım adresi', item.pickupAddress!),
          ],
        ),
        _Section(
          title: 'MÜŞTERİ & TESLİMAT',
          icon: Icons.person_pin_circle_rounded,
          rows: [
            _Row('Alıcı', item.recipientName.isEmpty ? '—' : item.recipientName),
            if (item.recipientPhoneMasked != null) _Row('Telefon', item.recipientPhoneMasked!),
            _Row('Teslimat adresi', item.deliveryAddressFull ?? item.deliveryAddress),
            if (item.notes != null) _Row('Sipariş notu', item.notes!),
            if (item.distanceKm != null) _Row('Mesafe', '${item.distanceKm!.toStringAsFixed(1)} km'),
          ],
        ),
        _Section(
          title: 'ÖDEME',
          icon: Icons.payments_rounded,
          rows: [
            _Row('Ödeme türü', _paymentLabel(item.paymentMethod)),
            _Row('Sipariş tutarı', _money(item.totalOrderAmount)),
            _Row('Hakedişiniz', _money(item.earning)),
          ],
        ),
        if (steps.isNotEmpty)
          _Section(
            title: 'ZAMAN ÇİZELGESİ',
            icon: Icons.timeline_rounded,
            rows: [
              for (final s in steps) _Row(s.$1, '${_date(s.$2!)}  ${_time(s.$2!)}'),
              if (item.pickedUpAt != null)
                _Row('Teslimat süresi', _duration(item.pickedUpAt!, item.deliveredAt)),
              if (item.createdAt != null)
                _Row('Toplam süre', _duration(item.createdAt!, item.deliveredAt)),
            ],
          ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Kapat')),
        ),
      ],
    );
  }
}

class _Row {
  const _Row(this.label, this.value);
  final String label;
  final String value;
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.icon, required this.rows});

  final String title;
  final IconData icon;
  final List<_Row> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: AppColors.primaryContainer),
              const SizedBox(width: 6),
              Text(
                title,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  fontSize: 10.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (final r in rows)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 112,
                    child: Text(
                      r.label,
                      style: AppTextStyles.caption.copyWith(color: AppColors.onSurfaceVariant, fontSize: 12),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      r.value,
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
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
}
