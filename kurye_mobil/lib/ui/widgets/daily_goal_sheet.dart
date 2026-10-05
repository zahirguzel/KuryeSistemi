import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/settings/providers/settings_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_styles.dart';

/// Günlük teslimat hedefini belirleme alt sayfası (ana ekran ve ayarlardan açılır).
Future<void> showDailyGoalSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surfaceContainerHigh,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => const _DailyGoalSheet(),
  );
}

class _DailyGoalSheet extends ConsumerStatefulWidget {
  const _DailyGoalSheet();

  @override
  ConsumerState<_DailyGoalSheet> createState() => _DailyGoalSheetState();
}

class _DailyGoalSheetState extends ConsumerState<_DailyGoalSheet> {
  static const _quickGoals = [10, 15, 20, 30, 40, 50];
  late int _goal;

  @override
  void initState() {
    super.initState();
    _goal = ref.read(dailyGoalProvider);
  }

  void _set(int value) {
    setState(() => _goal = value.clamp(DailyGoalNotifier.minGoal, DailyGoalNotifier.maxGoal));
  }

  Future<void> _save() async {
    await ref.read(dailyGoalProvider.notifier).setGoal(_goal);
    if (!mounted) return;
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Günlük hedef $_goal paket olarak ayarlandı.'),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Günlük Teslimat Hedefi',
              style: AppTextStyles.titleMedium.copyWith(fontWeight: FontWeight.w800, color: AppColors.onSurface),
            ),
            const SizedBox(height: 4),
            Text(
              'Ana ekrandaki ilerleme çubuğu bu hedefe göre hesaplanır.',
              style: AppTextStyles.caption.copyWith(color: AppColors.onSurfaceVariant),
            ),
            const SizedBox(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton.filledTonal(
                  onPressed: _goal > DailyGoalNotifier.minGoal ? () => _set(_goal - 1) : null,
                  icon: const Icon(Icons.remove_rounded),
                ),
                const SizedBox(width: 20),
                Column(
                  children: [
                    Text(
                      '$_goal',
                      style: AppTextStyles.headlineLg.copyWith(
                        fontWeight: FontWeight.w900,
                        fontSize: 44,
                        color: AppColors.primaryContainer,
                      ),
                    ),
                    Text('paket / gün', style: AppTextStyles.caption.copyWith(color: AppColors.onSurfaceVariant)),
                  ],
                ),
                const SizedBox(width: 20),
                IconButton.filledTonal(
                  onPressed: _goal < DailyGoalNotifier.maxGoal ? () => _set(_goal + 1) : null,
                  icon: const Icon(Icons.add_rounded),
                ),
              ],
            ),
            Slider(
              value: _goal.toDouble().clamp(5, 100),
              min: 5,
              max: 100,
              divisions: 95,
              label: '$_goal',
              onChanged: (v) => _set(v.round()),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                for (final g in _quickGoals)
                  ChoiceChip(
                    label: Text('$g'),
                    selected: _goal == g,
                    onSelected: (_) => _set(g),
                  ),
              ],
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryContainer,
                  foregroundColor: AppColors.onPrimaryContainer,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _save,
                child: const Text('Hedefi Kaydet', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
