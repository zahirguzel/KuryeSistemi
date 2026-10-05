import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../repositories/support_repository.dart';

final supportRepositoryProvider = Provider<SupportRepository>((ref) {
  return SupportRepository(ref.watch(dioClientProvider));
});

/// Firmanın dispeçer telefonu; her açılışta güncel okunur.
final supportInfoProvider = FutureProvider.autoDispose<SupportInfo>((ref) {
  return ref.watch(supportRepositoryProvider).getSupportInfo();
});
