import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';
import 'transaction_list_item.dart';

/// Son Teslimat ve Ödemeler Listesi (TransactionHistoryList)
/// HTML: div.flex.flex-col.space-y-inset-sm
class TransactionHistoryList extends StatelessWidget {
  const TransactionHistoryList({
    super.key,
    this.onViewAllTap,
  });

  final VoidCallback? onViewAllTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Liste Başlığı & Tümünü Gör ─────────────────────────────────────
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Text(
                  'Son Teslimat ve Ödemeler',
                  style: AppTextStyles.headlineSm.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                    fontSize: 15.5,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '5 İşlem',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                      fontSize: 10.5,
                    ),
                  ),
                ),
              ],
            ),
            TextButton(
              onPressed: onViewAllTap ??
                  () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Tüm geçmiş işlemler yükleniyor...')),
                    );
                  },
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'Tümünü Gör',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.tertiary,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // ── İşlem Kartları ────────────────────────────────────────────────
        TransactionListItem(
          title: 'Burger & Co.',
          time: '• 14:20',
          subtitle: '#KS-8941',
          badgeText: '+₺20 Nakit Bahşiş',
          amount: '+₺65,00',
          status: 'Tamamlandı',
          icon: Icons.delivery_dining_rounded,
          iconColor: AppColors.secondary,
          onTap: () {},
        ),
        const SizedBox(height: 8),

        TransactionListItem(
          title: 'Napoli Pizza',
          time: '• 13:05',
          subtitle: '#KS-8938',
          amount: '+₺52,00',
          status: 'Tamamlandı',
          icon: Icons.local_pizza_rounded,
          iconColor: AppColors.secondary,
          onTap: () {},
        ),
        const SizedBox(height: 8),

        TransactionListItem(
          title: 'Kahve Dünyası',
          time: '• 11:45',
          subtitle: '#KS-8930',
          amount: '+₺45,00',
          status: 'Tamamlandı',
          icon: Icons.local_cafe_rounded,
          iconColor: AppColors.secondary,
          onTap: () {},
        ),
        const SizedBox(height: 8),

        // Hakediş Banka Transferi (Eksi bakiye / çekim)
        TransactionListItem(
          title: 'Hakediş Transferi',
          time: '',
          subtitle: 'Garanti BBVA • Dün 17:00',
          amount: '-₺3.200,00',
          status: 'Banka Transferi',
          icon: Icons.account_balance_rounded,
          iconColor: AppColors.tertiary,
          iconBgColor: AppColors.tertiaryContainer.withValues(alpha: 0.22),
          isNegative: true,
          onTap: () {},
        ),
        const SizedBox(height: 8),

        TransactionListItem(
          title: 'Sushi Bar',
          time: '• Dün 21:10',
          subtitle: '#KS-8912',
          amount: '+₺78,00',
          status: 'Tamamlandı',
          icon: Icons.set_meal_rounded,
          iconColor: AppColors.secondary,
          onTap: () {},
        ),
      ],
    );
  }
}
