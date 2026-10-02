import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Giriş Formu Alan Bileşeni.
/// HTML: h-14 bg-surface-container rounded-xl focus:shadow-[0_0_0_2px_#ff6b00]
class LoginInputField extends StatelessWidget {
  const LoginInputField({
    super.key,
    required this.label,
    required this.hint,
    required this.hint2,
    required this.icon,
    this.isPassword = false,
    this.obscureText = false,
    this.onTogglePassword,
    this.controller,
    this.keyboardType,
  });

  final String label;
  final String hint;
  final String hint2;
  final IconData icon;
  final bool isPassword;
  final bool obscureText;
  final VoidCallback? onTogglePassword;
  final TextEditingController? controller;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: AppTextStyles.labelStatus.copyWith(
                color: AppColors.onSurface,
              ),
            ),
            Text(
              hint2,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.onSurfaceVariant,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        // Input field
        SizedBox(
          height: 56, // h-14
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              TextFormField(
                controller: controller,
                obscureText: isPassword && obscureText,
                keyboardType: keyboardType,
                style: AppTextStyles.bodyLg.copyWith(
                  color: AppColors.onSurface,
                ),
                decoration: InputDecoration(
                  hintText: hint,
                  contentPadding: EdgeInsets.only(
                    left: 48,
                    right: isPassword ? 48 : 16,
                    top: 18,
                    bottom: 18,
                  ),
                ),
              ),
              // Left icon
              Positioned(
                left: 14,
                child: Icon(
                  icon,
                  color: AppColors.onSurfaceVariant,
                  size: 22,
                ),
              ),
              // Password toggle button
              if (isPassword)
                Positioned(
                  right: 4,
                  child: IconButton(
                    onPressed: onTogglePassword,
                    icon: Icon(
                      obscureText
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      color: AppColors.onSurfaceVariant,
                      size: 22,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
