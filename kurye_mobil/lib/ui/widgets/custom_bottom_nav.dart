import 'dart:ui';
import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Alt Gezinme Çubuğu (Custom Bottom Navigation Bar)
/// HTML: nav.fixed.bottom-0.w-full.bg-surface-container-lowest/90.backdrop-blur-xl
class CustomBottomNav extends StatelessWidget {
  const CustomBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  static const List<_NavItemData> _items = [
    _NavItemData(icon: Icons.home_rounded, label: 'Ana Sayfa'),
    _NavItemData(icon: Icons.near_me_rounded, label: 'Harita'),
    _NavItemData(icon: Icons.account_balance_wallet_rounded, label: 'Cüzdan'),
    _NavItemData(icon: Icons.person_rounded, label: 'Profil'),
  ];

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerLowest.withValues(alpha: 0.92),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.4),
                blurRadius: 16,
                offset: const Offset(0, -4),
              ),
            ],
            border: Border(
              top: BorderSide(
                color: AppColors.surfaceBright.withValues(alpha: 0.3),
                width: 0.5,
              ),
            ),
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: 64,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(_items.length, (index) {
                  final item = _items[index];
                  final isSelected = index == currentIndex;

                  return Expanded(
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => onTap(index),
                        splashColor: AppColors.primaryContainer.withValues(alpha: 0.15),
                        highlightColor: Colors.transparent,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: EdgeInsets.all(isSelected ? 2 : 0),
                              child: Icon(
                                item.icon,
                                size: 26,
                                color: isSelected
                                    ? AppColors.primaryContainer
                                    : AppColors.onSurfaceVariant.withValues(alpha: 0.7),
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              item.label.toUpperCase(),
                              style: AppTextStyles.caption.copyWith(
                                fontSize: 10,
                                fontWeight: isSelected
                                    ? FontWeight.w700
                                    : FontWeight.w600,
                                letterSpacing: 0.6,
                                color: isSelected
                                    ? AppColors.primaryContainer
                                    : AppColors.onSurfaceVariant.withValues(alpha: 0.7),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItemData {
  const _NavItemData({required this.icon, required this.label});
  final IconData icon;
  final String label;
}
