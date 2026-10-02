// src/services/signalRService.ts
//
// Merchant Web için LocationHub SignalR WebSocket servisi.
// JWT Bearer token ile [Authorize] edilmiş hub'a bağlanır.
// ReceiveLocationUpdate ve ReceiveOrderStatusUpdate olaylarını dinler.

import {
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr';
import { ENV } from '../config/env';
import { useAuthStore } from '../stores/authStore';
import { useCourierStore } from '../stores/courierStore';

// ── Singleton bağlantı referansı (React re-render'lardan korunan) ───────────
let hubConnection: HubConnection | null = null;
let startPromise: Promise<void> | null = null;

// ── SignalR Kurye Konum Olayı ────────────────────────────────────────────────
// Backend LocationHub.cs:
//   await Clients.All.SendAsync("ReceiveLocationUpdate", courierId, lat, lng)
const LOCATION_EVENT = 'ReceiveLocationUpdate';

// ── Backend Sipariş Durum Olayı ──────────────────────────────────────────────
// Backend SignalRHubNotificationService.cs:
//   await _hubContext.Clients.All.SendAsync("ReceiveOrderStatusUpdate", {...})
const ORDER_EVENT = 'ReceiveOrderStatusUpdate';

/** SignalR Hub bağlantısını oluşturur ve yapılandırır */
function buildConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${ENV.WS_URL}/hubs/location`, {
      // JWT Bearer token — [Authorize] attribute'un beklediği format
      accessTokenFactory: () => {
        const token = useAuthStore.getState().token;
        if (!token) {
          console.warn('[SignalR] Token bulunamadı — bağlantı yetkisiz olabilir.');
        }
        return token ?? '';
      },
      // SSE + WebSocket önce dene; WebSocket yoksa SSE'ye düş
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents,
      withCredentials: false,
    })
    .withAutomaticReconnect({
      // Yeniden bağlanma aralıkları (ms): 0s, 2s, 5s, 10s, 15s, 30s
      nextRetryDelayInMilliseconds: (ctx) => {
        const delays = [0, 2000, 5000, 10000, 15000, 30000];
        return delays[Math.min(ctx.previousRetryCount, delays.length - 1)];
      },
    })
    .configureLogging(
      import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning
    )
    .build();
}

// ── Sipariş Durum Dinleyicileri ──────────────────────────────────────────
export type OrderUpdatePayload = {
  orderId: string;
  merchantId: string;
  status: string;
  message: string;
  timestamp: string;
};

type OrderUpdateCallback = (payload: OrderUpdatePayload) => void;
const orderListeners = new Set<OrderUpdateCallback>();

export function onOrderUpdate(callback: OrderUpdateCallback): () => void {
  orderListeners.add(callback);
  return () => {
    orderListeners.delete(callback);
  };
}

/** Olay dinleyicilerini hub bağlantısına ekler */
function attachEventHandlers(connection: HubConnection): void {
  const { updateCourierLocation, updateCourierStatus, setSignalRStatus } = useCourierStore.getState();

  // ── Kurye GPS Güncellemesi ────────────────────────────────────────────────
  // Backend imzası: SendAsync("ReceiveLocationUpdate", Guid courierId, double lat, double lng)
  connection.on(LOCATION_EVENT, (courierId: string, latitude: number, longitude: number) => {
    updateCourierLocation(courierId, latitude, longitude);
  });

  // ── Kurye Mesai / Durum Güncellemesi ──────────────────────────────────────
  connection.on('ReceiveCourierStatusUpdate', (payload: any) => {
    console.info('[SignalR] Kurye Durumu Güncellendi:', payload);
    const cid = payload?.courierId ?? payload?.CourierId;
    const isOnline = payload?.isOnline ?? payload?.IsOnline;
    const isAvailable = payload?.isAvailable ?? payload?.IsAvailable;
    if (cid) {
      updateCourierStatus(cid, Boolean(isOnline), Boolean(isAvailable));
    }
  });

  // ── Sipariş Durum Güncellemesi ────────────────────────────────────────────
  connection.on(ORDER_EVENT, (rawPayload: any) => {
    const normalized: OrderUpdatePayload = {
      orderId: String(rawPayload?.orderId ?? rawPayload?.OrderId ?? rawPayload?.id ?? rawPayload?.Id ?? ''),
      merchantId: String(rawPayload?.merchantId ?? rawPayload?.MerchantId ?? ''),
      status: String(rawPayload?.status ?? rawPayload?.Status ?? ''),
      message: String(rawPayload?.message ?? rawPayload?.Message ?? ''),
      timestamp: String(rawPayload?.timestamp ?? rawPayload?.Timestamp ?? new Date().toISOString()),
    };
    console.info(`[SignalR] Sipariş Güncellendi: ${normalized.orderId} → ${normalized.status}`, normalized);
    orderListeners.forEach((listener) => {
      try {
        listener(normalized);
      } catch (err) {
        console.error('[SignalR] Order listener hatası:', err);
      }
    });
  });

  // ── Bağlantı Yaşam Döngüsü ───────────────────────────────────────────────
  connection.onreconnecting(() => {
    console.warn('[SignalR] Yeniden bağlanılıyor...');
    setSignalRStatus('reconnecting');
  });

  connection.onreconnected((connectionId) => {
    console.info(`[SignalR] Yeniden bağlandı: ${connectionId ?? 'unknown'}`);
    setSignalRStatus('connected');
  });

  connection.onclose((error) => {
    console.warn('[SignalR] Bağlantı kapandı:', error?.message ?? 'Neden bilinmiyor');
    setSignalRStatus('disconnected');
    hubConnection = null; // Singleton sıfırla — bir sonraki start() yeniden oluşturur
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/** SignalR bağlantısını başlatır (idempotent & thread-safe singleton — çift bağlantıyı engeller) */
export async function startSignalR(): Promise<void> {
  // 1. Zaten bağlıysa doğrudan çık
  if (hubConnection?.state === HubConnectionState.Connected) {
    return Promise.resolve();
  }

  // 2. Halihazırda bağlanma sürecindeyse aynı promise'i bekle
  if (startPromise) {
    return startPromise;
  }

  if (
    hubConnection?.state === HubConnectionState.Connecting ||
    hubConnection?.state === HubConnectionState.Reconnecting
  ) {
    return Promise.resolve();
  }

  const { setSignalRStatus } = useCourierStore.getState();
  setSignalRStatus('connecting');

  startPromise = (async () => {
    try {
      // Eğer eski veya kopuk bir bağlantı referansı varsa önce temizle
      if (hubConnection) {
        try {
          hubConnection.off(LOCATION_EVENT);
          hubConnection.off('ReceiveCourierStatusUpdate');
          hubConnection.off(ORDER_EVENT);
          if (hubConnection.state !== HubConnectionState.Disconnected) {
            await hubConnection.stop();
          }
        } catch (_) {}
        hubConnection = null;
      }

      const connection = buildConnection();
      attachEventHandlers(connection);
      hubConnection = connection;

      await connection.start();
      setSignalRStatus('connected');
      console.info('[SignalR] LocationHub bağlantısı kuruldu:', connection.connectionId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[SignalR] Bağlantı kurulamadı:', message);
      setSignalRStatus('error');
      hubConnection = null;
    } finally {
      startPromise = null;
    }
  })();

  return startPromise;
}

/** SignalR bağlantısını temiz şekilde kapatır (bellek sızıntısı önleme) */
export async function stopSignalR(): Promise<void> {
  if (!hubConnection) return;

  try {
    // Önce tüm event handler'ları kaldır
    hubConnection.off(LOCATION_EVENT);
    hubConnection.off(ORDER_EVENT);

    if (
      hubConnection.state === HubConnectionState.Connected ||
      hubConnection.state === HubConnectionState.Connecting
    ) {
      await hubConnection.stop();
      console.info('[SignalR] Bağlantı düzgünce kapatıldı.');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[SignalR] Kapatma sırasında hata:', message);
  } finally {
    hubConnection = null;
    useCourierStore.getState().setSignalRStatus('disconnected');
  }
}

/** Anlık bağlantı durumunu döner */
export function getSignalRState(): HubConnectionState {
  return hubConnection?.state ?? HubConnectionState.Disconnected;
}
