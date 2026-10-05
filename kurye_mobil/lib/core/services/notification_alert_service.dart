import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';
import '../storage/secure_storage_service.dart';

/// Global ScaffoldMessengerKey - Herhangi bir ekranda bildirim afişi (Banner/SnackBar) gösterebilmek için
final GlobalKey<ScaffoldMessengerState> rootScaffoldMessengerKey =
    GlobalKey<ScaffoldMessengerState>();

/// Sesli ve Titreşimli Kurye Bildirim Servisi (NotificationAlertService)
class NotificationAlertService {
  NotificationAlertService(this._storageService);

  final SecureStorageService _storageService;
  static const MethodChannel _channel = MethodChannel('com.kuryesistemi.kurye_mobil/alert');

  /// Yeni sipariş düştüğünde ses ve titreşim uyarısı tetikler
  Future<void> triggerNewOrderAlert({
    String title = '🔔 YENİ SİPARİŞ DÜŞTÜ!',
    String message = 'Havuza yeni bir teslimat paketi eklendi.',
  }) async {
    final isSoundEnabled = await _storageService.getSoundNotificationEnabled();
    final isVibrationEnabled = await _storageService.getVibrationNotificationEnabled();

    debugPrint(
      '[NotificationAlertService] Yeni sipariş alarmı tetiklendi. '
      'Ses: $isSoundEnabled, Titreşim: $isVibrationEnabled',
    );

    // 1. Native Donanım Uyarısı (RingtoneManager & Vibrator Motor)
    _triggerHardwareAlert(sound: isSoundEnabled, vibrate: isVibrationEnabled);

    // 2. Ekran üstü anlık afiş (In-App Floating Banner)
    _showInAppBanner(title: title, message: message);
  }

  /// Ayarlar ekranından sesi ve titreşimi test etmek için metot
  Future<void> triggerTestAlert() async {
    final isSoundEnabled = await _storageService.getSoundNotificationEnabled();
    final isVibrationEnabled = await _storageService.getVibrationNotificationEnabled();

    debugPrint(
      '[NotificationAlertService] Test alarmı tetiklendi. '
      'Ses: $isSoundEnabled, Titreşim: $isVibrationEnabled',
    );

    // 1. Native Donanım Uyarısı
    _triggerHardwareAlert(sound: isSoundEnabled, vibrate: isVibrationEnabled);

    _showInAppBanner(
      title: '🔊 Test Bildirimi',
      message: 'Ses ve titreşim uyarısı telefonunuza başarıyla gönderildi.',
      duration: const Duration(seconds: 3),
    );
  }

  /// Native Android donanım uyarısını tetikler (Zil sesi & Titreşim motoru)
  void _triggerHardwareAlert({required bool sound, required bool vibrate}) {
    Future.microtask(() async {
      try {
        if (sound && vibrate) {
          await _channel.invokeMethod('playAlert');
        } else if (sound) {
          await _channel.invokeMethod('playSound');
        } else if (vibrate) {
          await _channel.invokeMethod('vibrate');
        }
      } catch (e) {
        debugPrint('[NotificationAlertService] Native kanal uyarısı fallback moduna geçti: $e');
        if (vibrate) _playVibrationPatternFallback();
        if (sound) _playSoundAlertFallback();
      }
    });
  }

  /// Fallback Titreşim (Haptic)
  void _playVibrationPatternFallback() {
    Future.microtask(() async {
      try {
        await HapticFeedback.heavyImpact();
        await Future.delayed(const Duration(milliseconds: 180));
        await HapticFeedback.heavyImpact();
        await Future.delayed(const Duration(milliseconds: 180));
        await HapticFeedback.vibrate();
      } catch (e) {
        debugPrint('[NotificationAlertService] Fallback titreşim hatası: $e');
      }
    });
  }

  /// Fallback Ses (SystemSound)
  void _playSoundAlertFallback() {
    Future.microtask(() async {
      try {
        await SystemSound.play(SystemSoundType.alert);
        await Future.delayed(const Duration(milliseconds: 250));
        await SystemSound.play(SystemSoundType.alert);
      } catch (e) {
        debugPrint('[NotificationAlertService] Fallback ses hatası: $e');
      }
    });
  }

  /// Uygulama içi şık bildirim kartı
  void _showInAppBanner({
    required String title,
    required String message,
    Duration duration = const Duration(seconds: 4),
  }) {
    final messenger = rootScaffoldMessengerKey.currentState;
    if (messenger == null) return;

    messenger.removeCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        duration: duration,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: AppColors.primaryContainer,
            width: 1.5,
          ),
        ),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 8,
        content: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primaryContainer.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.notifications_active_rounded,
                color: AppColors.primaryContainer,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryContainer,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    message,
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 12,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
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

final notificationAlertServiceProvider = Provider<NotificationAlertService>((ref) {
  final storageService = ref.watch(secureStorageProvider);
  return NotificationAlertService(storageService);
});
