// src/stores/courierStore.ts
//
// Canlı kurye durum yönetimi.
// SignalR üzerinden gelen LocationUpdate olayları bu store'a aktar.
// Harita ve liste bileşenleri buradan abone olur.

import { create } from 'zustand';
import type { CourierState } from '../types/courier';

interface CourierStoreState {
  /** Backend'den çekilen işletmeye ait kurye listesi (REST API ile doldurulur) */
  couriers: Map<string, CourierState>;

  /** SignalR bağlantı durumu — LiveRadar'da gösterilir */
  signalRStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

  // ── Actions ──────────────────────────────────────────────────────────

  /**
   * REST API'den gelen başlangıç kurye listesini yükler.
   * Map yapısı sayesinde O(1) erişim ve kesin identity sağlanır.
   */
  initCouriers: (couriers: CourierState[]) => void;

  /**
   * SignalR'dan gelen anlık konum güncellemesini işler.
   * Map üzerinde shallow merge ile sadece değişen alanları günceller,
   * tüm listeyi yeniden oluşturmaz → optimize render.
   */
  updateCourierLocation: (courierId: string, lat: number, lng: number) => void;

  /**
   * Kurye'nin mesai ve müsaitlik durumunu anlık günceller.
   * (SignalR ReceiveCourierStatusUpdate olayında tetiklenir)
   */
  updateCourierStatus: (courierId: string, isOnline: boolean, isAvailable: boolean, isOnBreak?: boolean) => void;

  /**
   * Kurye'yi çevrimiçi veya çevrimdışı olarak işaretle.
   * (Disconnect/Reconnect olaylarında tetiklenir)
   */
  setCourierOnlineStatus: (courierId: string, isOnline: boolean) => void;

  /** SignalR bağlantı durumunu güncelle */
  setSignalRStatus: (status: CourierStoreState['signalRStatus']) => void;

  /** Kurye listesini ve SignalR durumunu temizle (logout) */
  reset: () => void;
}

const INITIAL_STATE = {
  couriers: new Map<string, CourierState>(),
  signalRStatus: 'disconnected' as const,
};

export const useCourierStore = create<CourierStoreState>((set, get) => ({
  ...INITIAL_STATE,

  initCouriers: (courierList) => {
    const map = new Map<string, CourierState>(
      courierList.map((c: any) => [
        c.id,
        {
          ...c,
          lat: c.lat ?? c.currentLatitude ?? null,
          lng: c.lng ?? c.currentLongitude ?? null,
          isOnline: Boolean(c.isOnline),
          isAvailable: Boolean(c.isAvailable),
          isOnBreak: Boolean(c.isOnBreak),
        },
      ])
    );
    set({ couriers: map });
  },

  updateCourierLocation: (courierId, lat, lng) => {
    const { couriers } = get();

    // Mevcut kurye verisi veya yeni gelen sinyal için varsayılan nesne
    const existing = couriers.get(courierId) ?? {
      id: courierId,
      merchantId: '',
      firstName: 'Kurye',
      lastName: '',
      phoneNumber: '',
      email: '',
      vehicleType: 'Motorcycle',
      licensePlate: '',
      vehicleBrand: '',
      vehicleModel: '',
      isAvailable: true,
      currentBalance: 0,
      lat,
      lng,
      speed: 0,
      lastUpdate: new Date(),
      isOnline: true,
    };

    const updated: CourierState = {
      ...existing,
      lat,
      lng,
      lastUpdate: new Date(),
      isOnline: true,
    };

    // Yeni Map referansı → Zustand shallow compare tetiklenir → render
    const newMap = new Map(couriers);
    newMap.set(courierId, updated);
    set({ couriers: newMap });
  },

  updateCourierStatus: (courierId, isOnline, isAvailable, isOnBreak) => {
    const { couriers } = get();
    if (!couriers.has(courierId)) return;
    const existing = couriers.get(courierId)!;
    const newMap = new Map(couriers);
    newMap.set(courierId, {
      ...existing,
      isOnline,
      isAvailable,
      // Mola bilgisi yalnızca sunucu gönderdiyse güncellenir (diğer yayınlar mevcut durumu ezmez)
      isOnBreak: isOnBreak ?? existing.isOnBreak ?? false,
      lastUpdate: new Date(),
    });
    set({ couriers: newMap });
  },

  setCourierOnlineStatus: (courierId, isOnline) => {
    const { couriers } = get();
    if (!couriers.has(courierId)) return;
    const existing = couriers.get(courierId)!;
    const newMap = new Map(couriers);
    newMap.set(courierId, { ...existing, isOnline });
    set({ couriers: newMap });
  },

  setSignalRStatus: (status) => set({ signalRStatus: status }),

  reset: () => set({ ...INITIAL_STATE }),
}));

/** Selector: Map'i diziye dönüştür (harita render için memoize edin) */
export const selectCourierList = (s: CourierStoreState): CourierState[] =>
  Array.from(s.couriers.values());
