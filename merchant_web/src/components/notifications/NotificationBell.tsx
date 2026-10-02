// src/components/notifications/NotificationBell.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Bell, Volume2, VolumeX, Check, Trash2,
  Package, CheckCircle2, XCircle, Clock, Truck
} from 'lucide-react';
import { useNotificationStore, type AppNotification } from '../../stores/notificationStore';

function getNotificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'new_order':
      return <Package className="w-4 h-4 text-amber-500" />;
    case 'assigned':
      return <Truck className="w-4 h-4 text-violet-500" />;
    case 'delivered':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-rose-500" />;
    default:
      return <Clock className="w-4 h-4 text-teal-500" />;
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return new Date(dateStr).toLocaleDateString('tr-TR');
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    soundEnabled,
    markAsRead,
    markAllAsRead,
    clearAll,
    toggleSound,
    testSound,
  } = useNotificationStore();

  // Dışarı tıklandığında menüyü kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Zil Butonu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80 transition-all active:scale-95 touch-manipulation"
        aria-label="Bildirimler"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse border-2 border-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Bildirim Çekmecesi / Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Üst Bar */}
          <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-teal-400" />
              <h3 className="font-black text-sm text-white">Canlı Bildirimler</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded-full border border-teal-500/30">
                  {unreadCount} yeni
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {/* Sesi Test Et */}
              <button
                onClick={testSound}
                title="Bildirim sesini test et"
                className="px-2 py-1 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition-colors text-[11px] font-bold flex items-center space-x-1 border border-slate-700/60"
              >
                <span>Dene</span>
              </button>

              {/* Ses Aç / Kapat */}
              <button
                onClick={toggleSound}
                title={soundEnabled ? 'Bildirim sesini kapat' : 'Bildirim sesini aç'}
                className={`p-1.5 rounded-lg transition-colors ${
                  soundEnabled ? 'text-teal-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Tümünü Okundu Say */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Tümünü okundu işaretle"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}

              {/* Temizle */}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Tümünü temizle"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bildirim Listesi */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Henüz bildirim yok</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Sipariş ve kurye hareketleri burada anlık görünür.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`px-4 py-3 flex items-start space-x-3 transition-colors cursor-pointer ${
                    n.isRead ? 'bg-white hover:bg-slate-50/80 opacity-75' : 'bg-teal-50/40 hover:bg-teal-50/80 font-medium'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs ${n.isRead ? 'font-bold text-slate-700' : 'font-black text-slate-900'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">{timeAgo(n.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Alt Bar */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sesli Uyarı: {soundEnabled ? '🟢 Açık' : '⚪ Kapalı'}</span>
            <span>Canlı WebSocket Aktif</span>
          </div>
        </div>
      )}
    </div>
  );
};
