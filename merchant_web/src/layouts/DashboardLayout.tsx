import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  MapPin,
  PlusCircle,
  Layers,
  Wallet,
  LogOut,
  Menu,
  X,
  Store,
  Bike,
  Activity,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { merchantService } from '../services/merchantService';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { NotificationToastContainer } from '../components/notifications/NotificationToast';
import { useNotificationListener } from '../hooks/useNotificationListener';

export const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { merchant, user, logout, updateMerchant } = useAuthStore();
  const [isTogglingStore, setIsTogglingStore] = useState(false);
  const navigate = useNavigate();

  const isStoreOpen = merchant?.isOpen ?? true;

  const handleToggleStoreOpen = async () => {
    if (!merchant?.id || isTogglingStore) return;
    const newStatus = !isStoreOpen;
    setIsTogglingStore(true);
    updateMerchant({ isOpen: newStatus });
    try {
      const res = await merchantService.updateSettings(merchant.id, { isOpen: newStatus });
      if (res.isSuccess) {
        useNotificationStore.getState().addNotification({
          type: 'delivered',
          title: newStatus ? '🏪 İşletme Açıldı' : '🔒 İşletme Kapatıldı',
          message: newStatus ? 'Yeni sipariş alımı aktif edildi.' : 'Sipariş alımı geçici olarak durduruldu.',
        });
      }
    } catch (err) {
      console.error('Store status update failed', err);
    } finally {
      setIsTogglingStore(false);
    }
  };

  // Canlı SignalR olaylarını ve sesli bildirimleri dinle
  useNotificationListener();

  const isFirmAdmin = user?.roles?.some((r) => ['CourierFirm', 'Admin', 'FirmAdmin'].includes(r));
  const isSmartAuto = (merchant?.dispatchMode as unknown) === 'SmartAuto' || String(merchant?.dispatchMode) === '3';
  const hasGps = typeof merchant?.latitude === 'number' && typeof merchant?.longitude === 'number' && merchant.latitude !== 0 && merchant.longitude !== 0;
  const isSmartAutoWithoutGps = !isFirmAdmin && isSmartAuto && !hasGps;

  // Profil koordinatları henüz yüklenmemişse arka planda veritabanından çek
  useEffect(() => {
    if (merchant?.id && (!merchant.latitude || !merchant.longitude)) {
      useAuthStore.getState().fetchMerchantProfile(merchant.id);
    }
  }, [merchant?.id, merchant?.latitude, merchant?.longitude]);



  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/radar',
      label: 'Canlı Saha Radarı',
      subtitle: 'Haritada anlık kuryeler',
      icon: MapPin,
      badge: 'Canlı',
      badgeColor: 'bg-emerald-500 text-white',
    },
    {
      to: '/quick-order',
      label: 'Hızlı Sipariş (POS)',
      subtitle: 'Telefon & kapı siparişi',
      icon: PlusCircle,
      badge: null,
      badgeColor: '',
    },
    {
      to: '/orders',
      label: 'Sipariş Akışı (Kanban)',
      subtitle: 'Hazırlanan & yoldaki paketler',
      icon: Layers,
      badge: null,
      badgeColor: '',
    },
    {
      to: '/finance',
      label: 'Kasa & Mahsuplaşma',
      subtitle: 'Kurye nakit borç/alacak',
      icon: Wallet,
      badge: null,
      badgeColor: '',
    },
    {
      to: '/settings',
      label: 'İşletme & Adres Ayarları',
      subtitle: 'Restoran profili & İskenderun',
      icon: Settings,
      badge: null,
      badgeColor: '',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* ── Mobil & Tablet Üst Başlık Çubuğu ─────────────────────────────── */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-xs">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight text-slate-900">KuryeSistemi</h1>
            <p className="text-[11px] font-medium text-slate-500">İşletme Komuta Merkezi</p>
          </div>
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all touch-manipulation"
          aria-label="Menüyü Aç/Kapat"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* ── Masaüstü & Tablet Yan Menü (Sidebar) ─────────────────────────── */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-slate-900 text-slate-200 z-40 flex flex-col justify-between transition-transform duration-200 ease-in-out shadow-xl md:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Üst Logo ve Başlık */}
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-black text-lg text-white tracking-tight leading-none">
                  KuryeSistemi
                </h2>
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  İşletme Portalı
                </span>
              </div>
            </div>

            {/* Mobil Menü Kapatma Butonu */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* İşletme Bilgi & Açık/Kapalı Kartı */}
          <div className="px-4 py-3 mx-3 my-3 bg-slate-800/90 rounded-xl border border-slate-700/60 space-y-2.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-400 truncate">Aktif İşletme</p>
                <p className="text-sm font-bold text-white truncate">
                  {merchant?.name || 'Restoran Paneli'}
                </p>
              </div>
            </div>

            {/* Açık / Kapalı Toggle Butonu */}
            <button
              onClick={handleToggleStoreOpen}
              disabled={isTogglingStore}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-between transition-all touch-manipulation active:scale-98 disabled:opacity-50 ${
                isStoreOpen
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isStoreOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
                <span>{isStoreOpen ? 'İşletme Açık' : 'İşletme Kapalı'}</span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider opacity-80">
                {isStoreOpen ? 'Sipariş Alınıyor' : 'Durduruldu'}
              </span>
            </button>
          </div>


          {/* Menü Linkleri (Tablet için geniş dokunma hedefleri: min-h-[48px]) */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3.5 py-3 rounded-xl font-medium transition-all duration-150 touch-manipulation min-h-[48px] ${
                      isActive
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className="w-5 h-5 shrink-0" />
                    <div className="truncate">
                      <span className="text-sm block truncate">{item.label}</span>
                      <span className="text-[11px] text-slate-400 group-hover:text-slate-300 block truncate">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Alt Çıkış ve Canlı Durum */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-slate-300">Saha Bağlantısı</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">v1.2.0</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 border border-rose-500/20 transition-all font-semibold text-sm min-h-[44px] touch-manipulation active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>Oturumu Kapat</span>
          </button>
        </div>
      </aside>

      {/* Mobil Menü Karartma Arka Planı (Backdrop) */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      {/* ── Ana İçerik Alanı (Göz Yormayan Ferah Tema) ───────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Masaüstü Üst Bar */}
        <header className="hidden md:flex bg-white border-b border-slate-200/80 px-8 py-3.5 items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              <Activity className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>Canlı Komuta Modu Aktif</span>
            </div>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-medium text-slate-500">
              {new Date().toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Açık / Kapalı Hızlı Düğme */}
            <button
              onClick={handleToggleStoreOpen}
              disabled={isTogglingStore}
              className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 touch-manipulation disabled:opacity-50 ${
                isStoreOpen
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{isStoreOpen ? 'İşletme Açık (Sipariş Alınıyor)' : 'İşletme Kapalı (Durduruldu)'}</span>
            </button>

            <NavLink
              to="/quick-order"
              className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-xs shadow-amber-500/20 transition-all active:scale-95 touch-manipulation"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Yeni Sipariş Girişi</span>
            </NavLink>

            {/* Bildirim Zili */}
            <NotificationBell />
          </div>
        </header>

        {/* Canlı Toast Bildirimleri */}
        <NotificationToastContainer />

        {/* GPS Kalibrasyon Uyarısı (SmartAuto Modu Aktifken GPS Eksikse) */}
        {isSmartAutoWithoutGps && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 md:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 animate-in fade-in duration-300">
            <div className="flex items-center space-x-2.5 text-xs md:text-sm font-semibold">
              <span className="text-lg">⚠️</span>
              <div>
                <strong className="text-amber-900 font-extrabold">GPS Kalibrasyon Uyarısı:</strong> Restoranınız için <strong>Akıllı Otonom Dağıtım (SmartAuto)</strong> modeli aktif, ancak işletme GPS koordinatınız kayıtlı değil! Kuryeler konumunuzu göremediği için siparişler otomatik atanamıyor.
              </div>
            </div>
            <NavLink
              to="/settings"
              className="shrink-0 self-start sm:self-auto bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Konumu Haritada Belirle →</span>
            </NavLink>
          </div>
        )}

        {/* Dinamik Sayfa İçeriği */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

