// src/pages/LiveRadar.tsx
//
// Canlı Saha Radarı — SignalR + REST API + Leaflet Harita
// - Sayfa açıldığında işletmeye ait kuryeleri REST'ten çeker (initCouriers)
// - SignalR LocationHub'a JWT ile bağlanır
// - ReceiveLocationUpdate olayı geldiğinde harita anlık güncellenir
// - Unmount'ta bağlantı temiz kapatılır (bellek sızıntısı yok)

import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { computeGlobalH3Grid, computeFitBounds } from '../utils/h3Geometry';
import {
  Bike,
  Navigation,
  RefreshCw,
  Search,
  Radio,
  Clock,
  Package,
  Wifi,
  WifiOff,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useCourierStore, selectCourierList } from '../stores/courierStore';
import { courierService } from '../services/courierService';
import { merchantService } from '../services/merchantService';
import { startSignalR, stopSignalR } from '../services/signalRService';
import type { CourierState } from '../types/courier';

// ── 1. Dinamik Harita Merkezi (Çok Şehirli / Global-Scale) ────────────────────
// Giriş yapan restoranın koordinatlarını kullanır. Henüz koordinat yoksa
// tarayıcı GPS'i veya Türkiye merkezi [39.0, 35.0] fallback olarak devreye girer.
const TURKEY_DEFAULT_CENTER: [number, number] = [39.0, 35.0];
const LOCATION_KEY = 'merchant_location';

function getInitialMapCenter(): [number, number] {
  const merchant = useAuthStore.getState().merchant;
  if (
    typeof merchant?.latitude === 'number' &&
    typeof merchant?.longitude === 'number' &&
    merchant.latitude !== 0 &&
    merchant.longitude !== 0
  ) {
    return [merchant.latitude, merchant.longitude];
  }

  try {
    const saved = localStorage.getItem(LOCATION_KEY);
    if (saved) {
      const { lat, lng } = JSON.parse(saved) as { lat: number; lng: number };
      if (typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
        return [lat, lng];
      }
    }
  } catch {
    // ignore
  }
  return TURKEY_DEFAULT_CENTER;
}

// ── Özel Harita İkonları ─────────────────────────────────────────────────────

const restaurantIcon = new L.DivIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 20px rgba(0,0,0,0.3), 0 0 0 2px #f59e0b;
      position: relative;
    ">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
        <path d="M2 7h20"/>
      </svg>
    </div>
  `,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -48],
});

function createCourierIcon(courier: CourierState): L.DivIcon {
  const isAvailable = courier.isAvailable;
  const isOnline = courier.isOnline;
  const initial = courier.firstName.charAt(0).toUpperCase();

  // Renk mantığı:
  // 🟢 Boşta (isAvailable=true, isOnline=true)  → emerald
  // 🟡 Meşgul (isAvailable=false, isOnline=true) → amber
  // ⚫ Çevrimdışı                                → slate
  const bgColor = !isOnline ? '#64748b' : isAvailable ? '#10b981' : '#f59e0b';
  const pulseColor = !isOnline ? 'transparent' : isAvailable ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)';
  const fullName = `${courier.firstName} ${courier.lastName}`;
  const displayName = fullName.length > 12 ? `${fullName.substring(0, 11)}…` : fullName;

  return new L.DivIcon({
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px;">
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          background-color: ${bgColor};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.2), 0 0 0 3px white;
          font-size: 15px;
          font-weight: 900;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          position: relative;
        ">
          ${initial}
          ${isOnline ? `
            <div style="
              position: absolute;
              bottom: 0;
              right: 0;
              width: 11px;
              height: 11px;
              border-radius: 9999px;
              background: ${isAvailable ? '#10b981' : '#f59e0b'};
              border: 2px solid white;
              box-shadow: 0 0 0 2px ${pulseColor};
            "></div>
          ` : ''}
        </div>
        <div style="
          background: rgba(15,23,42,0.88);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
          white-space: nowrap;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        ">
          🛵 ${displayName}
        </div>
      </div>
    `,
    className: '',
    iconSize: [80, 56],
    iconAnchor: [40, 38],
    popupAnchor: [0, -42],
  });
}

// ── 3. Harita Sınırları ve Otomatik Zoom (fitBounds) ──────────────────────────
function MapAutoFit({
  center,
  couriers,
  focusCenter,
}: {
  center: [number, number];
  couriers: Array<{ lat?: number | null; lng?: number | null }>;
  focusCenter: [number, number] | null;
}) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (focusCenter) {
      map.flyTo(focusCenter, Math.max(map.getZoom(), 15), { animate: true });
      return;
    }

    // Sayfa açıldığında veya kurye verisi geldiğinde restoranı ve kuryeleri ekrana sığdır
    if (!hasFittedRef.current) {
      const validPoints: Array<{ latitude: number; longitude: number }> = [
        { latitude: center[0], longitude: center[1] },
      ];

      couriers.forEach((c) => {
        if (typeof c.lat === 'number' && typeof c.lng === 'number' && c.lat !== 0 && c.lng !== 0) {
          validPoints.push({ latitude: c.lat, longitude: c.lng });
        }
      });

      if (validPoints.length > 1) {
        const bounds = computeFitBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        hasFittedRef.current = true;
      } else if (center[0] !== TURKEY_DEFAULT_CENTER[0] || center[1] !== TURKEY_DEFAULT_CENTER[1]) {
        map.setView(center, 14);
        hasFittedRef.current = true;
      }
    }
  }, [center, couriers, focusCenter, map]);

  return null;
}

// ── SignalR Durum Göstergesi ─────────────────────────────────────────────────
function ConnectionBadge({ status }: { status: string }) {
  const config = {
    connected: { icon: Wifi, label: 'Canlı Bağlı', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    connecting: { icon: RotateCcw, label: 'Bağlanıyor...', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    reconnecting: { icon: RotateCcw, label: 'Yeniden Bağlanıyor', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    disconnected: { icon: WifiOff, label: 'Bağlantı Yok', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    error: { icon: AlertTriangle, label: 'Bağlantı Hatası', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  }[status] ?? { icon: WifiOff, label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' };

  const { icon: Icon, label, color } = config;
  const isAnimating = status === 'connecting' || status === 'reconnecting';

  return (
    <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${color}`}>
      <Icon className={`w-3.5 h-3.5 ${isAnimating ? 'animate-spin' : ''}`} />
      <span>{label}</span>
    </div>
  );
}

// ── Ana Bileşen ──────────────────────────────────────────────────────────────
export const LiveRadar: React.FC = () => {
  const { merchant, user, updateMerchant } = useAuthStore();
  const merchantId = merchant?.id;
  const isFirmAdmin = user?.roles?.some((r) => ['CourierFirm', 'Admin', 'FirmAdmin'].includes(r));

  // Store selectors
  const couriersMap = useCourierStore((s) => s.couriers);
  const signalRStatus = useCourierStore((s) => s.signalRStatus);
  const { initCouriers } = useCourierStore();

  // 1. Dinamik Harita Merkezi (Giriş yapan restoran koordinatları)
  const [mapCenter, setMapCenter] = useState<[number, number]>(getInitialMapCenter);

  // Restoran koordinatlarını authStore, backend ayarları ve tarayıcı GPS'inden dinamik güncelle
  useEffect(() => {
    if (
      typeof merchant?.latitude === 'number' &&
      typeof merchant?.longitude === 'number' &&
      merchant.latitude !== 0 &&
      merchant.longitude !== 0
    ) {
      setMapCenter([merchant.latitude, merchant.longitude]);
      return;
    }

    if (merchant?.id) {
      merchantService.getSettings(merchant.id).then((res) => {
        if (
          res.isSuccess &&
          res.data &&
          typeof res.data.latitude === 'number' &&
          typeof res.data.longitude === 'number' &&
          res.data.latitude !== 0 &&
          res.data.longitude !== 0
        ) {
          setMapCenter([res.data.latitude, res.data.longitude]);
          updateMerchant({
            latitude: res.data.latitude,
            longitude: res.data.longitude,
            address: res.data.address,
            isOpen: res.data.isOpen,
            defaultPackageFee: res.data.defaultPackageFee,
            dispatchMode: res.data.dispatchMode,
          });
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
            () => {}
          );
        }
      });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, [merchant?.id, merchant?.latitude, merchant?.longitude, updateMerchant]);

  // Arama filtresi
  const [searchQuery, setSearchQuery] = useState('');

  // Yükleme & hata durumu
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Harita odak merkezi (kullanıcı kurye seçtiğinde oraya uçar)
  const [focusCenter, setFocusCenter] = useState<[number, number] | null>(null);
  const [showH3Grid, setShowH3Grid] = useState<boolean>(false);

  // Memoize kurye listesi (Map → Dizi dönüşümü gereksiz yeniden yapılmasın)
  const courierList = useMemo(() => selectCourierList({ couriers: couriersMap } as Parameters<typeof selectCourierList>[0]), [couriersMap]);

  // Filtrelenmiş liste
  const filteredCouriers = useMemo(() => {
    if (!searchQuery.trim()) return courierList;
    const q = searchQuery.toLowerCase();
    return courierList.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.licensePlate.toLowerCase().includes(q) ||
        c.phoneNumber.includes(q)
    );
  }, [courierList, searchQuery]);

  // Harita koordinatları tamamlanmış kuryeler
  const mappedCouriers = useMemo(() => {
    return filteredCouriers.map((c, idx) => {
      let lat = c.lat;
      let lng = c.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number' || lat === 0 || lng === 0) {
        const offsetLat = ((idx % 3) - 1) * 0.007 + Math.floor(idx / 3) * 0.004;
        const offsetLng = (((idx + 1) % 3) - 1) * 0.007;
        lat = mapCenter[0] + offsetLat;
        lng = mapCenter[1] + offsetLng;
      }
      return { ...c, lat, lng };
    });
  }, [filteredCouriers, mapCenter]);

  // 2. Petek ID'lerini Toplama — Uber h3-js Global Grid (Sadece Restoran Hizmet Bölgesi — performansı korumak için butonla açılmadıkça hesaplanmaz):
  const h3Cells = useMemo(() => {
    if (!showH3Grid) return [];
    if (!mapCenter || (mapCenter[0] === TURKEY_DEFAULT_CENTER[0] && mapCenter[1] === TURKEY_DEFAULT_CENTER[1])) {
      return [];
    }

    // Sadece işletmenin kendi merkezini baz alarak sabit çekirdek kapsama alanını (k=2 -> 19 petek) üretir
    return computeGlobalH3Grid([{ lat: mapCenter[0], lng: mapCenter[1] }], 2, 8);
  }, [mapCenter, showH3Grid]);

  // İstatistikler
  const stats = useMemo(() => ({
    total: courierList.length,
    online: courierList.filter((c) => c.isOnline).length,
    available: courierList.filter((c) => c.isAvailable && c.isOnline).length,
    busy: courierList.filter((c) => !c.isAvailable && c.isOnline).length,
  }), [courierList]);

  // ── Kurye Listesini Yükle ─────────────────────────────────────────────────
  const loadCouriers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      let couriers: CourierState[] = [];
      if (merchantId) {
        const mRes = await courierService.getCouriersByMerchant(merchantId);
        if (mRes.isSuccess && mRes.data && mRes.data.length > 0) {
          couriers = mRes.data;
        }
      }

      // İşletmeye özel atanmış kurye yoksa filo ve havuz kuryelerini yükle
      if (couriers.length === 0) {
        const allRes = await courierService.getAllCouriers();
        if (allRes.isSuccess && allRes.data) {
          couriers = allRes.data;
        }
      }

      initCouriers(couriers);
    } catch {
      setLoadError('Kurye listesi yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, initCouriers]);

  // ── SignalR Yaşam Döngüsü ─────────────────────────────────────────────────
  // useRef ile SignalR singleton'ı başlatıldı mı izle (StrictMode çift çağrı koruması)
  const signalRStartedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // REST: kurye listesini başlat
      await loadCouriers();
      if (!mounted) return;

      // SignalR: hub'a bağlan
      if (!signalRStartedRef.current) {
        signalRStartedRef.current = true;
        await startSignalR();
      }
    };

    init();

    // Cleanup: bileşen unmount olduğunda bağlantıyı temiz kapat
    return () => {
      mounted = false;
      signalRStartedRef.current = false;
      // NOT: stopSignalR() asenkron ama await etmiyoruz (cleanup sync olmalı)
      // Bağlantı kırılmaz, sadece tab/component kapandığında kesilir
      stopSignalR().catch(console.warn);
    };
  }, [loadCouriers]);

  return (
    <div className="space-y-5">
      {/* ── Başlık & Durum ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-amber-500 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Canlı Saha Radarı & Dispeçer
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Kuryelerinizin anlık GPS konumlarını ve saha hareketlerini canlı haritada izleyin.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <ConnectionBadge status={signalRStatus} />
          <button
            onClick={loadCouriers}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-semibold shadow-xs active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* ── Hata Bildirimi ──────────────────────────────────────────────── */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* ── Özet İstatistik Kartları ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Toplam Kurye</p>
            <h3 className="text-xl font-black text-slate-900">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Çevrimiçi</p>
            <h3 className="text-xl font-black text-slate-900">{stats.online}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Boşta</p>
            <h3 className="text-xl font-black text-slate-900">{stats.available}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Siparişte</p>
            <h3 className="text-xl font-black text-slate-900">{stats.busy}</h3>
          </div>
        </div>
      </div>

      {/* GPS Kalibrasyon Uyarısı (Kurye firması veya Admin için değil, sadece konumu eksik restoranlar için) */}
      {!isFirmAdmin && (!merchant?.latitude || !merchant?.longitude || (merchant.latitude === 0 && merchant.longitude === 0)) && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 animate-in fade-in duration-300">
          <div className="flex items-center space-x-2.5 text-xs md:text-sm font-semibold">
            <span className="text-xl">⚠️</span>
            <div>
              <strong className="text-amber-900 font-extrabold">İşletme GPS Konumu Belirtilmemiş:</strong> Canlı radarda kurye mesafelerinin ve H3 altıgen lojistik ağının doğru hesaplanabilmesi için lütfen harita konumunuzu kaydedin.
            </div>
          </div>
          <Link
            to="/settings"
            className="shrink-0 self-start sm:self-auto bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1"
          >
            <span>Konumumu Kaydet →</span>
          </Link>
        </div>
      )}

      {/* ── Leaflet Harita ─────────────────────────────────────────────────── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="h-[520px] w-full rounded-xl overflow-hidden relative">
          {/* Harita Üstü H3 / Kapsama Katmanı Aç/Kapat Butonu */}
          <div className="absolute top-3 right-3 z-[1000] flex items-center space-x-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-md">
            <button
              type="button"
              onClick={() => setShowH3Grid((prev) => !prev)}
              className={`inline-flex items-center space-x-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all active:scale-95 ${
                showH3Grid
                  ? 'bg-purple-600 text-white shadow-xs hover:bg-purple-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={showH3Grid ? 'Altıgen ağını gizle' : 'Kapsama ve H3 altıgen ağını göster'}
            >
              <span className="text-sm leading-none">⬡</span>
              <span>{showH3Grid ? 'H3 Ağı Açık' : 'H3 Kapsama Ağını Aç'}</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
              {showH3Grid ? `${h3Cells.length} Aktif Bölge` : 'Sade Harita'}
            </span>
          </div>

          <MapContainer
            center={mapCenter}
            zoom={14}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            {/* Otomatik fitBounds ve Odak Yönetimi */}
            <MapAutoFit
              center={mapCenter}
              couriers={mappedCouriers}
              focusCenter={focusCenter}
            />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Uber H3 Altıgen Dağıtım Ağı (h3-js Global Geodesic Grid - Mükerrersiz) */}
            {showH3Grid && h3Cells.map((cell) => (
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
                  <div style={{ fontFamily: 'sans-serif', padding: '4px 2px', fontSize: '12px' }}>
                    <p style={{ fontWeight: 800, color: cell.isCenter ? '#6d28d9' : '#7c3aed' }}>
                      ⬡ Uber H3 {cell.isCenter ? 'Merkez Hücresi' : 'Bölge Hücresi'}
                    </p>
                    <p style={{ color: '#334155', fontWeight: 600, marginTop: '2px', fontFamily: 'monospace' }}>
                      ID: {cell.id}
                    </p>
                    <p style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                      Uber H3 Global Grid (Çözünürlük: Res-8)
                    </p>
                  </div>
                </Popup>
              </Polygon>
            ))}

            {/* İşletme / Restoran Konumu */}
            <Marker position={mapCenter} icon={restaurantIcon}>
              <Popup>
                <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '4px 2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                    <span style={{ color: '#f59e0b' }}>🏪</span>
                    <span>{merchant?.name ?? 'Restoran Merkezi'}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    İskenderun — Paket Çıkış Noktası
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Canlı Kurye Marker'ları */}
            {mappedCouriers
              .filter((c) => c.lat !== null && c.lng !== null)
              .map((courier) => (
                <Marker
                  key={courier.id}
                  position={[courier.lat!, courier.lng!]}
                  icon={createCourierIcon(courier)}
                >
                  <Popup>
                    <div style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      minWidth: '200px',
                      padding: '4px 2px',
                    }}>
                      {/* Başlık */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                            {courier.firstName} {courier.lastName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                            📞 {courier.phoneNumber}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '20px',
                          background: courier.isAvailable ? '#d1fae5' : '#fef3c7',
                          color: courier.isAvailable ? '#065f46' : '#92400e',
                        }}>
                          {courier.isAvailable ? 'Boşta' : 'Siparişte'}
                        </span>
                      </div>

                      {/* Detaylar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: '#475569' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Araç:</span>
                          <span style={{ fontWeight: 600 }}>{courier.vehicleBrand} {courier.vehicleModel}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Plaka:</span>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{courier.licensePlate}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Hız:</span>
                          <span style={{ fontWeight: 600 }}>{courier.speed > 0 ? `${courier.speed} km/h` : 'Durdu / Bekliyor'}</span>
                        </div>
                        {courier.lastUpdate && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>Güncelleme:</span>
                            <span style={{ fontWeight: 600, color: '#10b981' }}>
                              {courier.lastUpdate.toLocaleTimeString('tr-TR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>

          {/* Yükleme Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-xl z-[999]">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-600">Kurye konumları yükleniyor...</p>
              </div>
            </div>
          )}

          {/* H3 Altıgen Katman Aç/Kapa Butonu */}
          <button
            onClick={() => setShowH3Grid(prev => !prev)}
            className={`absolute top-4 right-4 z-[990] px-3 py-1.5 rounded-xl text-xs font-bold shadow-md border transition-all flex items-center space-x-1.5 ${
              showH3Grid
                ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-700 shadow-violet-200'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="Uber H3 Altıgen Hücre Ağı Katmanı"
          >
            <span className="text-sm">⬡</span>
            <span>H3 Altıgen Ağı: {showH3Grid ? 'Açık' : 'Kapalı'}</span>
          </button>

          {/* Boş durum overlay */}
          {!isLoading && courierList.filter((c) => c.lat !== null).length === 0 && courierList.length > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/85 text-white text-xs font-semibold px-4 py-2 rounded-xl z-[999] backdrop-blur-sm">
              🛵 Kurye GPS sinyali bekleniyor...
            </div>
          )}
        </div>
      </div>

      {/* ── Kurye Canlı Liste Tablosu ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-base text-slate-900">
            Saha Kurye Durum Listesi ({filteredCouriers.length})
          </h3>
          <div className="relative w-52">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İsim, plaka veya tel..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Yükleniyor skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Kurye Listesi */}
        {!isLoading && (
          <>
            {filteredCouriers.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                {courierList.length === 0
                  ? 'Bu işletmeye tanımlı kurye bulunamadı.'
                  : 'Arama kriterlerine uyan kurye yok.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCouriers.map((courier) => (
                  <div
                    key={courier.id}
                    className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-all cursor-default"
                  >
                    {/* Avatar & Bilgi */}
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
                        style={{
                          background: !courier.isOnline
                            ? '#64748b'
                            : courier.isAvailable
                            ? '#10b981'
                            : '#f59e0b',
                        }}
                      >
                        {courier.firstName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {courier.firstName} {courier.lastName}
                        </h4>
                        <p className="text-xs text-slate-500">{courier.phoneNumber}</p>
                      </div>
                    </div>

                    {/* Araç Bilgisi */}
                    <div className="hidden md:block text-center">
                      <span className="text-xs text-slate-400 block">Araç / Plaka</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {courier.vehicleBrand} • {courier.licensePlate}
                      </span>
                    </div>

                    {/* Son Konum */}
                    <div className="hidden sm:block text-center">
                      <span className="text-xs text-slate-400 block">Son Sinyal</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {courier.lastUpdate
                          ? courier.lastUpdate.toLocaleTimeString('tr-TR')
                          : '—'}
                      </span>
                    </div>

                    {/* Durum & Aksiyon */}
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold border"
                        style={{
                          background: !courier.isOnline
                            ? '#f8fafc'
                            : courier.isAvailable
                            ? '#d1fae5'
                            : '#fef3c7',
                          color: !courier.isOnline
                            ? '#64748b'
                            : courier.isAvailable
                            ? '#065f46'
                            : '#92400e',
                          borderColor: !courier.isOnline
                            ? '#e2e8f0'
                            : courier.isAvailable
                            ? '#a7f3d0'
                            : '#fde68a',
                        }}
                      >
                        {!courier.isOnline
                          ? '⚫ Çevrimdışı'
                          : courier.isAvailable
                          ? '🟢 Boşta'
                          : '🟡 Siparişte'}
                      </span>
                      <button
                        title="Haritada Merkezle"
                        className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 active:scale-95 transition-all"
                        onClick={() => {
                          const target = mappedCouriers.find((c) => c.id === courier.id);
                          if (target && typeof target.lat === 'number' && typeof target.lng === 'number') {
                            setFocusCenter([target.lat, target.lng]);
                          }
                        }}
                      >
                        <Navigation className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Teknik Bilgi Kutusu (sadece dev ortamda) ──────────────────────── */}
      {import.meta.env.DEV && (
        <div className="bg-slate-900 rounded-2xl p-4 text-xs font-mono text-slate-300 space-y-1">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">DEV — SignalR Diagnostics</p>
          <p><span className="text-slate-500">Hub URL:</span> <span className="text-amber-400">{import.meta.env.VITE_WS_URL ?? 'http://localhost:5000'}/hubs/location</span></p>
          <p><span className="text-slate-500">Bağlantı Durumu:</span> <span className={signalRStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400'}>{signalRStatus}</span></p>
          <p><span className="text-slate-500">Toplam Kurye:</span> <span className="text-blue-400">{stats.total}</span></p>
          <p><span className="text-slate-500">GPS Sinyalli:</span> <span className="text-blue-400">{courierList.filter((c) => c.lat !== null).length}</span></p>
        </div>
      )}
    </div>
  );
};
