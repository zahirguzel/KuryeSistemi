import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../features/location/providers/location_provider.dart';
import '../../features/support/providers/support_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Acil durum (SOS) penceresi: not + konumla dispeçere çağrı gönderir, dispeçeri aramaya olanak tanır.
Future<void> showSosDialog(BuildContext context) {
  return showDialog<void>(
    context: context,
    barrierDismissible: true,
    builder: (_) => const _SosDialog(),
  );
}

class _SosDialog extends ConsumerStatefulWidget {
  const _SosDialog();

  @override
  ConsumerState<_SosDialog> createState() => _SosDialogState();
}

class _SosDialogState extends ConsumerState<_SosDialog> {
  final _noteController = TextEditingController();
  bool _sending = false;
  String? _resultMessage;
  bool _resultOk = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    setState(() {
      _sending = true;
      _resultMessage = null;
    });

    // Canlı konum biliniyorsa gönder; değilse sunucu son bilinen konumu kullanır
    final loc = ref.read(locationProvider);
    final hasFix = loc.hasRealGpsFix;

    final result = await ref.read(supportRepositoryProvider).sendSos(
          note: _noteController.text,
          latitude: hasFix ? loc.latitude : null,
          longitude: hasFix ? loc.longitude : null,
        );

    if (!mounted) return;
    setState(() {
      _sending = false;
      _resultOk = result.success;
      _resultMessage = result.message;
    });
  }

  Future<void> _call(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone.replaceAll(RegExp(r'[^0-9+]'), ''));
    try {
      await launchUrl(uri);
    } catch (_) {
      if (mounted) {
        setState(() {
          _resultOk = false;
          _resultMessage = 'Arama başlatılamadı. Numara: $phone';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final support = ref.watch(supportInfoProvider);
    final phone = support.asData?.value.hasPhone == true ? support.asData!.value.dispatcherPhone : null;

    return AlertDialog(
      backgroundColor: AppColors.surfaceContainerHigh,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      title: Row(
        children: [
          Icon(Icons.sos_rounded, color: AppColors.error, size: 28),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Acil Durum Bildir',
              style: AppTextStyles.titleMedium.copyWith(fontWeight: FontWeight.w800, color: AppColors.onSurface),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Kaza, araç arızası, saldırı veya sağlık sorunu gibi acil durumlarda dispeçere anlık bildirim gönderilir. '
              'Konumunuz çağrıyla birlikte iletilir.',
              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurfaceVariant, fontSize: 13),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _noteController,
              enabled: !_sending && !_resultOk,
              maxLength: 300,
              maxLines: 2,
              style: TextStyle(color: AppColors.onSurface),
              decoration: const InputDecoration(
                hintText: 'Kısa not (isteğe bağlı): ne oldu?',
                counterText: '',
              ),
            ),
            if (_resultMessage != null) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (_resultOk ? AppColors.secondary : AppColors.error).withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _resultMessage!,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: _resultOk ? AppColors.secondary : AppColors.error,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
            if (phone != null) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => _call(phone),
                icon: const Icon(Icons.phone_in_talk_rounded),
                label: Text('Dispeçeri Ara  $phone'),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _sending ? null : () => Navigator.pop(context),
          child: Text(_resultOk ? 'Kapat' : 'Vazgeç'),
        ),
        if (!_resultOk)
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: AppColors.onError,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: _sending ? null : _send,
            icon: _sending
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.warning_amber_rounded),
            label: Text(_sending ? 'Gönderiliyor...' : 'ACİL ÇAĞRI GÖNDER'),
          ),
      ],
    );
  }
}
