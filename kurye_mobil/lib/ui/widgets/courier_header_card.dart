import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Üst Bilgi Kartı — "Hoş geldin, Ahmet 👋" + canlı saat + rozet + puan.
/// HTML: section.flex-col.gap-inset-xs.pt-2
class CourierHeaderCard extends StatefulWidget {
  const CourierHeaderCard({
    super.key,
    this.courierName = 'Ahmet',
    this.rank = 'Kıdemli Kurye',
    this.rating = '4.98',
  });

  final String courierName;
  final String rank;
  final String rating;

  @override
  State<CourierHeaderCard> createState() => _CourierHeaderCardState();
}

class _CourierHeaderCardState extends State<CourierHeaderCard> {
  late Timer _timer;
  late String _timeString;

  @override
  void initState() {
    super.initState();
    _timeString = _formattedTime();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() => _timeString = _formattedTime());
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _formattedTime() {
    final now = DateTime.now();
    final h = now.hour.toString().padLeft(2, '0');
    final m = now.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Greeting + Clock row ───────────────────────────────────────────
        Row(
          children: [
            Expanded(
              child: Text(
                'Hoş geldin, ${widget.courierName} 👋',
                style: AppTextStyles.headlineMd,
              ),
            ),
            const SizedBox(width: 8),
            // Live clock pill
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(99),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.schedule_outlined,
                    color: AppColors.tertiary,
                    size: 16,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _timeString,
                    style: AppTextStyles.caption.copyWith(
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.0,
                      color: AppColors.onSurface,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        // ── Badge row ──────────────────────────────────────────────────────
        Row(
          children: [
            // Kıdemli Kurye badge
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(99),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.workspace_premium,
                    color: AppColors.primary,
                    size: 16,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    widget.rank,
                    style: AppTextStyles.caption.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryFixed,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Star rating badge
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(99),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.star_rounded,
                    color: Color(0xFFFBBF24), // amber-400
                    size: 14,
                  ),
                  const SizedBox(width: 3),
                  Text(
                    widget.rating,
                    style: AppTextStyles.caption.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}
