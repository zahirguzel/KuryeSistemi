import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/courier_profile_model.dart';
import '../repositories/profile_repository.dart';

enum ProfileStatus { initial, loading, loaded, error }

class ProfileState {
  const ProfileState({
    this.status = ProfileStatus.initial,
    this.profile,
    this.errorMessage,
    this.isRefreshing = false,
  });

  final ProfileStatus status;
  final CourierProfileModel? profile;
  final String? errorMessage;
  final bool isRefreshing;

  bool get isLoading => status == ProfileStatus.loading;
  bool get isLoaded => status == ProfileStatus.loaded;
  bool get isError => status == ProfileStatus.error;

  factory ProfileState.initial() => const ProfileState(status: ProfileStatus.initial);

  ProfileState copyWith({
    ProfileStatus? status,
    CourierProfileModel? profile,
    String? errorMessage,
    bool? isRefreshing,
  }) {
    return ProfileState(
      status: status ?? this.status,
      profile: profile ?? this.profile,
      errorMessage: errorMessage,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }
}

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  final storageService = ref.watch(secureStorageProvider);
  return ProfileRepository(dioClient, storageService);
});

class ProfileNotifier extends Notifier<ProfileState> {
  ProfileRepository get _repository => ref.read(profileRepositoryProvider);

  @override
  ProfileState build() {
    Future.microtask(() => fetchProfile());
    return ProfileState.initial();
  }

  /// Profil ve Kasa Durumunu Getir
  Future<void> fetchProfile({bool isRefresh = false}) async {
    if (isRefresh) {
      state = state.copyWith(isRefreshing: true);
    } else {
      state = state.copyWith(status: ProfileStatus.loading);
    }

    try {
      final profile = await _repository.getProfile();
      if (profile != null) {
        state = state.copyWith(
          status: ProfileStatus.loaded,
          profile: profile,
          isRefreshing: false,
          errorMessage: null,
        );
      } else {
        state = state.copyWith(
          status: ProfileStatus.error,
          isRefreshing: false,
          errorMessage: 'Profil bilgileri yüklenemedi.',
        );
      }
    } catch (e) {
      state = state.copyWith(
        status: ProfileStatus.error,
        isRefreshing: false,
        errorMessage: 'Profil verisi alınırken hata: $e',
      );
    }
  }
}

final profileProvider =
    NotifierProvider<ProfileNotifier, ProfileState>(ProfileNotifier.new);
