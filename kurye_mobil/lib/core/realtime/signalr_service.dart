import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:signalr_netcore/signalr_client.dart';
import '../config/api_config.dart';
import '../storage/secure_storage_service.dart';

/// SignalR Bağlantı Durumu
enum SignalRConnectionStatus {
  disconnected,
  connecting,
  connected,
  reconnecting,
}

/// Merkezi SignalR Canlı Konum ve İletişim Servisi
/// Backend LocationHub (/hubs/location) ile gerçek zamanlı WebSocket bağlantısını yönetir.
class SignalRService {
  SignalRService(this._storageService, {String? customHubUrl}) {
    _hubUrl = customHubUrl ?? ApiConfig.hubUrl;
  }

  final SecureStorageService _storageService;
  late final String _hubUrl;

  HubConnection? _hubConnection;
  final _statusController = StreamController<SignalRConnectionStatus>.broadcast();
  SignalRConnectionStatus _currentStatus = SignalRConnectionStatus.disconnected;

  final _orderUpdatesController = StreamController<Map<String, dynamic>>.broadcast();

  SignalRConnectionStatus get currentStatus => _currentStatus;
  Stream<SignalRConnectionStatus> get statusStream => _statusController.stream;

  /// Sunucudan gelen sipariş durum ve yeni paket bildirim akışı
  Stream<Map<String, dynamic>> get orderUpdatesStream => _orderUpdatesController.stream;

  void _updateStatus(SignalRConnectionStatus status) {
    if (_currentStatus != status) {
      _currentStatus = status;
      _statusController.add(status);
      debugPrint('[SignalRService] Durum değişti: $status');
    }
  }

  Timer? _reconnectTimer;
  bool _isDisposed = false;

  void _scheduleReconnect() {
    if (_isDisposed) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 4), () {
      if (!_isDisposed && _currentStatus == SignalRConnectionStatus.disconnected) {
        debugPrint('[SignalRService] Otomatik yeniden bağlanma deneniyor...');
        connect();
      }
    });
  }

  /// Hub Bağlantısını Başlat
  Future<void> connect() async {
    if (_isDisposed) return;
    if (_currentStatus == SignalRConnectionStatus.connected ||
        _currentStatus == SignalRConnectionStatus.connecting) {
      return;
    }

    _reconnectTimer?.cancel();
    _updateStatus(SignalRConnectionStatus.connecting);

    try {
      final token = await _storageService.getToken();
      if (token == null || token.isEmpty) {
        debugPrint('[SignalRService] JWT Token bulunamadı. Kullanıcı giriş yapınca bağlanılacak.');
        _updateStatus(SignalRConnectionStatus.disconnected);
        _scheduleReconnect();
        return;
      }

      final httpOptions = HttpConnectionOptions(
        accessTokenFactory: () async {
          final t = await _storageService.getToken();
          return t ?? '';
        },
      );

      _hubConnection = HubConnectionBuilder()
          .withUrl(_hubUrl, options: httpOptions)
          .withAutomaticReconnect(retryDelays: [0, 2000, 5000, 10000, 30000])
          .build();

      _hubConnection!.onclose(({error}) {
        debugPrint('[SignalRService] Bağlantı kapandı: $error');
        _updateStatus(SignalRConnectionStatus.disconnected);
        _scheduleReconnect();
      });

      _hubConnection!.onreconnecting(({error}) {
        debugPrint('[SignalRService] Yeniden bağlanılıyor: $error');
        _updateStatus(SignalRConnectionStatus.reconnecting);
      });

      _hubConnection!.onreconnected(({connectionId}) {
        debugPrint('[SignalRService] Başarıyla yeniden bağlandı. ID: $connectionId');
        _updateStatus(SignalRConnectionStatus.connected);
      });

      // Sunucudan gelen sipariş güncellemelerini ve havuza düşen paketleri dinle
      _hubConnection!.on('ReceiveOrderStatusUpdate', (arguments) {
        debugPrint('[SignalRService] ReceiveOrderStatusUpdate alındı: $arguments');
        if (arguments != null && arguments.isNotEmpty) {
          try {
            final raw = arguments[0];
            if (raw is Map) {
              _orderUpdatesController.add(Map<String, dynamic>.from(raw));
            } else {
              _orderUpdatesController.add({'raw': raw.toString()});
            }
          } catch (e) {
            debugPrint('[SignalRService] Parse error ReceiveOrderStatusUpdate: $e');
          }
        }
      });

      await _hubConnection!.start();
      _updateStatus(SignalRConnectionStatus.connected);
      debugPrint('[SignalRService] LocationHub bağlantısı kuruldu: $_hubUrl');
    } catch (e) {
      debugPrint('[SignalRService] Bağlantı hatası: $e');
      _updateStatus(SignalRConnectionStatus.disconnected);
      if (e.toString().contains('401') || e.toString().toLowerCase().contains('unauthorized')) {
        debugPrint('[SignalRService] JWT Token süresi dolmuş veya geçersiz. Lütfen çıkış yapıp tekrar giriş yapın.');
        return;
      }
      _scheduleReconnect();
    }
  }

  /// Kurye Canlı Konumunu Backend'e İlet (SendLocationUpdate)
  Future<void> sendLocationUpdate({
    required String courierId,
    required double latitude,
    required double longitude,
  }) async {
    if (_hubConnection == null ||
        _hubConnection!.state != HubConnectionState.Connected) {
      debugPrint('[SignalRService] Konum iletilemedi: Hub bağlı değil ($_currentStatus)');
      if (_currentStatus == SignalRConnectionStatus.disconnected) {
        connect();
      }
      return;
    }

    try {
      await _hubConnection!.invoke(
        'SendLocationUpdate',
        args: <Object>[courierId, latitude, longitude],
      );
      debugPrint('[SignalRService] Canlı Konum Gönderildi → Courier: $courierId, Lat: $latitude, Lng: $longitude');
    } catch (e) {
      debugPrint('[SignalRService] SendLocationUpdate hatası: $e');
    }
  }

  /// Hub Bağlantısını Kapat
  Future<void> disconnect() async {
    _reconnectTimer?.cancel();
    if (_hubConnection != null) {
      await _hubConnection!.stop();
      _hubConnection = null;
    }
    _updateStatus(SignalRConnectionStatus.disconnected);
  }

  void dispose() {
    _isDisposed = true;
    _reconnectTimer?.cancel();
    disconnect();
    _statusController.close();
    _orderUpdatesController.close();
  }
}
