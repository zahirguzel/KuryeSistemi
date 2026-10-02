import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Alt sekmeler arası gezinme Notifier'ı (Riverpod 3.x Notifier)
/// 0: Kokpit (Ana Sayfa)
/// 1: Canlı Harita
/// 2: Cüzdan / Hakediş
class CurrentTabNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void setTab(int index) {
    state = index;
  }
}

final currentTabProvider = NotifierProvider<CurrentTabNotifier, int>(CurrentTabNotifier.new);
