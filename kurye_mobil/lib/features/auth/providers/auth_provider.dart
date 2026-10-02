import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/auth_response_model.dart';
import '../repositories/auth_repository.dart';

/// Kimlik Doğrulama Durumları
enum AuthStatus { initial, loading, authenticated, error }

/// Uygulama Kimlik Doğrulama Durumu (AuthState)
class AuthState {
  const AuthState({
    this.status = AuthStatus.initial,
    this.authResponse,
    this.errorMessage,
  });

  final AuthStatus status;
  final AuthResponseModel? authResponse;
  final String? errorMessage;

  bool get isLoading => status == AuthStatus.loading;
  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isError => status == AuthStatus.error;

  factory AuthState.initial() => const AuthState(status: AuthStatus.initial);

  factory AuthState.loading() => const AuthState(status: AuthStatus.loading);

  factory AuthState.authenticated(AuthResponseModel authResponse) =>
      AuthState(status: AuthStatus.authenticated, authResponse: authResponse);

  factory AuthState.error(String message) =>
      AuthState(status: AuthStatus.error, errorMessage: message);

  AuthState copyWith({
    AuthStatus? status,
    AuthResponseModel? authResponse,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      authResponse: authResponse ?? this.authResponse,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// ─── Core Service Providers ───────────────────────────────────────────────

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final dioClientProvider = Provider<DioClient>((ref) {
  final storageService = ref.watch(secureStorageProvider);
  return DioClient(storageService);
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return AuthRepository(dioClient);
});

// ─── Auth Notifier (Modern Riverpod Notifier) ─────────────────────────────

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    _checkSavedSession();
    return AuthState.initial();
  }

  SecureStorageService get _storageService => ref.read(secureStorageProvider);
  AuthRepository get _authRepository => ref.read(authRepositoryProvider);

  /// Cihazda kayıtlı geçerli bir oturum var mı kontrol et
  Future<void> _checkSavedSession() async {
    try {
      final hasToken = await _storageService.hasToken();
      if (hasToken) {
        final token = await _storageService.getToken();
        final merchantId = await _storageService.getMerchantId() ?? '';
        final merchantName = await _storageService.getMerchantName() ?? '';
        final email = await _storageService.getEmail() ?? '';
        final courierId = await _storageService.getCourierId();

        if (token != null && token.isNotEmpty) {
          state = AuthState.authenticated(
            AuthResponseModel(
              token: token,
              merchantId: merchantId,
              merchantName: merchantName,
              email: email,
              courierId: courierId,
            ),
          );
        }
      }
    } catch (_) {
      // Sessizce geç, başlangıç durumunda kal
    }
  }

  /// Kullanıcı Girişi Yap
  Future<void> login(String email, String password) async {
    state = AuthState.loading();
    try {
      final response = await _authRepository.login(
        email: email,
        password: password,
      );

      // JWT Token ve kullanıcı verilerini güvenli depoya kaydet
      await _storageService.saveToken(response.token);
      await _storageService.saveUserData(
        merchantId: response.merchantId,
        merchantName: response.merchantName,
        email: response.email,
        courierId: response.courierId,
      );

      state = AuthState.authenticated(response);
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  /// Çıkış Yap
  Future<void> logout() async {
    await _storageService.clearAll();
    state = AuthState.initial();
  }
}

/// Uygulama Genelinde Kullanılacak Auth Provider
final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
