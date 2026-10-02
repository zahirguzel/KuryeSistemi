import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { computeGlobalH3Grid } from '../../utils/h3Geometry';
import {
  RefreshCw,
  Activity,
  BarChart2,
  Package,
  Map,
  ChevronDown,
  X,
  Search,
  Radio,
  Maximize2,
  Minimize2,
  Target,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api';
import { useCourierStore } from '../../stores/courierStore';
import { startSignalR, onOrderUpdate } from '../../services/signalRService';
import { orderService } from '../../services/orderService';
import { courierService } from '../../services/courierService';
import { merchantService, type MerchantDto } from '../../services/merchantService';
import type { ServiceResult } from '../../types/auth';
import type { CourierState } from '../../types/courier';
import type { Order } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  pendingOrders: number;
  readyOrders: number;
  assignedOrders: number;
  onWayOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
}

interface MerchantSummary {
  id: string;
  name: string;
  activeOrders: number;
  isOpen: boolean;
  address?: string;
  latitude?: number;
  longitude?: number;
  dispatchMode?: string | number;
  hexagonSizeMeters?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FALLBACK_CENTER: [number, number] = [36.5867, 36.1714];


function statusInfo(status: string): { label: string; color: string; bg: string; dot: string; textColor: string } {
  const map: Record<string, { label: string; color: string; bg: string; dot: string; textColor: string }> = {
    Pending:   { label: 'Bekliyor',       color: '#f59e0b', bg: '#fffbeb', dot: '#f59e0b', textColor: '#b45309' },
    Preparing: { label: 'Hazırlanıyor',   color: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6', textColor: '#1d4ed8' },
    Created:   { label: 'Hazırlanıyor',   color: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6', textColor: '#1d4ed8' },
    Ready:     { label: 'Hazır',          color: '#06b6d4', bg: '#ecfeff', dot: '#06b6d4', textColor: '#0e7490' },
    Assigned:  { label: 'Kurye Onayladı', color: '#8b5cf6', bg: '#f5f3ff', dot: '#8b5cf6', textColor: '#6d28d9' },
    PickedUp:  { label: 'Yolda',          color: '#14b8a6', bg: '#f0fdfa', dot: '#14b8a6', textColor: '#0f766e' },
    Delivered: { label: 'Teslim',         color: '#10b981', bg: '#f0fdf4', dot: '#10b981', textColor: '#065f46' },
    Cancelled: { label: 'İptal',          color: '#ef4444', bg: '#fff1f2', dot: '#ef4444', textColor: '#b91c1c' },
    '0':       { label: 'Bekliyor',       color: '#f59e0b', bg: '#fffbeb', dot: '#f59e0b', textColor: '#b45309' },
    '1':       { label: 'Hazırlanıyor',   color: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6', textColor: '#1d4ed8' },
    '2':       { label: 'Hazır',          color: '#06b6d4', bg: '#ecfeff', dot: '#06b6d4', textColor: '#0e7490' },
    '3':       { label: 'Kurye Onayladı', color: '#8b5cf6', bg: '#f5f3ff', dot: '#8b5cf6', textColor: '#6d28d9' },
    '4':       { label: 'Yolda',          color: '#14b8a6', bg: '#f0fdfa', dot: '#14b8a6', textColor: '#0f766e' },
    '5':       { label: 'Teslim',         color: '#10b981', bg: '#f0fdf4', dot: '#10b981', textColor: '#065f46' },
    '6':       { label: 'İptal',          color: '#ef4444', bg: '#fff1f2', dot: '#ef4444', textColor: '#b91c1c' },
  };
  return map[status] ?? { label: status, color: '#64748b', bg: '#f8fafc', dot: '#64748b', textColor: '#475569' };
}

function paymentLabel(method: string): string {
  const m: Record<string, string> = {
    Cash: 'Kapıda Nakit', Card: 'Kapıda Kart',
    Online: 'Online Ödeme', CreditCardOnDelivery: 'Kapıda Kredi Kartı',
    '0': 'Online Ödeme', '1': 'Kapıda Nakit', '2': 'Kapıda Kredi Kartı'
  };
  return m[method] ?? method;
}

function sourceLabel(source?: string | number): { label: string; color: string; bg: string } {
  const s = String(source ?? '').toLowerCase();
  if (s.includes('trendyol') || s === '2') return { label: 'Trendyol Yemek', color: '#ea580c', bg: '#fff7ed' };
  if (s.includes('yemeksepeti') || s === '3') return { label: 'Yemeksepeti', color: '#dc2626', bg: '#fef2f2' };
  if (s.includes('phone') || s.includes('telefon') || s === '1') return { label: 'Telefon Siparişi', color: '#2563eb', bg: '#eff6ff' };
  if (s.includes('migros')) return { label: 'Migros Yemek', color: '#f97316', bg: '#fff7ed' };
  if (s.includes('getir')) return { label: 'Getir Yemek', color: '#7c3aed', bg: '#f5f3ff' };
  return { label: 'Doğrudan Sipariş', color: '#64748b', bg: '#f8fafc' };
}

function timeSince(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'Az önce';
  if (diff < 60) return `${diff} dk`;
  return `${Math.floor(diff / 60)} sa ${diff % 60} dk`;
}

// ─── Harita ───────────────────────────────────────────────────────────────────

function createCourierIcon(courier: CourierState, count: number): L.DivIcon {
  const init = (courier.firstName || 'K').charAt(0).toUpperCase();
  const online = Boolean(courier.isOnline);
  const avail = Boolean(courier.isAvailable) && online;
  const bg = !online ? '#64748b' : avail ? '#14b8a6' : '#f59e0b';
  return new L.DivIcon({
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="position:relative;width:32px;height:32px;border-radius:50%;background:${bg};color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.25),0 0 0 2px white;font-size:12px;font-weight:900;font-family:system-ui,sans-serif;">
        ${init}
        <div style="position:absolute;bottom:0;right:0;width:9px;height:9px;border-radius:50%;background:${online ? (avail ? '#10b981' : '#f59e0b') : '#94a3b8'};border:2px solid white;"></div>
        ${count > 0 ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:50%;background:#ef4444;border:1.5px solid white;color:white;font-size:8px;font-weight:900;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;">${count}</div>` : ''}
      </div>
      <div style="background:rgba(15,23,42,0.9);color:white;font-size:9px;font-weight:700;padding:1.5px 5px;border-radius:4px;white-space:nowrap;font-family:system-ui,sans-serif;">${courier.firstName}(${count})</div>
    </div>`,
    className: '', iconSize: [80, 50], iconAnchor: [40, 32], popupAnchor: [0, -34],
  });
}

function createRestaurantIcon(name: string, isOpen: boolean): L.DivIcon {
  return new L.DivIcon({
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(245,158,11,0.4),0 0 0 2px white;font-size:15px;position:relative;">
        🏪<div style="position:absolute;bottom:-2px;right:-2px;width:9px;height:9px;border-radius:50%;background:${isOpen ? '#10b981' : '#94a3b8'};border:2px solid white;"></div>
      </div>
      <div style="background:rgba(15,23,42,0.9);color:white;font-size:9px;font-weight:700;padding:1.5px 5px;border-radius:4px;white-space:nowrap;font-family:system-ui,sans-serif;max-width:90px;overflow:hidden;text-overflow:ellipsis;">${name}</div>
    </div>`,
    className: '', iconSize: [90, 48], iconAnchor: [45, 32], popupAnchor: [0, -34],
  });
}

function createOrderIcon(order: Order): L.DivIcon {
  const code = order.orderCode ? `#${order.orderCode.slice(-4)}` : '📦';
  const st = statusInfo(String(order.status));
  return new L.DivIcon({
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
      <div style="width:30px;height:30px;border-radius:10px;background:${st.dot};color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.25),0 0 0 2px white;font-size:13px;position:relative;">
        📦
      </div>
      <div style="background:rgba(15,23,42,0.92);color:white;font-size:9px;font-weight:700;padding:1.5px 5px;border-radius:4px;white-space:nowrap;font-family:system-ui,sans-serif;box-shadow:0 2px 5px rgba(0,0,0,0.2);">
        ${code} ${order.totalOrderAmount ? order.totalOrderAmount.toFixed(0) + '₺' : ''}
      </div>
    </div>`,
    className: '', iconSize: [90, 48], iconAnchor: [45, 30], popupAnchor: [0, -32],
  });
}

function MapController({
  focusTarget,
  recenterTrigger,
  isMapExpanded,
  isFullScreen,
  merchants,
  couriers,
}: {
  focusTarget: { lat: number; lng: number; zoom?: number; ts: number } | null;
  recenterTrigger: number;
  isMapExpanded: boolean;
  isFullScreen: boolean;
  merchants: MerchantSummary[];
  couriers: Array<{ lat?: number | null; lng?: number | null }>;
}) {
  const map = useMap();
  const prevFocus = useRef<number>(0);
  const prevRecenter = useRef<number>(0);

  // Harita boyutu değiştiğinde (Genişlet / Tam Ekran) gri boşluk kalmaması için tile'ları yeniden hesapla
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize({ animate: false });
    };
    handleResize();
    const t1 = setTimeout(handleResize, 50);
    const t2 = setTimeout(handleResize, 150);
    const t3 = setTimeout(handleResize, 350);
    const t4 = setTimeout(handleResize, 600);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMapExpanded, isFullScreen, map]);

  useEffect(() => {
    if (focusTarget && focusTarget.ts !== prevFocus.current) {
      prevFocus.current = focusTarget.ts;
      map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom ?? 15, { animate: true, duration: 1.2 });
    }
  }, [focusTarget, map]);

  useEffect(() => {
    if (recenterTrigger > 0 && recenterTrigger !== prevRecenter.current) {
      prevRecenter.current = recenterTrigger;
      const validPoints: [number, number][] = [];
      merchants.forEach(m => {
        if (m.latitude && m.longitude) validPoints.push([m.latitude, m.longitude]);
      });
      couriers.forEach(c => {
        if (c.lat && c.lng) validPoints.push([c.lat, c.lng]);
      });
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      } else {
        map.setView(FALLBACK_CENTER, 13, { animate: true });
      }
    }
  }, [recenterTrigger, map, merchants, couriers]);

  return null;
}

// ─── Status Dropdown (Kurye Firması Operatör İşlemleri) ─────────────────────────

const OPERATOR_ACTIONS = [
  { value: 0, label: 'Beklet / Havuz', color: '#f59e0b', status: 'Pending', icon: '⏸️' },
  { value: 4, label: 'Yolda (Teslim Alındı)', color: '#14b8a6', status: 'PickedUp', icon: '🛵' },
  { value: 5, label: 'Teslim Edildi', color: '#10b981', status: 'Delivered', icon: '✅' },
  { value: 6, label: 'İptal Et', color: '#ef4444', status: 'Cancelled', icon: '❌' },
];

interface StatusDropdownProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: number) => Promise<void>;
  onAssignClick: (order: Order) => void;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ order, onStatusChange, onAssignClick }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const st = statusInfo(String(order.status));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = async (statusValue: number) => {
    setOpen(false);
    setLoading(true);
    await onStatusChange(order.id, statusValue);
    setLoading(false);
  };

  const isFinal = ['Delivered', 'Cancelled', '5', '6'].includes(String(order.status));

  if (isFinal) {
    return (
      <span
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold"
        style={{ background: st.bg, borderColor: st.color + '40', color: st.textColor }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.dot }} />
        <span>{st.label}</span>
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        style={{ background: st.bg, borderColor: st.color + '40', color: st.textColor }}
      >
        {loading ? (
          <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.dot }} />
        )}
        <span>{st.label}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[210px]"
          style={{ zIndex: 9999 }}
        >
          {/* Vurgulu Kurye Yönlendir Butonu */}
          <button
            onClick={() => { setOpen(false); onAssignClick(order); }}
            className="w-full flex items-center space-x-2 px-3.5 py-2.5 text-xs font-bold text-blue-600 bg-blue-50/70 hover:bg-blue-100/70 transition-colors text-left"
          >
            <span>🛵</span>
            <span>{order.courierId ? 'Kurye Değiştir' : 'Kurye Ata'}</span>
          </button>

          <div className="my-1 border-t border-slate-100" />

          {/* Operatör Lojistik Eylemleri */}
          {OPERATOR_ACTIONS.map((opt) => {
            const isActive = String(order.status) === opt.status || String(order.status) === String(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs hover:bg-slate-50 transition-colors text-left"
              >
                <span className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />
                  <span className={`font-semibold ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>{opt.label}</span>
                </span>
                {isActive && <span className="text-teal-600 font-bold">✓</span>}
              </button>
            );
          })}

          <div className="mt-1 pt-1.5 px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 leading-tight">
            ℹ️ <em>Hazırlanıyor & Paket Hazır</em> mutfak/restoran tarafından güncellenir.
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Kurye Yönlendir Modalı ───────────────────────────────────────────────────

interface CourierModalProps {
  order: Order | null;
  couriers: CourierState[];
  activeOrdersByCourier: Record<string, number>;
  onClose: () => void;
  onAssign: (orderId: string, courierId: string) => Promise<void>;
}

const CourierModal: React.FC<CourierModalProps> = ({ order, couriers, activeOrdersByCourier, onClose, onAssign }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    const list = couriers || [];
    return list
      .filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) || (c.phoneNumber ?? '').includes(term))
      .sort((a, b) => {
        // Çevrim içi olanlar ve müsait olanlar öncelikli
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
        return (activeOrdersByCourier[a.id] ?? 0) - (activeOrdersByCourier[b.id] ?? 0);
      });
  }, [couriers, search, activeOrdersByCourier]);

  if (!order) return null;

  const handleAssign = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await onAssign(order.id, selected);
      onClose();
    } catch {
      // handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.5)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Kurye Ata / Yönlendir</h3>
            <p className="text-xs text-slate-500 mt-0.5">Sipariş: <span className="font-semibold text-slate-700">{order.orderCode ? `#${order.orderCode}` : `#${order.id.slice(-4)}`}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Arama */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="İsim veya telefon ile ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Kurye Listesi */}
        <div className="max-h-72 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">
              Kurye bulunamadı (Filoda kayıtlı kurye yok veya arama sonucu boş)
            </div>
          )}
          {filtered.map(c => {
            const count = activeOrdersByCourier[c.id] ?? 0;
            const isSelected = selected === c.id;
            const statusBadge = c.isOnline
              ? (count === 0 ? { label: 'Müsait', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
                             : { label: `${count} paket`, bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' })
              : { label: 'Çevrimdışı', bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };

            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-1 text-left ${
                  isSelected ? 'bg-blue-50/80 border border-blue-400 shadow-xs' : 'hover:bg-slate-50 border border-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusBadge.dot}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">
                        {c.firstName} {c.lastName}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>📞 {c.phoneNumber ?? '-'}</span>
                      {c.licensePlate && <span>🏍️ {c.licensePlate}</span>}
                    </p>
                  </div>
                </div>
                {isSelected && <span className="text-blue-600 font-black text-sm">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Onayla */}
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {selected
              ? `Seçili: ${filtered.find(c => c.id === selected)?.firstName ?? ''} ${filtered.find(c => c.id === selected)?.lastName ?? ''}`
              : 'Lütfen bir kurye seçin'}
          </p>
          <div className="flex space-x-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              İptal
            </button>
            <button
              onClick={handleAssign}
              disabled={!selected || loading}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Atanıyor...' : 'Ata'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LAYERS_STORAGE_KEY = 'firm_dashboard_layer_prefs';

function getStoredLayerPrefs() {
  try {
    const raw = localStorage.getItem(LAYERS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    bolgeler: false, // İlk açıldığında kapalı başlar
    isletme: true,
    siparisler: true,
    kurye: true,
  };
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const FirmDashboard: React.FC = () => {
  // ─ View toggles
  const [showStats, setShowStats] = useState(true);
  const [showOrders, setShowOrders] = useState(true);
  const [showMap, setShowMap] = useState(true);

  // ─ Kurye sekmesi
  const [courierTab, setCourierTab] = useState<'boşta' | 'molada' | 'çalışanlar'>('boşta');
  const [courierPage, setCourierPage] = useState(0);
  const COURIERS_PER_PAGE = 5;

  // ─ Harita katmanları ve kontrolleri (Kalıcı Tercihler - localStorage)
  const [layerBolgeler, setLayerBolgeler] = useState<boolean>(() => getStoredLayerPrefs().bolgeler ?? false);
  const [layerIsletme, setLayerIsletme] = useState<boolean>(() => getStoredLayerPrefs().isletme ?? true);
  const [layerSiparisler, setLayerSiparisler] = useState<boolean>(() => getStoredLayerPrefs().siparisler ?? true);
  const [layerKurye, setLayerKurye] = useState<boolean>(() => getStoredLayerPrefs().kurye ?? true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Katman tercihleri değiştikçe sakla (sekme veya sayfa geçişinde kaybolmaz)
  useEffect(() => {
    try {
      localStorage.setItem(
        LAYERS_STORAGE_KEY,
        JSON.stringify({
          bolgeler: layerBolgeler,
          isletme: layerIsletme,
          siparisler: layerSiparisler,
          kurye: layerKurye,
        })
      );
    } catch {}
  }, [layerBolgeler, layerIsletme, layerSiparisler, layerKurye]);

  // ESC ile tam ekrandan çıkış
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─ Modal
  const [assignModalOrder, setAssignModalOrder] = useState<Order | null>(null);

  // ─ Focus
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; zoom?: number; ts: number } | null>(null);

  // ─ Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [couriers, setCouriers] = useState<CourierState[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<MerchantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const courierMap = useCourierStore((s) => s.couriers);
  const initCouriers = useCourierStore((s) => s.initCouriers);

  const storeCouriers = useMemo(() => Array.from(courierMap.values()), [courierMap]);
  const liveCouriers = useMemo(() => {
    if (couriers.length === 0) return storeCouriers;
    return couriers.map((c) => {
      const live = courierMap.get(c.id);
      if (live) {
        return {
          ...c,
          isOnline: live.isOnline,
          isAvailable: live.isAvailable,
          lat: live.lat ?? c.lat,
          lng: live.lng ?? c.lng,
        };
      }
      return c;
    });
  }, [couriers, storeCouriers, courierMap]);

  const activeCouriers = liveCouriers.length > 0 ? liveCouriers : couriers;

  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);

  // Kuryelere göre aktif siparişlerin listesi (Alt alta listeleme için)
  const ordersByCourier = useMemo(() => {
    const map: Record<string, Order[]> = {};
    allOrders.forEach((o) => {
      const cid = (o as any).courierId;
      if (cid && ['Assigned', 'PickedUp', '3', '4'].includes(String(o.status))) {
        if (!map[cid]) map[cid] = [];
        map[cid].push(o);
      }
    });
    return map;
  }, [allOrders]);

  const activeOrdersByCourier = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(ordersByCourier).forEach(([cid, list]) => {
      map[cid] = list.length;
    });
    return map;
  }, [ordersByCourier]);

  // Tabloda gösterilecek siparişler (Kurye filtresi varsa sadece o kuryenin paketleri)
  const displayedOrders = useMemo(() => {
    if (!selectedCourierId) return allOrders;
    return allOrders.filter(o => (o as any).courierId === selectedCourierId);
  }, [allOrders, selectedCourierId]);

  const boştaKuryeler = useMemo(() => activeCouriers.filter(c => c.isOnline && c.isAvailable), [activeCouriers]);
  const moladaKuryeler = useMemo(() => activeCouriers.filter(c => c.isOnline && !c.isAvailable && (activeOrdersByCourier[c.id] ?? 0) === 0), [activeCouriers, activeOrdersByCourier]);
  const çalışanKuryeler = useMemo(() => activeCouriers.filter(c => c.isOnline && (activeOrdersByCourier[c.id] ?? 0) > 0), [activeCouriers, activeOrdersByCourier]);

  const tabCouriers = useMemo(() => {
    if (courierTab === 'boşta') return boştaKuryeler;
    if (courierTab === 'molada') return moladaKuryeler;
    return çalışanKuryeler;
  }, [courierTab, boştaKuryeler, moladaKuryeler, çalışanKuryeler]);

  const paginatedCouriers = tabCouriers.slice(courierPage * COURIERS_PER_PAGE, (courierPage + 1) * COURIERS_PER_PAGE);

  const mapCouriers = useMemo(() => {
    const cm = merchants.filter(m => typeof m.latitude === 'number');
    const clat = cm.length > 0 ? cm.reduce((s, m) => s + (m.latitude ?? 0), 0) / cm.length : FALLBACK_CENTER[0];
    const clng = cm.length > 0 ? cm.reduce((s, m) => s + (m.longitude ?? 0), 0) / cm.length : FALLBACK_CENTER[1];
    return activeCouriers.map((c, i) => ({
      ...c,
      lat: c.lat || clat + ((i % 3) - 1) * 0.005 + Math.floor(i / 3) * 0.004,
      lng: c.lng || clng + (((i + 1) % 3) - 1) * 0.005,
    }));
  }, [activeCouriers, merchants]);

  // ─ Uber H3 Altıgen Bölgeler
  const h3Cells = useMemo(() => {
    if (!layerBolgeler || merchants.length === 0) return [];
    const coords = merchants
      .filter(m => typeof m.latitude === 'number' && typeof m.longitude === 'number')
      .map(m => ({ lat: m.latitude!, lng: m.longitude! }));
    if (coords.length === 0) {
      coords.push({ lat: FALLBACK_CENTER[0], lng: FALLBACK_CENTER[1] });
    }
    return computeGlobalH3Grid(coords, 2);
  }, [layerBolgeler, merchants]);

  // ─ Aktif siparişler (Harita ve katman sayacı için)
  const activeOrdersForMap = useMemo(() => {
    return allOrders.filter(o =>
      ['Created', 'Pending', 'Preparing', 'Ready', 'Assigned', 'PickedUp', '0', '1', '2', '3', '4'].includes(String(o.status))
    );
  }, [allOrders]);

  // ─ Haritada gösterilecek aktif sipariş paketleri (Teslimat Noktaları)
  const mapOrders = useMemo(() => {
    if (!layerSiparisler) return [];
    return activeOrdersForMap.map((o, idx) => {
      let lat = (o as any).deliveryLatitude || (o as any).latitude;
      let lng = (o as any).deliveryLongitude || (o as any).longitude;
      if (!lat || !lng) {
        const m = merchants.find(m => m.id === o.merchantId);
        const baseLat = m?.latitude ?? FALLBACK_CENTER[0];
        const baseLng = m?.longitude ?? FALLBACK_CENTER[1];
        const angle = (idx * 137.5) * (Math.PI / 180);
        const dist = 0.007 + (idx % 5) * 0.0035;
        lat = baseLat + Math.sin(angle) * dist;
        lng = baseLng + Math.cos(angle) * dist;
      }
      return { ...o, lat: Number(lat), lng: Number(lng) };
    });
  }, [layerSiparisler, activeOrdersForMap, merchants]);

  // ─ loadData ──────────────────────────────────────────────────────────────────

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [couriersRes, ordersRes, merchantsRes] = await Promise.allSettled([
        courierService.getAllCouriers(),
        // Kumanda paneli: tüm geçmiş yerine aktif siparişler + bugünün siparişleri (sayaçlar "bugün" için doğru olsun)
        api.get<ServiceResult<Order[]>>('/orders', { params: { today: true } }),
        merchantService.getAllMerchants(),
      ]);

      let courierList: CourierState[] = [];
      let orderList: Order[] = [];
      let merchantList: MerchantDto[] = [];

      if (couriersRes.status === 'fulfilled' && couriersRes.value.isSuccess) {
        courierList = couriersRes.value.data ?? [];
        setCouriers(courierList);
        initCouriers(courierList);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data.isSuccess) {
        orderList = ordersRes.value.data.data ?? [];
        setAllOrders(orderList);
      }
      if (merchantsRes.status === 'fulfilled' && merchantsRes.value.isSuccess) {
        merchantList = merchantsRes.value.data ?? [];
      }

      const sc = (arr: string[]) => orderList.filter(o => arr.includes(String(o.status))).length;
      setStats({
        pendingOrders: sc(['Pending', '0']),
        readyOrders: sc(['Preparing', 'Ready', 'Created', '1', '2']),
        assignedOrders: sc(['Assigned', '3']),
        onWayOrders: sc(['PickedUp', '4']),
        cancelledOrders: sc(['Cancelled', '6']),
        deliveredOrders: sc(['Delivered', '5']),
      });

      const activeByMerchant: Record<string, number> = {};
      orderList.forEach(o => {
        const mid = (o as any).merchantId;
        if (mid && ['Created', 'Pending', 'Preparing', 'Ready', 'Assigned', 'PickedUp', '0', '1', '2', '3', '4'].includes(String(o.status))) {
          activeByMerchant[mid] = (activeByMerchant[mid] || 0) + 1;
        }
      });

      const summaries: MerchantSummary[] = merchantList.map(m => ({
        id: m.id, name: m.name, activeOrders: activeByMerchant[m.id] || 0,
        isOpen: m.isOpen, address: m.address, latitude: m.latitude, longitude: m.longitude,
        dispatchMode: m.dispatchMode, hexagonSizeMeters: m.hexagonSizeMeters,
      }));
      orderList.forEach(o => {
        const mid = (o as any).merchantId;
        if (mid && !summaries.some(s => s.id === mid)) {
          summaries.push({ id: mid, name: (o as any).merchantName ?? 'Restoran', activeOrders: activeByMerchant[mid] || 0, isOpen: true });
        }
      });
      setMerchants(summaries);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard veri yüklenemedi:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [initCouriers]);

  useEffect(() => {
    loadData();
    startSignalR().catch(() => {});
    const unsub = onOrderUpdate(() => loadData(true));
    const interval = setInterval(() => loadData(true), 30_000);
    return () => { unsub(); clearInterval(interval); };
  }, [loadData]);

  // ─ Handlers ──────────────────────────────────────────────────────────────────

  const handleStatusChange = async (orderId: string, newStatus: number) => {
    await orderService.updateStatus(orderId, newStatus);
    await loadData(true);
  };

  const handleAssignCourier = async (orderId: string, courierId: string) => {
    await orderService.assignCourier(orderId, courierId);
    await loadData(true);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-slate-50">

      {/* ── Başlık + Toggle Bar ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="text-sm font-bold text-slate-900">Güncel Durum / Siparişler</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Son güncelleme:{' '}
            <span className="font-semibold text-slate-600">{lastRefresh.toLocaleTimeString('tr-TR')}</span>
            {' '}(birkaç saniye önce)
          </p>
        </div>

        <div className="flex items-center space-x-5">
          <button
            onClick={() => loadData(true)}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-500' : ''}`} />
            <span>Yenile</span>
          </button>

          <div className="flex items-center space-x-3">
            {[
              { label: 'İstatistikler', val: showStats, set: setShowStats, icon: BarChart2 },
              { label: 'Siparişler',    val: showOrders, set: setShowOrders, icon: Package },
              { label: 'Harita',        val: showMap,    set: setShowMap,    icon: Map },
            ].map(({ label, val, set }) => (
              <button
                key={label}
                type="button"
                onClick={() => set(!val)}
                className="flex items-center space-x-1.5 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors select-none text-left"
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-all ${
                    val ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                  }`}
                >
                  {val && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className={`text-xs font-semibold ${val ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">

        {/* ── İstatistikler + Kuryeler ────────────────────────────────────── */}
        {showStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            {/* Sipariş Stat Bar */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-stretch divide-x divide-slate-100 py-4">
                {stats ? ([
                  { label: 'Bekleyen',  value: stats.pendingOrders,   color: stats.pendingOrders > 0 ? '#b45309' : '#0f172a', badge: stats.pendingOrders > 0 },
                  { label: 'Hazır',     value: stats.readyOrders,     color: stats.readyOrders > 0 ? '#1d4ed8' : '#0f172a', badge: false },
                  { label: 'Atama',     value: stats.assignedOrders,  color: stats.assignedOrders > 0 ? '#6d28d9' : '#0f172a', badge: false },
                  { label: 'Yolda',     value: stats.onWayOrders,     color: stats.onWayOrders > 0 ? '#0f766e' : '#0f172a', badge: false },
                  { label: 'İptal',     value: stats.cancelledOrders, color: stats.cancelledOrders > 0 ? '#b91c1c' : '#0f172a', badge: false },
                  { label: 'Teslim',    value: stats.deliveredOrders, color: '#065f46', badge: false },
                ]).map(({ label, value, color }) => (
                  <div key={label} className="flex-1 text-center px-3 py-1">
                    <div className="text-2xl font-black leading-none" style={{ color }}>{value}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">{label}</div>
                  </div>
                )) : (
                  <div className="py-4 px-4 text-sm text-slate-400">Yükleniyor...</div>
                )}
              </div>
            </div>

            {/* Kurye Paneli */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              {/* Başlık */}
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-800">Kuryeler</span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                  <span className="flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /><span>Konum Açık</span></span>
                  <span className="flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" /><span>Konum Kapalı</span></span>
                </div>
              </div>

              {/* Sekmeler */}
              <div className="flex border-b border-slate-100 px-3">
                {([['boşta', `Boşta (${boştaKuryeler.length})`], ['molada', `Molada (${moladaKuryeler.length})`], ['çalışanlar', `Çalışanlar (${çalışanKuryeler.length})`]] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => { setCourierTab(tab); setCourierPage(0); }}
                    className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                      courierTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Liste */}
              <div className="px-2 py-1">
                {paginatedCouriers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">Bu kategoride kurye yok</div>
                ) : (
                  paginatedCouriers.map(c => {
                    const cOrders = ordersByCourier[c.id] || [];
                    const isSelected = selectedCourierId === c.id;

                    return (
                      <div
                        key={c.id}
                        className={`py-2 px-3 rounded-xl transition-all cursor-pointer select-none mb-1.5 border ${
                          isSelected
                            ? 'bg-teal-50/80 border-teal-300 ring-2 ring-teal-400 shadow-xs'
                            : 'hover:bg-slate-100/80 border-slate-100/70 bg-white'
                        }`}
                        onClick={() => {
                          setSelectedCourierId(prev => (prev === c.id ? null : c.id));
                          const targetCourier = mapCouriers.find(mc => mc.id === c.id);
                          if (targetCourier?.lat && targetCourier?.lng) {
                            setFocusTarget({ lat: targetCourier.lat, lng: targetCourier.lng, zoom: 16, ts: Date.now() });
                            if (!showMap) setShowMap(true);
                          }
                        }}
                        title={isSelected ? 'Filtreyi kaldır' : 'Kuryenin paketlerini listele ve haritada odaklan'}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.isOnline ? 'bg-emerald-500 shadow-2xs' : 'bg-slate-300'}`} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-slate-800">{c.firstName} {c.lastName}</p>
                                {isSelected && (
                                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded">
                                    Filtrelendi
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {c.phoneNumber ? `📞 ${c.phoneNumber}` : 'Bölge: -'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                              cOrders.length > 0 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {cOrders.length} Paket
                            </span>
                          </div>
                        </div>

                        {/* Kuryeye ait birden fazla paket varsa alt alta listele */}
                        {cOrders.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                            {cOrders.map((ord) => (
                              <div
                                key={ord.id}
                                className="flex items-center justify-between text-[11px] bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/80 shadow-2xs"
                              >
                                <div className="flex items-center space-x-1.5 truncate">
                                  <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">
                                    {ord.orderCode ? `#${ord.orderCode}` : `#${ord.id.slice(-4)}`}
                                  </span>
                                  <span className="text-slate-700 truncate font-semibold">
                                    {(ord as any).merchantName ?? 'Restoran'} ➔ {(ord as any).deliveryNeighborhood ?? (ord as any).deliveryDistrict ?? 'Müşteri'}
                                  </span>
                                </div>
                                <span className="font-bold text-teal-700 shrink-0 ml-1">
                                  {ord.totalOrderAmount?.toFixed(2)} ₺
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sayfalama */}
              <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
                <button onClick={() => setCourierPage(p => Math.max(0, p - 1))} disabled={courierPage === 0}
                  className="text-[11px] text-slate-500 hover:text-slate-800 disabled:opacity-30 font-medium">« Önceki</button>
                <span className="text-[11px] text-slate-400">
                  {courierPage * COURIERS_PER_PAGE + 1}–{Math.min((courierPage + 1) * COURIERS_PER_PAGE, tabCouriers.length)} / {tabCouriers.length}
                </span>
                <button
                  onClick={() => setCourierPage(p => (p + 1) * COURIERS_PER_PAGE < tabCouriers.length ? p + 1 : p)}
                  disabled={(courierPage + 1) * COURIERS_PER_PAGE >= tabCouriers.length}
                  className="text-[11px] text-slate-500 hover:text-slate-800 disabled:opacity-30 font-medium">Sonraki »</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Harita ──────────────────────────────────────────────────────── */}
        {showMap && (
          <div
            className={
              isFullScreen
                ? 'fixed inset-0 z-[10000] bg-white w-screen h-screen flex flex-col'
                : 'bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 relative'
            }
            style={
              isFullScreen
                ? { height: '100vh', width: '100vw' }
                : { height: isMapExpanded ? 'calc(100vh - 160px)' : 480, minHeight: isMapExpanded ? 640 : 480 }
            }
          >
            <div className="relative h-full w-full">
              <MapContainer center={FALLBACK_CENTER} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap contributors' />
                <MapController
                  focusTarget={focusTarget}
                  recenterTrigger={recenterTrigger}
                  isMapExpanded={isMapExpanded}
                  isFullScreen={isFullScreen}
                  merchants={merchants}
                  couriers={mapCouriers}
                />

                {/* 1. Uber H3 Altıgen Bölgeler */}
                {layerBolgeler && h3Cells.map(cell => (
                  <Polygon
                    key={`h3-${cell.id}`}
                    positions={cell.boundary}
                    pathOptions={{
                      color: cell.isCenter ? '#7c3aed' : '#8b5cf6',
                      weight: cell.isCenter ? 2 : 1.5,
                      dashArray: cell.isCenter ? undefined : '4, 4',
                      fillColor: cell.isCenter ? '#a855f7' : '#c084fc',
                      fillOpacity: cell.isCenter ? 0.12 : 0.06,
                    }}
                  >
                    <Popup>
                      <div className="text-xs p-1">
                        <p className="font-bold text-violet-800">⬡ {cell.isCenter ? 'Merkez Bölge' : 'Hizmet Bölgesi'}</p>
                        <p className="text-slate-500 font-mono text-[10px] mt-0.5">H3 ID: {cell.id}</p>
                      </div>
                    </Popup>
                  </Polygon>
                ))}

                {/* 2. İşletmeler */}
                {layerIsletme && merchants.filter(m => m.latitude && m.longitude).map(m => (
                  <Marker key={m.id} position={[m.latitude!, m.longitude!]} icon={createRestaurantIcon(m.name, m.isOpen)}>
                    <Popup>
                      <div className="text-sm font-semibold">{m.name}</div>
                      <div className="text-xs text-slate-500">{m.activeOrders} aktif sipariş</div>
                      {m.address && <div className="text-xs text-slate-400 mt-1">{m.address}</div>}
                    </Popup>
                  </Marker>
                ))}

                {/* 3. Canlı Sipariş Paketleri */}
                {layerSiparisler && mapOrders.map(order => (
                  <Marker
                    key={`ord-${order.id}`}
                    position={[order.lat, order.lng]}
                    icon={createOrderIcon(order)}
                  >
                    <Popup>
                      <div className="p-1 min-w-[180px] space-y-1">
                        <div className="font-bold text-xs text-slate-900">
                          📦 Sipariş {order.orderCode ? `#${order.orderCode}` : ''}
                        </div>
                        <div className="text-xs text-slate-600">
                          {order.recipientName || (order as any).customerName || 'Müşteri'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {order.deliveryAddress || (order as any).deliveryAddressLine || 'Adres belirtilmemiş'}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs font-semibold">
                          <span className="text-slate-600">{statusInfo(String(order.status)).label}</span>
                          <span className="text-teal-700">{order.totalOrderAmount?.toFixed(2)} ₺</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* 4. Kuryeler */}
                {layerKurye && mapCouriers.map(c => (
                  <Marker key={c.id} position={[c.lat!, c.lng!]} icon={createCourierIcon(c, activeOrdersByCourier[c.id] ?? 0)}>
                    <Popup>
                      <div className="text-sm font-semibold">{c.firstName} {c.lastName}</div>
                      <div className="text-xs">{activeOrdersByCourier[c.id] ?? 0} aktif paket</div>
                      <div className="text-xs">{c.isOnline ? '🟢 Çevrimiçi' : '⚪ Çevrimdışı'}</div>
                      {c.phoneNumber && <div className="text-xs text-slate-500 mt-1">📞 {c.phoneNumber}</div>}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* ── Sol Üst Hızlı Harita Araçları (Ortala / Teslimatlar / Genişlet / Tam Ekran) ── */}
              <div
                className="absolute top-3 left-12 z-[1001] flex items-center space-x-2"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setRecenterTrigger(Date.now())}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-all active:scale-95"
                  title="Haritayı filo ve işletmelere göre ortala"
                >
                  <Target className="w-3.5 h-3.5 text-teal-600" />
                  <span>Ortala</span>
                </button>

                {/* 📦 Hızlı Teslimat Noktaları Kapat/Aç Butonu */}
                <button
                  type="button"
                  onClick={() => setLayerSiparisler(prev => !prev)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border shadow-md text-xs font-bold transition-all active:scale-95 ${
                    layerSiparisler
                      ? 'bg-rose-50/95 backdrop-blur-sm border-rose-300 text-rose-700 hover:bg-rose-100'
                      : 'bg-white/95 backdrop-blur-sm border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-rose-600'
                  }`}
                  title={layerSiparisler ? 'Teslimat Noktalarını Haritada Gizle' : 'Teslimat Noktalarını Haritada Göster'}
                >
                  <Package className={`w-3.5 h-3.5 ${layerSiparisler ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>Teslimatlar</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                      layerSiparisler
                        ? 'bg-rose-200 text-rose-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {layerSiparisler ? 'Açık' : 'Kapalı'}
                  </span>
                  {activeOrdersForMap.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({activeOrdersForMap.length})
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMapExpanded(prev => !prev)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95"
                  title={isMapExpanded ? 'Normal Boyuta Dön' : 'Haritayı Sayfaya Genişlet'}
                >
                  {isMapExpanded ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Daralt</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Genişlet</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullScreen(prev => !prev)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border shadow-md text-xs font-bold transition-all active:scale-95 ${
                    isFullScreen
                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                      : 'bg-white/95 backdrop-blur-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
                  title={isFullScreen ? 'Tam Ekrandan Çık (ESC)' : 'Tüm Ekranı Kapla'}
                >
                  {isFullScreen ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Tam Ekrandan Çık (ESC)</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tam Ekran</span>
                    </>
                  )}
                </button>
              </div>

              {/* ── Sağ Üst Katman Kontrol Paneli ── */}
              <div
                className="absolute top-3 right-3 z-[1001] bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-3.5 min-w-[175px]"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
              >
                {/* Legend */}
                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 border-b border-slate-100 pb-2 mb-2">
                  <span className="flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block shadow-sm" />Boşta</span>
                  <span className="flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm" />Onayladı</span>
                  <span className="flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block shadow-sm" />Yolda</span>
                </div>

                {/* Katman Başlığı */}
                <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <Layers className="w-3 h-3 text-slate-400" />
                  <span>Harita Katmanları</span>
                </div>

                {/* Toggle Butonları */}
                <div className="space-y-1.5">
                  {[
                    { label: 'Bölgeler (H3 Izgara)',          val: layerBolgeler,   set: setLayerBolgeler,   color: '#8b5cf6', badge: h3Cells.length },
                    { label: 'İşletmeler (Restoranlar)',      val: layerIsletme,    set: setLayerIsletme,    color: '#f59e0b', badge: merchants.length },
                    { label: 'Teslimat Noktaları (Siparişler)', val: layerSiparisler, set: setLayerSiparisler, color: '#ef4444', badge: activeOrdersForMap.length },
                    { label: 'Kuryeler (Canlı GPS)',          val: layerKurye,      set: setLayerKurye,      color: '#0d9488', badge: mapCouriers.length },
                  ].map(({ label, val, set, color, badge }) => (
                    <div
                      key={label}
                      onClick={() => set(!val)}
                      className="flex items-center justify-between cursor-pointer py-1.5 px-2 rounded-xl hover:bg-slate-100/80 transition-colors select-none group"
                    >
                      <span className="flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full transition-colors shadow-xs"
                          style={{ background: val ? color : '#cbd5e1' }}
                        />
                        <span className={`text-xs font-semibold transition-colors ${val ? 'text-slate-800' : 'text-slate-400'}`}>
                          {label}
                        </span>
                        {badge !== undefined && (
                          <span className="text-[10px] text-slate-400 font-normal">({badge})</span>
                        )}
                      </span>

                      {/* Kusursuz Switch — Yuvarlak dışarı taşmaz, aktif renkte yanar */}
                      <div
                        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out p-0.5"
                        style={{ backgroundColor: val ? color : '#e2e8f0' }}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                            val ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sipariş Tablosu ──────────────────────────────────────────────── */}
        {showOrders && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Başlık */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Radio className="w-4 h-4 text-teal-500" />
                <span>
                  Canlı Sipariş Akışı ({displayedOrders.length}{selectedCourierId ? ` / ${allOrders.length}` : ''})
                </span>
              </h2>
              <div className="flex items-center space-x-2 text-xs font-semibold">
                {stats && (
                  <>
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                      <span>Bekleyen {stats.pendingOrders}</span>
                    </span>
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                      <span>Hazırlık / Hazır {stats.readyOrders}</span>
                    </span>
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
                      <span>Atandı {stats.assignedOrders}</span>
                    </span>
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                      <span>Yolda {stats.onWayOrders}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Kurye Filtre Barı (Aktif Kurye Seçildiğinde) */}
            {selectedCourierId && (
              <div className="bg-teal-50 px-4 py-2 border-b border-teal-200 flex items-center justify-between text-xs text-teal-900">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🛵</span>
                  <span className="font-bold text-teal-800">
                    {couriers.find(c => c.id === selectedCourierId)?.firstName} {couriers.find(c => c.id === selectedCourierId)?.lastName}
                  </span>
                  <span className="text-slate-600">kuryesine atanan paketler filtrelendi ({displayedOrders.length} paket alt alta listeleniyor)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCourierId(null)}
                  className="px-2.5 py-1 bg-white border border-teal-300 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-100 transition-colors shadow-2xs"
                >
                  ✕ Filtreyi Temizle (Tüm Siparişleri Göster)
                </button>
              </div>
            )}

            {/* Tablo Başlıkları */}
            <div className="grid px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
              style={{ gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr 1.1fr' }}>
              <div className="pl-1">Sipariş & Restoran</div>
              <div>Müşteri & Adres</div>
              <div>Durum & Tutar</div>
              <div>Atanan Kurye</div>
              <div>Zaman ve Mesafeler</div>
            </div>

            {/* Satırlar */}
            <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
              {loading && displayedOrders.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-400">Yükleniyor...</div>
              )}
              {!loading && displayedOrders.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-400">
                  {selectedCourierId ? 'Bu kuryeye ait aktif sipariş bulunmuyor.' : 'Sipariş bulunamadı.'}
                </div>
              )}
              {displayedOrders.map((order) => {
                const src = sourceLabel((order as any).source);
                const merchantName = (order as any).merchantName ?? 'Restoran';
                const courierName = (order as any).courierName ?? null;
                const createdTime = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-';
                const minutesSince = order.createdAt ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000) : 0;

                return (
                  <div
                    key={order.id}
                    className="grid px-3 py-3 hover:bg-slate-50/60 transition-colors items-start text-sm"
                    style={{ gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr 1.1fr' }}
                  >
                    {/* Sipariş & Restoran */}
                    <div className="pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                          {order.orderCode ? `#${order.orderCode}` : `#${order.id.slice(-4)}`}
                        </span>
                        <span
                          className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border"
                          style={{ color: src.color, background: src.bg, borderColor: src.color + '40' }}
                        >
                          {src.label}
                        </span>
                      </div>
                      <p className="font-bold text-slate-700 text-xs mt-1.5 flex items-center gap-1">
                        <span>🏪</span>
                        <span>{merchantName}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {createdTime}
                        {' '}
                        <span className={`font-semibold ${minutesSince > 10 ? 'text-rose-500' : 'text-slate-500'}`}>
                          ({minutesSince} dk önce)
                        </span>
                      </p>
                    </div>

                    {/* Müşteri & Adres */}
                    <div
                      className="pr-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        // Eğer teslimat noktaları katmanı kapalıysa otomatik aç
                        if (!layerSiparisler) {
                          setLayerSiparisler(true);
                        }
                        let lat = (order as any).deliveryLatitude || (order as any).latitude;
                        let lng = (order as any).deliveryLongitude || (order as any).longitude;
                        if (!lat || !lng) {
                          const m = merchants.find(m => m.id === order.merchantId);
                          lat = m?.latitude ?? FALLBACK_CENTER[0];
                          lng = m?.longitude ?? FALLBACK_CENTER[1];
                        }
                        if (lat && lng) {
                          setFocusTarget({ lat: Number(lat), lng: Number(lng), zoom: 16, ts: Date.now() });
                          if (!showMap) setShowMap(true);
                        }
                      }}
                      title="Haritada teslimat konumuna odaklan (katman kapalıysa açar)"
                    >
                      <p className="font-semibold text-xs text-slate-700 leading-tight">
                        {(order as any).customerName ?? order.recipientName ?? 'Müşteri'} — {(order as any).customerPhone ?? order.recipientPhone ?? '-'}
                      </p>
                      <p className="text-[11px] text-teal-600 font-semibold mt-0.5 flex items-center gap-1">
                        <span>📍</span>
                        <span>{(order as any).deliveryNeighborhood ?? (order as any).deliveryDistrict ?? order.deliveryDistrict ?? 'Mahalle'}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight line-clamp-2">
                        {order.deliveryAddress ?? order.deliveryAddressLine ?? '-'}
                      </p>
                    </div>

                    {/* Durum & Tutar */}
                    <div className="pr-2">
                      <StatusDropdown
                        order={order}
                        onStatusChange={handleStatusChange}
                        onAssignClick={(o) => setAssignModalOrder(o)}
                      />
                      <p className="text-sm font-black text-slate-800 mt-2">{order.totalOrderAmount?.toFixed(2)} ₺</p>
                      <p className="text-[11px] text-slate-400">{paymentLabel((order as any).paymentMethod ?? String(order.paymentMethod ?? ''))}</p>
                    </div>

                    {/* Atanan Kurye */}
                    <div className="pr-2">
                      {courierName ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-800">
                              {courierName}
                            </p>
                            {activeOrdersByCourier[(order as any).courierId] !== undefined && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                📦 {activeOrdersByCourier[(order as any).courierId]}
                              </span>
                            )}
                          </div>
                          {!['Delivered', 'Cancelled', '5', '6'].includes(String(order.status)) ? (
                            <button
                              onClick={() => setAssignModalOrder(order)}
                              className="mt-1 text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline block"
                            >
                              Değiştir
                            </button>
                          ) : (
                            <span className="mt-0.5 text-[10px] font-medium text-emerald-600 block">
                              {String(order.status) === 'Delivered' || String(order.status) === '5' ? '✅ Teslim Etti' : '❌ İptal'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          {!['Delivered', 'Cancelled', '5', '6'].includes(String(order.status)) ? (
                            <>
                              <p className="text-xs text-amber-600 font-medium mb-1">⏳ Kurye Bekliyor</p>
                              <button
                                onClick={() => setAssignModalOrder(order)}
                                className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg transition-colors shadow-xs"
                              >
                                Kurye Ata
                              </button>
                            </>
                          ) : (
                            <p className="text-xs text-slate-400 font-medium">⚪ Kuryesiz Kapatıldı</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Zaman & Mesafe */}
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p>
                        <span className="text-slate-400">Atama:</span>{' '}
                        <span className="font-medium text-slate-700">
                          {(order as any).assignedAt
                            ? `${new Date((order as any).assignedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - ${timeSince((order as any).assignedAt)}`
                            : '-'}
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-400">Onay:</span>{' '}
                        <span className="font-medium text-slate-700">
                          {(order as any).pickedUpAt
                            ? `${new Date((order as any).pickedUpAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - ${timeSince((order as any).pickedUpAt)}`
                            : '-'}
                        </span>
                      </p>
                      {(order as any).estimatedDistanceKm != null && (
                        <p className="font-semibold" style={{ color: (order as any).estimatedDeliveryMinutes > 30 ? '#ef4444' : '#0f766e' }}>
                          Teslimat: {Number((order as any).estimatedDistanceKm).toFixed(2)} km
                          {(order as any).estimatedDeliveryMinutes != null && ` - ${(order as any).estimatedDeliveryMinutes} dk`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Kurye Modalı */}
      <CourierModal
        order={assignModalOrder}
        couriers={couriers && couriers.length > 0 ? couriers : activeCouriers}
        activeOrdersByCourier={activeOrdersByCourier}
        onClose={() => setAssignModalOrder(null)}
        onAssign={handleAssignCourier}
      />
    </div>
  );
};
