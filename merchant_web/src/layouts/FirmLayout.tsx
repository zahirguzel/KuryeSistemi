import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  Map,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  Bike,
  Activity,
  ChevronDown,
  ChevronRight,
  Banknote,
  BarChart3,
  FileText,
  UserCog,
  Layers,
  ClipboardList,
  Route,
  Clock,
  Star,
  Fuel,
  ShieldCheck,
  Building2,
  Sliders,
  Globe,
  Hexagon,
  ListOrdered,
  CheckCheck,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { stopSignalR } from '../services/signalRService';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { NotificationToastContainer } from '../components/notifications/NotificationToast';
import { useNotificationListener } from '../hooks/useNotificationListener';

// ─── Menü Yapısı Tipi ─────────────────────────────────────────────────────────

interface NavItem {
  to?: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  children?: NavItem[];
}

// ─── Accordion Menü Öğesi ─────────────────────────────────────────────────────

interface AccordionItemProps {
  item: NavItem;
  depth?: number;
  onClose: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ item, depth = 0, onClose }) => {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;

  // Alt menülerden biri aktifse bu grubu da açık tut
  const isAnyChildActive = item.children?.some((c) =>
    c.to ? location.pathname.startsWith(c.to) : false
  );

  const [open, setOpen] = useState(isAnyChildActive ?? false);
  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all duration-150 text-left group ${
            isAnyChildActive
              ? 'bg-slate-700/60 text-white'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          } ${depth > 0 ? 'pl-8 py-2' : ''}`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <Icon className={`shrink-0 ${depth > 0 ? 'w-4 h-4' : 'w-5 h-5'}`} />
            <span className={`truncate ${depth > 0 ? 'text-xs' : 'text-sm'}`}>{item.label}</span>
            {item.badge && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                {item.badge}
              </span>
            )}
          </div>
          {open ? (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>

        {/* Alt menüler */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="mt-0.5 ml-3 pl-3 border-l border-slate-700/60 space-y-0.5 py-1">
            {item.children!.map((child) => (
              <AccordionItem key={child.label} item={child} depth={depth + 1} onClose={onClose} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Yaprak menü (link)
  if (!item.to) return null;

  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center justify-between rounded-xl font-medium transition-all duration-150 group ${
          depth > 0 ? 'px-3 py-2 pl-3' : 'px-3.5 py-2.5'
        } ${
          isActive
            ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`
      }
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <Icon className={`shrink-0 ${depth > 0 ? 'w-3.5 h-3.5' : 'w-5 h-5'}`} />
        <span className={`truncate ${depth > 0 ? 'text-xs' : 'text-sm'}`}>{item.label}</span>
        {item.badge && (
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
            {item.badge}
          </span>
        )}
      </div>
      {!item.badge && depth === 0 && (
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
      )}
    </NavLink>
  );
};

// ─── FirmLayout ───────────────────────────────────────────────────────────────

export const FirmLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useNotificationListener();

  const handleLogout = () => {
    stopSignalR().catch(() => {});
    logout();
    navigate('/login');
  };

  const navItems: NavItem[] = [
    {
      to: '/firm/dashboard',
      label: 'Güncel Durum',
      icon: LayoutDashboard,
      badge: 'CANLI',
      badgeColor: 'bg-teal-500 text-white',
    },
    {
      label: 'Siparişler',
      icon: Package,
      children: [
        { to: '/firm/orders', label: 'Aktif Siparişler', icon: ListOrdered },
        { to: '/firm/orders/delivered', label: 'Teslim Edilenler', icon: CheckCheck },
        { to: '/firm/orders/cancelled', label: 'İptal Edilenler', icon: XCircle },
      ],
    },
    {
      to: '/firm/merchants',
      label: 'İşletmeler',
      icon: Store,
    },
    {
      to: '/firm/couriers',
      label: 'Kuryeler',
      icon: Bike,
    },
    {
      to: '/firm/radar',
      label: 'Harita',
      icon: Map,
    },
    {
      label: 'Cari Hesap',
      icon: Banknote,
      children: [
        { to: '/firm/finance', label: 'Genel Durum', icon: TrendingUp },
        { to: '/firm/finance/receivables', label: 'Borç Alacak Bakiye Listesi', icon: ClipboardList },
        { to: '/firm/finance/courier-collections', label: 'Kurye Tahsilatları', icon: Users },
        { to: '/firm/finance/reconciliation', label: 'Mutabakat', icon: CheckCheck },
      ],
    },
    {
      label: 'Raporlar',
      icon: BarChart3,
      children: [
        { to: '/firm/reports/general', label: 'Genel Raporlar', icon: FileText },
        { to: '/firm/reports/delivery', label: 'Genel Teslimat Raporu', icon: Route },
        { to: '/firm/reports/pricing', label: 'Ücretlendirme Raporu', icon: Banknote },
      ],
    },
    {
      label: 'Kurye Raporları',
      icon: Bike,
      children: [
        { to: '/firm/reports/courier/score', label: 'Puan Raporu', icon: Star },
        { to: '/firm/reports/courier/delivery', label: 'Teslimat Raporu', icon: Package },
        { to: '/firm/reports/courier/schedule', label: 'Çalışma Düzeni Raporu', icon: Clock },
        { to: '/firm/reports/courier/behavior', label: 'Davranış Raporu', icon: ShieldCheck },
        { to: '/firm/reports/courier/performance', label: 'Performans Raporu', icon: Activity },
        { to: '/firm/reports/courier/km', label: 'KM Raporu', icon: Fuel },
      ],
    },
    {
      label: 'Restoran Raporları',
      icon: Store,
      children: [
        { to: '/firm/reports/restaurant/detailed', label: 'Restoran Detaylı Rapor', icon: Building2 },
      ],
    },
    {
      label: 'Yönetim',
      icon: UserCog,
      children: [
        { to: '/firm/management/sub-users', label: 'Alt Kullanıcılar', icon: Users },
        { to: '/firm/management/sub-teams', label: 'Alt Teamler', icon: Layers },
      ],
    },
    {
      label: 'Ayarlar',
      icon: Settings,
      children: [
        { to: '/firm/settings', label: 'Genel Ayarlar', icon: Sliders },
        { to: '/firm/settings/pool', label: 'Havuz Ayarları', icon: Globe },
        { to: '/firm/settings/region', label: 'Bölge Ayarları', icon: Hexagon },
      ],
    },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* ── Mobil Üst Başlık ──────────────────────────────────────────── */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-xl flex items-center justify-center shadow-sm">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight text-slate-900">KuryeSistemi</h1>
            <p className="text-[11px] font-semibold text-teal-600 uppercase tracking-wide">Kurye Firması</p>
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

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-200 z-40 flex flex-col transition-transform duration-200 ease-in-out shadow-xl md:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
          {/* Logo */}
          <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-base text-white tracking-tight leading-none">KuryeSistemi</h2>
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Kurye Firması</span>
              </div>
            </div>
            <button onClick={closeSidebar} className="md:hidden text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Kullanıcı Kartı */}
          <div className="px-3 py-2.5 mx-2 my-2 bg-slate-800/60 rounded-xl border border-slate-700/50 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600/40 flex items-center justify-center text-teal-300 shrink-0 border border-teal-500/30 text-sm font-black">
                {(user?.name || 'F').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">Yetkili Kullanıcı</p>
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Firma Yöneticisi'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || ''}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center space-x-1.5 px-2 py-1 bg-teal-500/15 rounded-lg border border-teal-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-semibold text-teal-300">Kurye Firması Yetkili Modu</span>
            </div>
          </div>

          {/* Ana Menü */}
          <nav className="px-2 py-1 space-y-0.5 flex-1">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3.5 pt-2 pb-1">
              ANA MENÜ
            </p>
            {navItems.map((item) => (
              <AccordionItem key={item.label} item={item} onClose={closeSidebar} />
            ))}
          </nav>

          {/* Alt: Bağlantı & Çıkış */}
          <div className="px-3 py-3 border-t border-slate-800 space-y-2 shrink-0">
            <div className="flex items-center justify-between px-1 text-xs text-slate-400">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="font-medium text-slate-300 text-[11px]">Filo Bağlantısı</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">v1.2.0</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 border border-rose-500/20 transition-all font-semibold text-xs min-h-[40px] touch-manipulation active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Oturumu Kapat</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop (mobil) */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-slate-950/60 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* ── Ana İçerik ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="hidden md:flex bg-white border-b border-slate-200/80 px-6 py-3 items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full border border-teal-200">
              <Activity className="w-3.5 h-3.5 animate-spin text-teal-600" />
              <span>Filo Yönetim Modu Aktif</span>
            </div>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs font-medium text-slate-500">
              {new Date().toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-teal-50 rounded-xl border border-teal-200">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-black">
                {(user?.name || 'F').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-teal-700">{user?.name || 'Firma Yöneticisi'}</span>
            </div>
          </div>
        </header>

        <NotificationToastContainer />

        {/* Sayfa İçeriği */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
