import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Operasyonel Ağ Rozeti — Firma bazlı dinamik bölge bilgisi
class OperationalNetworkBadge extends StatelessWidget {
  const OperationalNetworkBadge({
    super.key,
    this.regionText,
  });

  final String? regionText;

  @override
  Widget build(BuildContext context) {
    final text = (regionText != null && regionText!.trim().isNotEmpty)
        ? regionText!
        : 'Merkez Operasyon';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.secondary.withValues(alpha: 0.2),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(
                Icons.satellite_alt_outlined,
                color: AppColors.secondary,
                size: 16,
              ),
              const SizedBox(width: 6),
              Text(
                'AKTİF SAHA AĞI',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.secondary,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  fontSize: 11,
                ),
              ),
            ],
          ),
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.onSurfaceVariant,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
