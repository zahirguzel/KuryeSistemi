import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Kullanılabilir Bakiye & Hakediş Kartı (WalletBalanceCard)
/// HTML: div.rounded-xl.bg-gradient-to-br.from-surface-container-high...
class WalletBalanceCard extends StatefulWidget {
  const WalletBalanceCard({
    super.key,
    this.periodText = 'Hakediş Dönemi: 1-15 Ekim',
    this.statusText = 'ONAYLANDI',
    this.balanceAmount = '₺4.850,50',
    this.growthPercentage = '+18.4%',
    this.pendingTip = '₺280,00',
    this.weeklyKm = '146 km',
    this.onStatementTap,
  });

  final String periodText;
  final String statusText;
  final String balanceAmount;
  final String growthPercentage;
  final String pendingTip;
  final String weeklyKm;
  final VoidCallback? onStatementTap;

  @override
  State<WalletBalanceCard> createState() => _WalletBalanceCardState();
}

class _WalletBalanceCardState extends State<WalletBalanceCard>
    with SingleTickerProviderStateMixin {
  // FAST Para Çekme Butonu Durumu: 0 = idle, 1 = loading, 2 = success
  int _withdrawState = 0;
  late final AnimationController _spinController;

  @override
  void initState() {
    super.initState();
    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
  }

  @override
  void dispose() {
    _spinController.dispose();
    super.dispose();
  }

  void _handleWithdrawTap() {
    if (_withdrawState != 0) return;
    HapticFeedback.mediumImpact();
    setState(() => _withdrawState = 1);
    _spinController.repeat();

    Future.delayed(const Duration(milliseconds: 1400), () {
      if (mounted) {
        _spinController.stop();
        setState(() => _withdrawState = 2);
        HapticFeedback.heavyImpact();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: AppColors.secondary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${widget.balanceAmount} FAST transferi IBAN hesabınıza yönlendirildi.',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            backgroundColor: AppColors.surfaceContainerHighest,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.surfaceContainerHigh,
            AppColors.surfaceContainer,
            AppColors.surfaceContainerLowest,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.45),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(
          color: AppColors.surfaceBright.withValues(alpha: 0.35),
          width: 0.8,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            // ── Dekoratif Arka Plan Parıltıları ────────────────────────────
            Positioned(
              top: -40,
              right: -40,
              child: Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primaryContainer.withValues(alpha: 0.15),
                ),
              ),
            ),
            Positioned(
              bottom: -30,
              left: -30,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.secondary.withValues(alpha: 0.08),
                ),
              ),
            ),
            // Cüzdan Arka Plan Silüeti
            Positioned(
              right: 8,
              bottom: 4,
              child: Icon(
                Icons.account_balance_wallet_rounded,
                size: 110,
                color: AppColors.primaryFixed.withValues(alpha: 0.04),
              ),
            ),

            // ── Kart İçeriği ───────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Üst Meta Rozetler (Dönem & Onay)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerHighest.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.event_note_rounded,
                              size: 14,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              widget.periodText,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.secondary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: AppColors.secondary.withValues(alpha: 0.25),
                            width: 0.8,
                          ),
                        ),
                        child: Row(
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
                              widget.statusText,
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
                  const SizedBox(height: 16),

                  // 2. Bakiye Değeri
                  Text(
                    'KULLANILABİLİR BAKİYE',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.onSurfaceVariant.withValues(alpha: 0.8),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.0,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        widget.balanceAmount,
                        style: AppTextStyles.headlineXl.copyWith(
                          color: AppColors.onSurface,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.8,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Row(
                        children: [
                          const Icon(
                            Icons.trending_up_rounded,
                            size: 18,
                            color: AppColors.secondary,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            widget.growthPercentage,
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.secondary,
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 3. Kart İçi 2'li Metrikler (Bekleyen Bahşiş / Haftalık KM)
                  Row(
                    children: [
                      Expanded(
                        child: _MetricTile(
                          icon: Icons.payments_rounded,
                          iconColor: AppColors.secondary,
                          iconBgColor: AppColors.secondaryContainer.withValues(alpha: 0.2),
                          label: 'Bekleyen Bahşiş',
                          value: widget.pendingTip,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _MetricTile(
                          icon: Icons.electric_moped_rounded,
                          iconColor: AppColors.primary,
                          iconBgColor: AppColors.primaryContainer.withValues(alpha: 0.2),
                          label: 'Haftalık KM',
                          value: widget.weeklyKm,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 4. Ana Aksiyon Butonları
                  // FAST Para Çek Butonu
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: _handleWithdrawTap,
                      borderRadius: BorderRadius.circular(14),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        height: 52,
                        decoration: BoxDecoration(
                          color: _withdrawState == 2
                              ? AppColors.secondary
                              : AppColors.primaryContainer,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: (_withdrawState == 2
                                      ? AppColors.secondary
                                      : AppColors.primaryContainer)
                                  .withValues(alpha: 0.35),
                              blurRadius: 14,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (_withdrawState == 1)
                              AnimatedBuilder(
                                animation: _spinController,
                                builder: (context, child) {
                                  return Transform.rotate(
                                    angle: _spinController.value * 2 * math.pi,
                                    child: const Icon(
                                      Icons.sync_rounded,
                                      size: 22,
                                      color: AppColors.onPrimaryContainer,
                                    ),
                                  );
                                },
                              )
                            else if (_withdrawState == 2)
                              const Icon(
                                Icons.check_circle_rounded,
                                size: 22,
                                color: AppColors.onSecondary,
                              )
                            else
                              const Icon(
                                Icons.bolt_rounded,
                                size: 22,
                                color: AppColors.onPrimaryContainer,
                              ),
                            const SizedBox(width: 8),
                            Text(
                              _withdrawState == 1
                                  ? 'FAST İşlemi Başlatılıyor...'
                                  : _withdrawState == 2
                                      ? 'Talep Alındı (${widget.balanceAmount})'
                                      : 'Hemen Para Çek (FAST)',
                              style: AppTextStyles.labelAction.copyWith(
                                color: _withdrawState == 2
                                    ? AppColors.onSecondary
                                    : AppColors.onPrimaryContainer,
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Hesap Hareketleri Özeti Butonu
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: widget.onStatementTap ??
                          () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Hesap dökümü PDF olarak hazırlanıyor...'),
                              ),
                            );
                          },
                      borderRadius: BorderRadius.circular(12),
                      child: Ink(
                        height: 46,
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerHigh.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppColors.surfaceBright.withValues(alpha: 0.3),
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.receipt_long_rounded,
                              size: 19,
                              color: AppColors.tertiary,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Hesap Hareketleri Özeti',
                              style: AppTextStyles.headlineSm.copyWith(
                                color: AppColors.onSurface,
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHighest.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: iconBgColor,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 11,
                  ),
                ),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.headlineSm.copyWith(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
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
