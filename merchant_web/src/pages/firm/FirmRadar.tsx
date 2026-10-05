// src/pages/firm/FirmRadar.tsx
//
// Filo Haritası — Kurye Firması için Canlı Tüm Kurye Takibi
// - Tüm restoranların kuryelerini tek haritada gösterir
// - Her restoran farklı renkle ayrıştırılır
// - SignalR LocationHub ile anlık GPS güncelleme
// - Kurye yan panel: isim, bakiye, durum, mahsuplaşma

import React, {
  useEffect, useMemo, useRef, useCallback, useState
} from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Radio, RefreshCw, Search, Wifi, WifiOff, RotateCcw,
  AlertTriangle, Users, CheckCircle2, TrendingUp, Bike,
  Package, Phone, Wallet, RotateCw, X,
} from 'lucide-react';
import { startSignalR } from '../../services/signalRService';
import { useCourierStore, selectCourierList } from '../../stores/courierStore';
import { financeService } from '../../services/financeService';
import { courierService } from '../../services/courierService';
import { merchantService, type MerchantDto } from '../../services/merchantService';
import { computeGlobalH3Grid, computeFitBounds } from '../../utils/h3Geometry';
import { getFirmOperatingZone } from '../../constants/locations';
import type { CourierState } from '../../types/courier';

// ── Fallback merkez (hiç restoran GPS verisi yoksa firmanın operasyon şehri) ─
const getFallbackCenter = (): [number, number] => getFirmOperatingZone().coords;

// ── Harita Otomatik Siga (fitBounds) ─────────────────────────────────────────
function MapAutoFit({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 1.2 });
  }, [bounds, map]);
  return null;
}

// ── Renk Paleti (restoran başına farklı renk) ────────────────────────────────
const PALETTE = [
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#22c55e', // green
  '#f97316', // orange
  '#a855f7', // purple
];

// ── İkon Üretici ─────────────────────────────────────────────────────────────
function createFleetIcon(courier: CourierState, color: string): L.DivIcon {
  const initial = (courier.firstName || 'K').charAt(0).toUpperCase();
  const isOnline = Boolean(courier.isOnline);
  const isAvailable = Boolean(courier.isAvailable);

  const bg = !isOnline ? '#64748b' : isAvailable ? color : '#f59e0b';
  const statusDot = isOnline
    ? `<div style="position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;background:${isAvailable ? '#10b981' : '#f59e0b'};border:2px solid white;box-shadow:0 0 8px ${isAvailable ? '#10b981' : '#f59e0b'};"></div>`
    : `<div style="position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;background:#94a3b8;border:2px solid white;"></div>`;

  const emoji = !isOnline ? '⚪' : isAvailable ? '🛵' : '📦';
  const statusText = !isOnline ? ' (Çevrimdışı)' : isAvailable ? ' (Müsait)' : ' (Meşgul)';

  return new L.DivIcon({
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="width:40px;height:40px;border-radius:50%;background:${bg};color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.3),0 0 0 3px white;font-size:15px;font-weight:900;position:relative;font-family:system-ui,sans-serif;">
          ${initial}${statusDot}
        </div>
        <div style="background:rgba(15,23,42,0.92);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;white-space:nowrap;font-family:system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);">
          ${emoji} ${courier.firstName} ${courier.lastName ? courier.lastName.charAt(0) + '.' : ''}${statusText}
        </div>
      </div>
    `,
    className: '',
    iconSize: [110, 60],
    iconAnchor: [55, 40],
    popupAnchor: [0, -42],
  });
}

// ── Firma Merkez İkonu ───────────────────────────────────────────────────────
const firmIcon = new L.DivIcon({
  html: `
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);color:white;width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(0,0,0,0.3),0 0 0 2px #14b8a6;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>
  `,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -48],
});

function createRadarRestaurantIcon(name: string, isOpen: boolean): L.DivIcon {
  return new L.DivIcon({
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
        <div style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg, #f59e0b, #d97706);color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(245,158,11,0.45),0 0 0 2.5px white;font-size:18px;position:relative;">
          🏪
          <div style="position:absolute;bottom:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:${isOpen ? '#10b981' : '#94a3b8'};border:2px solid white;"></div>
        </div>
        <div style="background:rgba(15,23,42,0.92);color:white;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:5px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);max-width:110px;overflow:hidden;text-overflow:ellipsis;">
          ${name}
        </div>
      </div>
    `,
    className: '',
    iconSize: [110, 56],
    iconAnchor: [55, 38],
    popupAnchor: [0, -40],
  });
}

// ── Harita Sıfırlama Butonu ──────────────────────────────────────────────────
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 13, { animate: true }); }, [center, map]);
  return null;
}

// ── Bağlantı Badge ───────────────────────────────────────────────────────────
function ConnectionBadge({ status }: { status: string }) {
  const cfg = {
    connected:    { Icon: Wifi,       label: 'Canlı',          cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    connecting:   { Icon: RotateCcw,  label: 'Bağlanıyor...',  cls: 'bg-amber-100 text-amber-700 border-amber-200',    spin: true },
    reconnecting: { Icon: RotateCcw,  label: 'Yeniden Bağl.', cls: 'bg-amber-100 text-amber-700 border-amber-200',    spin: true },
    disconnected: { Icon: WifiOff,    label: 'Bağlantı Yok',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    error:        { Icon: AlertTriangle, label: 'Hata',        cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  }[status] ?? { Icon: WifiOff, label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200', spin: false };

  const { Icon, label, cls, spin } = cfg as any;
  return (
    <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${cls}`}>
      <Icon className={`w-3.5 h-3.5 ${spin ? 'animate-spin' : ''}`} />
      <span>{label}</span>
    </div>
  );
}

// ── Ana Bileşen ──────────────────────────────────────────────────────────────
export const FirmRadar: React.FC = () => {
  const couriersMap   = useCourierStore((s) => s.couriers);
  const signalRStatus = useCourierStore((s) => s.signalRStatus);
  const { initCouriers } = useCourierStore();

  const [merchants, setMerchants] = useState<MerchantDto[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<CourierState | null>(null);
  const [reconciling, setRecon]   = useState(false);
  const [reconMsg, setReconMsg]   = useState<string | null>(null);
  const [resetCenter, setReset]   = useState(false);
  const [showH3Grid, setShowH3Grid] = useState(false);

  const signalRRef = useRef(false);

  // Tüm kuryeler (tüm restoranlardan)
  const courierList = useMemo(
    () => selectCourierList({ couriers: couriersMap } as Parameters<typeof selectCourierList>[0]),
    [couriersMap]
  );

  // Uber H3 Global Grid (İlk açılışta kasmaması için varsayılan kapalı ve sadece butonla açıldığında hesaplanır)
  const h3Cells = useMemo(() => {
    if (!showH3Grid) return [];
    const coords = merchants
      .filter(m => typeof m.latitude === 'number' && typeof m.longitude === 'number')
      .map(m => ({ lat: m.latitude!, lng: m.longitude! }));
    return computeGlobalH3Grid(coords, 2, 8);
  }, [merchants, showH3Grid]);

  // Filtrelenmiş
  const filtered = useMemo(() => {
    if (!search.trim()) return courierList;
    const q = search.toLowerCase();
    return courierList.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.phoneNumber.includes(q) ||
      (c.licensePlate ?? '').toLowerCase().includes(q)
    );
  }, [courierList, search]);

  // Dinamik harita merkezi: restoranların koordinatlarından otomatik hesaplanir
  const mapBounds = useMemo(() => computeFitBounds(merchants), [merchants]);
  const mapCenter: [number, number] = useMemo(() => {
    const lats = merchants.filter(m => typeof m.latitude === 'number').map(m => m.latitude as number);
    const lngs = merchants.filter(m => typeof m.longitude === 'number').map(m => m.longitude as number);
    if (lats.length === 0) return getFallbackCenter();
    return [
      lats.reduce((a, b) => a + b, 0) / lats.length,
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
    ];
  }, [merchants]);

  // Kurye → renk (merchantId bazında sabit renk)
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    const ids = [...new Set(courierList.map(c => c.merchantId ?? ''))];
    ids.forEach((id, i) => map.set(id, PALETTE[i % PALETTE.length]));
    return map;
  }, [courierList]);

  // Harita üzerinde gösterilecek kuryeler
  // GPS'i olanlar anlık koordinatlarında, henüz GPS atmayanlar harita merkezine yayılır
  const mappedCouriers = useMemo(() => {
    return filtered.map((c, index) => {
      if (c.lat != null && c.lng != null && (c.lat !== 0 || c.lng !== 0)) {
        return c;
      }
      const angle = (index * 2 * Math.PI) / Math.max(filtered.length, 1);
      const offsetLat = 0.004 * Math.sin(angle);
      const offsetLng = 0.004 * Math.cos(angle);
      return {
        ...c,
        lat: mapCenter[0] + offsetLat,
        lng: mapCenter[1] + offsetLng,
      };
    });
  }, [filtered, mapCenter]);

  // İstatistikler
  const stats = useMemo(() => ({
    total:     courierList.length,
    online:    courierList.filter(c => c.isOnline).length,
    available: courierList.filter(c => c.isAvailable && c.isOnline).length,
    onMap:     mappedCouriers.length,
  }), [courierList, mappedCouriers]);

  // Tüm kuryeler & restoranlar — API
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, mRes] = await Promise.allSettled([
        courierService.getAllCouriers(),
        merchantService.getAllMerchants(),
      ]);

      if (cRes.status === 'fulfilled' && cRes.value.isSuccess && cRes.value.data) {
        initCouriers(cRes.value.data);
      }
      if (mRes.status === 'fulfilled' && mRes.value.isSuccess && mRes.value.data) {
        setMerchants(mRes.value.data);
      }
    } catch {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  }, [initCouriers]);

  // Başlat
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await loadAll();
      if (!mounted) return;
      if (!signalRRef.current) {
        signalRRef.current = true;
        await startSignalR();
      }
    };
    init();
    return () => {
      mounted = false;
      signalRRef.current = false;
      // Ortak SignalR bağlantısı sayfa çıkışında kapatılmaz (diğer sayfalar kullanıyor); logout'ta kapanır.
    };
  }, [loadAll]);

  // Mahsuplaşma
  const handleReconcile = async () => {
    if (!selected) return;
    setRecon(true);
    setReconMsg(null);
    try {
      const res = await financeService.reconcileCourier(selected.id);
      if (res.isSuccess) {
        setReconMsg(`✅ ${selected.firstName} ${selected.lastName} mahsuplaşması tamamlandı.`);
        await loadAll();
        setSelected((prev: CourierState | null) => prev ? { ...prev, currentBalance: 0 } : null);
      } else {
        setReconMsg(`❌ ${res.message}`);
      }
    } catch {
      setReconMsg('❌ Mahsuplaşma başarısız.');
    } finally {
      setRecon(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Başlık ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-teal-500 animate-pulse" />
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Filo Haritası</h1>
            <p className="text-sm text-slate-500">Tüm kuryelerin canlı GPS konumları</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <ConnectionBadge status={signalRStatus} />
          <button
            onClick={loadAll}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* ── KPI Kartları ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Kurye',    value: stats.total,     Icon: Users,         cls: 'text-teal-600 bg-teal-50' },
          { label: 'Online',          value: stats.online,    Icon: Wifi,          cls: 'text-emerald-600 bg-emerald-50' },
          { label: 'Müsait',          value: stats.available, Icon: CheckCircle2,  cls: 'text-amber-600 bg-amber-50' },
          { label: 'Haritada',        value: stats.onMap,     Icon: MapPin,        cls: 'text-violet-600 bg-violet-50' },
        ].map(({ label, value, Icon, cls }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${cls}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900">{value}</p>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Hata */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-semibold text-rose-800">{error}</p>
        </div>
      )}

      {/* ── Harita + Yan Panel ──────────────────────────────────── */}
      <div className="flex gap-4 h-[calc(100vh-320px)] min-h-[520px]">

        {/* Harita */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200/80 shadow-lg relative">
          <MapContainer
            center={mapCenter}
            zoom={12}
            scrollWheelZoom={true}
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Dinamik fitBounds: tum restoranlar gorunecek sekilde otomatik zoom */}
            <MapAutoFit bounds={mapBounds} />

            {resetCenter && <MapRecenter center={mapCenter} />}

            {/* Filo merkez pini (harita centroid'i) */}
            <Marker position={mapCenter} icon={firmIcon}>
              <Popup>
                <div className="font-bold text-sm text-teal-700">Filo Operasyon Merkezi</div>
                <div className="text-xs text-slate-500">{merchants.length} restoran bölgesi</div>
              </Popup>
            </Marker>

            {/* Uber H3 Altıgen Izgaraları (h3-js Global Grid - Mükerrersiz Tekilleştirilmiş) */}
            {showH3Grid && h3Cells.map(cell => (
              <Polygon
                key={`h3-${cell.id}`}
                positions={cell.boundary}
                pathOptions={{
                  color: cell.isCenter ? '#7c3aed' : '#8b5cf6',
                  weight: cell.isCenter ? 2.5 : 1.8,
                  dashArray: cell.isCenter ? undefined : '4, 4',
                  fillColor: cell.isCenter ? '#a855f7' : '#c084fc',
                  fillOpacity: cell.isCenter ? 0.15 : 0.08,
                }}
              >
                <Popup>
                  <div className="min-w-[170px] font-sans p-1 text-xs space-y-1">
                    <div className="flex items-center space-x-1.5 font-black text-violet-900 border-b border-violet-100 pb-1">
                      <span className="text-base">⬡</span>
                      <span>Uber H3 Hexagon {cell.isCenter ? '(Restoran Merkezi)' : '(Hizmet Bölgesi)'}</span>
                    </div>
                    <p className="font-mono text-slate-600 text-[11px]">ID: {cell.id}</p>
                    <p className="text-slate-500 text-[11px]">Çözünürlük: Res-8 Global Grid</p>
                  </div>
                </Popup>
              </Polygon>
            ))}

            {/* Restoranlar */}
            {merchants
              .filter(m => typeof m.latitude === 'number' && typeof m.longitude === 'number')
              .map(m => (
                <Marker
                  key={`radar-m-${m.id}`}
                  position={[m.latitude!, m.longitude!]}
                  icon={createRadarRestaurantIcon(m.name, m.isOpen)}
                >
                  <Popup>
                    <div className="min-w-[170px] space-y-1 font-sans">
                      <p className="font-black text-sm text-slate-900">🏪 {m.name}</p>
                      {m.address && <p className="text-xs text-slate-500">{m.address}</p>}
                      {m.phoneNumber && <p className="text-xs text-slate-500">{m.phoneNumber}</p>}
                      <div className="flex items-center space-x-1.5 pt-1">
                        <span className={`w-2 h-2 rounded-full ${m.isOpen ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span className="text-xs font-semibold text-slate-600">{m.isOpen ? 'Açık' : 'Kapalı'}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Kuryeler */}
            {mappedCouriers.map(courier => (
              <Marker
                key={courier.id}
                position={[courier.lat!, courier.lng!]}
                icon={createFleetIcon(courier, colorMap.get(courier.merchantId ?? '') ?? PALETTE[0])}
                eventHandlers={{ click: () => setSelected(courier) }}
              >
                <Popup>
                  <div className="min-w-[160px] space-y-1 font-sans">
                    <p className="font-black text-sm text-slate-900">{courier.firstName} {courier.lastName}</p>
                    <p className="text-xs text-slate-500">{courier.phoneNumber}</p>
                    <div className="flex items-center space-x-1.5 pt-1">
                      <span className={`w-2 h-2 rounded-full ${courier.isAvailable ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <span className="text-xs font-semibold text-slate-600">{courier.isAvailable ? 'Müsait' : 'Meşgul'}</span>
                    </div>
                    {courier.currentBalance !== undefined && (
                      <p className="text-xs font-bold text-teal-700 pt-0.5">
                        Bakiye: ₺{Math.abs(courier.currentBalance).toFixed(2)}
                      </p>
                    )}
                    <button
                      onClick={() => setSelected(courier)}
                      className="mt-2 w-full text-xs font-bold py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                    >
                      Detayı Gör →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Harita üzeri: Arama */}
          <div className="absolute top-3 left-3 z-[500] w-56">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Kurye veya restoran ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          {/* H3 Altıgen Katman Aç/Kapa Butonu */}
          <button
            onClick={() => setShowH3Grid(prev => !prev)}
            className={`absolute top-3 right-3 z-[500] px-3 py-2 rounded-xl text-xs font-bold shadow-md border transition-all flex items-center space-x-1.5 ${
              showH3Grid
                ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-700 shadow-violet-200'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="Uber H3 Altıgen Hücre Ağı Katmanı"
          >
            <span className="text-sm">⬡</span>
            <span>H3 Altıgen Ağı: {showH3Grid ? 'Açık' : 'Kapalı'}</span>
          </button>

          {/* Merkeze dön butonu */}
          <button
            onClick={() => { setReset(true); setTimeout(() => setReset(false), 100); }}
            className="absolute bottom-3 right-3 z-[500] bg-white border border-slate-200 rounded-xl p-2.5 shadow-md hover:bg-slate-50 transition-all"
            title="Merkeze dön"
          >
            <MapPin className="w-4 h-4 text-teal-600" />
          </button>

          {/* Renk Açıklaması */}
          <div className="absolute bottom-3 left-3 z-[500] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 shadow-md space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">İşaretler</p>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-amber-500" />
              <span className="text-[11px] font-semibold text-slate-600">Restoran</span>
            </div>
            {[
              { color: '#10b981', label: 'Müsait Kurye' },
              { color: '#f59e0b', label: 'Meşgul Kurye' },
              { color: '#94a3b8', label: 'Offline Kurye' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[11px] font-semibold text-slate-600">{label}</span>
              </div>
            ))}
            <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0 border border-violet-600 bg-violet-400/40" />
              <span className="text-[11px] font-semibold text-violet-700">⬡ H3 Altıgen Izgarası</span>
            </div>
          </div>
        </div>

        {/* ── Yan Panel: Kurye Listesi / Detay ─────────────────── */}
        <div className="w-72 flex flex-col space-y-3 overflow-hidden">

          {selected ? (
            /* Seçili Kurye Detayı */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex-1 overflow-y-auto">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-sm">Kurye Detayı</h3>
                <button onClick={() => { setSelected(null); setReconMsg(null); }} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Avatar */}
                <div className="flex items-center space-x-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-lg"
                    style={{ background: colorMap.get(selected.merchantId ?? '') ?? PALETTE[0] }}
                  >
                    {selected.firstName.charAt(0)}{selected.lastName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{selected.firstName} {selected.lastName}</p>
                    <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selected.isOnline
                        ? selected.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selected.isOnline ? (selected.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400') : 'bg-slate-400'}`} />
                      <span>{selected.isOnline ? (selected.isAvailable ? 'Müsait' : 'Meşgul') : 'Offline'}</span>
                    </span>
                  </div>
                </div>

                {/* Detaylar */}
                <div className="space-y-2">
                  {[
                    { icon: Phone,   label: 'Telefon', value: selected.phoneNumber },
                    { icon: Bike,    label: 'Araç',    value: `${selected.vehicleBrand ?? ''} ${selected.vehicleModel ?? ''}`.trim() || '—' },
                    { icon: Package, label: 'Plaka',   value: selected.licensePlate || '—' },
                    {
                      icon: Wallet,
                      label: 'Bakiye',
                      value: `${(selected.currentBalance ?? 0) >= 0 ? '' : '-'}₺${Math.abs(selected.currentBalance ?? 0).toFixed(2)}`,
                      cls: (selected.currentBalance ?? 0) > 0 ? 'text-rose-600 font-black' : (selected.currentBalance ?? 0) < 0 ? 'text-emerald-600 font-black' : 'text-slate-600',
                    },
                  ].map(({ icon: Icon, label, value, cls }) => (
                    <div key={label} className="flex items-center space-x-3 py-1.5 border-b border-slate-50">
                      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                        <p className={`text-sm font-bold truncate ${cls ?? 'text-slate-800'}`}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* GPS */}
                {selected.lat != null && selected.lng != null && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Konum</p>
                    <p className="text-xs font-mono text-teal-800">{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</p>
                  </div>
                )}

                {/* Mahsuplaşma */}
                {reconMsg && (
                  <div className={`p-3 rounded-xl text-xs font-semibold border ${reconMsg.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    {reconMsg}
                  </div>
                )}

                <button
                  onClick={handleReconcile}
                  disabled={reconciling || (selected.currentBalance ?? 0) === 0}
                  className="w-full py-3 rounded-xl text-sm font-black transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed bg-teal-500 hover:bg-teal-600 text-white shadow-sm shadow-teal-500/20"
                >
                  {reconciling
                    ? <><RotateCw className="w-4 h-4 animate-spin" /><span>İşleniyor...</span></>
                    : (selected.currentBalance ?? 0) === 0
                    ? <><CheckCircle2 className="w-4 h-4" /><span>Bakiye Temiz</span></>
                    : <><TrendingUp className="w-4 h-4" /><span>Mahsuplaş</span></>
                  }
                </button>
              </div>
            </div>
          ) : (
            /* Tüm Kurye Listesi */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Kurye Listesi <span className="text-teal-600">{filtered.length}</span>
                </p>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bike className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-400">Kurye bulunamadı</p>
                  </div>
                ) : filtered.map(courier => (
                  <button
                    key={courier.id}
                    onClick={() => { setSelected(courier); setReconMsg(null); }}
                    className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                      style={{ background: !courier.isOnline ? '#94a3b8' : (colorMap.get(courier.merchantId ?? '') ?? PALETTE[0]) }}
                    >
                      {courier.firstName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{courier.firstName} {courier.lastName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{courier.licensePlate ?? courier.phoneNumber}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`w-2 h-2 rounded-full inline-block ${courier.isOnline ? (courier.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400') : 'bg-slate-300'}`} />
                      {(courier.currentBalance ?? 0) !== 0 && (
                        <p className={`text-[10px] font-bold mt-0.5 ${(courier.currentBalance ?? 0) > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                          ₺{Math.abs(courier.currentBalance ?? 0).toFixed(0)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
