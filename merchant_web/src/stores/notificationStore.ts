// src/stores/notificationStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audioAlert } from '../utils/audioAlert';

export type NotificationType = 'new_order' | 'assigned' | 'delivered' | 'cancelled' | 'info' | 'warning' | 'sos';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  orderCode?: string;
  timestamp: string;
  isRead: boolean;
}

export interface ToastItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  orderCode?: string;
  timestamp: string;
}

interface NotificationState {
  notifications: AppNotification[];
  toasts: ToastItem[];
  soundEnabled: boolean;
  unreadCount: number;

  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  removeToast: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  toggleSound: () => void;
  testSound: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      toasts: [],
      soundEnabled: true,
      unreadCount: 0,

      addNotification: (notif) => {
        const now = Date.now();

        // 1. Yinelenen Toast Koruması: Ekranda aynı orderId ve type ile gösterilen aktif bir Toast varsa tekrar ekleme
        if (notif.orderId) {
          const isToastDuplicate = get().toasts.some(
            (t) => t.orderId === notif.orderId && t.type === notif.type
          );
          if (isToastDuplicate) {
            return;
          }
        }

        // 2. Zaman Bazlı Debounce Koruması: Son 2 saniye içinde TAM OLARAK AYNI sipariş ve AYNI durum için bildirim alındıysa engelle
        const recentDuplicate = get().notifications.slice(0, 5).find(
          (n) =>
            ((notif.orderId && n.orderId === notif.orderId && n.type === notif.type) ||
              (!notif.orderId && n.title === notif.title && n.type === notif.type)) &&
            now - new Date(n.timestamp).getTime() < 2000
        );

        if (recentDuplicate) {
          return;
        }

        const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const timestamp = new Date().toISOString();
        
        const newNotif: AppNotification = {
          ...notif,
          id,
          timestamp,
          isRead: false,
        };

        const newToast: ToastItem = {
          ...notif,
          id,
          timestamp,
        };

        // Ses çalma
        const { soundEnabled } = get();
        if (soundEnabled) {
          if (notif.type === 'new_order') {
            audioAlert.playNewOrderSound();
          } else if (notif.type === 'assigned') {
            audioAlert.playAssignedSound();
          } else if (notif.type === 'delivered') {
            audioAlert.playDeliveredSound();
          } else if (notif.type === 'cancelled' || notif.type === 'warning' || notif.type === 'sos') {
            audioAlert.playWarningSound();
          } else {
            audioAlert.playNewOrderSound();
          }
        }

        set((state) => {
          const updatedNotifs = [newNotif, ...state.notifications].slice(0, 50); // Son 50 bildirim
          const updatedToasts = [newToast, ...state.toasts].slice(0, 4); // Ekranda en fazla 4 toast
          return {
            notifications: updatedNotifs,
            toasts: updatedToasts,
            unreadCount: updatedNotifs.filter((n) => !n.isRead).length,
          };
        });
      },

      removeToast: (id: string) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      markAsRead: (id) => {
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      },

      clearAll: () => {
        set({
          notifications: [],
          toasts: [],
          unreadCount: 0,
        });
      },

      toggleSound: () => {
        set((state) => {
          const nextVal = !state.soundEnabled;
          audioAlert.setMuted(!nextVal);
          return { soundEnabled: nextVal };
        });
      },

      testSound: () => {
        audioAlert.unlockAudio();
        audioAlert.playNewOrderSound();
      },
    }),
    {
      name: 'kurye_notifications_storage',
      partialize: (state) => ({ soundEnabled: state.soundEnabled }),
    }
  )
);
