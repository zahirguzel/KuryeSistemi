// src/stores/authStore.ts

import { create } from 'zustand';
import type { Merchant } from '../types';
import type { AuthTokenDto, AuthUser } from '../types/auth';
import { merchantService } from '../services/merchantService';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  merchant: Merchant | null;
  isAuthenticated: boolean;
  login: (authData: AuthTokenDto) => void;
  updateMerchant: (data: Partial<Merchant>) => void;
  fetchMerchantProfile: (merchantId?: string) => Promise<Merchant | null>;
  logout: () => void;
}

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'auth_user',
  MERCHANT: 'merchant_auth',
} as const;

// LocalStorage'dan başlangıç durumunu güvenli yükle
const getInitialState = () => {
  const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
  const savedMerchant = localStorage.getItem(STORAGE_KEYS.MERCHANT);

  let user: AuthUser | null = null;
  let merchant: Merchant | null = null;

  if (savedUser) {
    try {
      user = JSON.parse(savedUser) as AuthUser;
    } catch {
      user = null;
    }
  }

  if (savedMerchant) {
    try {
      merchant = JSON.parse(savedMerchant) as Merchant;
    } catch {
      merchant = null;
    }
  }

  return {
    token: savedToken,
    user,
    merchant,
    isAuthenticated: Boolean(savedToken && (user || merchant)),
  };
};

const initial = getInitialState();

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initial.token,
  user: initial.user,
  merchant: initial.merchant,
  isAuthenticated: initial.isAuthenticated,

  /**
   * Başarılı giriş sonrası oturum bilgilerini hem belleğe hem localStorage'a kaydeder.
   * Hemen ardından veritabanındaki GPS konumu ve profil ayarlarını senkronize eder.
   */
  login: (authData: AuthTokenDto) => {
    const user: AuthUser = {
      id: authData.userId || authData.merchantId,
      merchantId: authData.merchantId,
      name: authData.merchantName,
      email: authData.email,
      roles: authData.roles || ['Merchant'],
    };

    const merchant: Merchant = {
      id: authData.merchantId,
      name: authData.merchantName || 'İşletme',
      email: authData.email,
      defaultPackageFee: 75.0,
    };

    localStorage.setItem(STORAGE_KEYS.TOKEN, authData.token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.MERCHANT, JSON.stringify(merchant));

    set({
      token: authData.token,
      user,
      merchant,
      isAuthenticated: true,
    });

    // Giriş anında veritabanındaki GPS koordinatlarını ve profil ayarlarını çek
    get().fetchMerchantProfile(authData.merchantId);
  },

  /**
   * İşletme bilgilerini (konum, açık/kapalı, unvan vb.) günceller ve saklar.
   */
  updateMerchant: (data: Partial<Merchant>) => {
    set((state) => {
      if (!state.merchant) return state;
      const updated = { ...state.merchant, ...data };
      localStorage.setItem(STORAGE_KEYS.MERCHANT, JSON.stringify(updated));
      return { merchant: updated };
    });
  },

  /**
   * Backend üzerinden işletmenin veya firmanın güncel GPS koordinatları ve profil ayarlarını çeker.
   */
  fetchMerchantProfile: async (merchantId?: string) => {
    const targetId = merchantId || get().merchant?.id;
    if (!targetId) return null;

    try {
      const res = await merchantService.getSettings(targetId);
      if (res.isSuccess && res.data) {
        const p = res.data;
        const current = get().merchant;
        const updated: Merchant = {
          ...(current || { id: targetId, name: p.name, email: p.email, defaultPackageFee: p.defaultPackageFee ?? 75.0 }),
          name: p.name || current?.name || 'İşletme',
          email: p.email || current?.email || '',
          phoneNumber: p.phoneNumber ?? current?.phoneNumber,
          address: p.address ?? current?.address,
          isOpen: p.isOpen ?? current?.isOpen,
          latitude: typeof p.latitude === 'number' && p.latitude !== 0 ? p.latitude : current?.latitude,
          longitude: typeof p.longitude === 'number' && p.longitude !== 0 ? p.longitude : current?.longitude,
          defaultPackageFee: p.defaultPackageFee ?? current?.defaultPackageFee ?? 75.0,
          dispatchMode: p.dispatchMode ?? current?.dispatchMode,
          reconciliationPeriod: p.reconciliationPeriod ?? current?.reconciliationPeriod,
          hexagonSizeMeters: p.hexagonSizeMeters ?? current?.hexagonSizeMeters,
          maxCourierDistanceKm: p.maxCourierDistanceKm ?? current?.maxCourierDistanceKm,
          maxOrdersPerTour: p.maxOrdersPerTour ?? current?.maxOrdersPerTour,
          orderBatchingTimeMinutes: p.orderBatchingTimeMinutes ?? current?.orderBatchingTimeMinutes,
          crossRestaurantDistanceMeters: p.crossRestaurantDistanceMeters ?? current?.crossRestaurantDistanceMeters,
        };

        localStorage.setItem(STORAGE_KEYS.MERCHANT, JSON.stringify(updated));
        set({ merchant: updated });
        return updated;
      }
    } catch (err) {
      console.warn('İşletme GPS ve profil ayarları senkronizasyonunda hata:', err);
    }
    return null;
  },

  /**
   * Oturumu sonlandırır ve tüm saklanan kimlik verilerini temizler.
   */
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.MERCHANT);

    set({
      token: null,
      user: null,
      merchant: null,
      isAuthenticated: false,
    });
  },
}));

// Sayfa yenilendiğinde (F5) GPS koordinatları eksikse arka planda otomatik çek
if (initial.merchant?.id && (!initial.merchant.latitude || !initial.merchant.longitude)) {
  useAuthStore.getState().fetchMerchantProfile(initial.merchant.id);
}

