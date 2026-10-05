// src/types/courier.ts

/**
 * Backend CourierDto → Frontend Kurye Durum Modeli
 */
export interface CourierState {
  id: string;
  merchantId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  vehicleType: string;
  licensePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  isAvailable: boolean;
  currentBalance?: number;

  // Canlı GPS (SignalR üzerinden güncellenir)
  lat: number | null;
  lng: number | null;

  // İstatistiksel hesaplama (opsiyonel — ileride eklenebilir)
  speed: number;        // km/h
  lastUpdate: Date | null;

  // Bağlantı durumu
  isOnline: boolean;

  // Kurye molada mı (mesaide ama yeni sipariş almıyor)
  isOnBreak?: boolean;
}

/**
 * LocationHub → ReceiveLocationUpdate event parametreleri
 * Backend'de: Clients.All.SendAsync("ReceiveLocationUpdate", courierId, lat, lng)
 */
export interface LocationUpdatePayload {
  courierId: string;
  latitude: number;
  longitude: number;
}

/**
 * SignalR bağlantı durumu
 */
export type SignalRConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';
