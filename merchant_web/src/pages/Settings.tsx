// src/pages/Settings.tsx
//
// İşletme Ayarları & Operasyon Merkezi:
// - Bölüm A: Lokasyon ve İletişim (Leaflet GPS haritası, adres detayları, işletme bilgileri, açık/kapalı) -> Restoran düzenleyebilir.
// - Bölüm B: Operasyon ve Dağıtım Modeli (Havuz, Manuel, Akıllı GPS) -> Kurye Firması tarafından belirlenir, Restoran için KİLİTLİDİR.
// - Bölüm C: Finans ve Mahsuplaşma (Paket başı ücret, mahsuplaşma sıklığı) -> Kurye Firması sözleşmesiyle belirlenir, Restoran için KİLİTLİDİR.
// - Kurye Firması Yetkili Modu (Admin Switch) ile lojistik firması bu kuralları yönetebilir.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Settings as SettingsIcon,
  Store,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  Power,
  Info,
  Target,
  Navigation,
  LocateFixed,
  Loader2,
  Radio,
  Crosshair,
  Bot,
  Banknote,
  Calendar,
  Layers,
  Check,
  Building2,
  TrendingUp,
  Cpu,
  Boxes,
  Sliders,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { merchantService } from '../services/merchantService';
import { DispatchMode, ReconciliationPeriod } from '../types';
import { DISTRICTS, DISTRICT_NEIGHBORHOODS } from '../constants/locations';

// ── LocalStorage Keys ──────────────────────────────────────────────────────
const LOCATION_KEY = 'merchant_location';

// ── Haritada Tıklama ile Konum Seçme ──────────────────────────────────────
interface MapClickHandlerProps {
  onLocationPick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onLocationPick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onLocationPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Harita Uçuş Kontrolü (useMap hook) ────────────────────────────────────
interface FlyToProps {
  position: [number, number];
  trigger: number;
}

function FlyToLocation({ position, trigger }: FlyToProps) {
  const map = useMap();
  const prevTrigger = useRef(0);
  if (trigger !== prevTrigger.current) {
    prevTrigger.current = trigger;
    map.flyTo(position, 17, { animate: true, duration: 1.2 });
  }
  return null;
}

// ── Özel Restoran Pin İkonu ───────────────────────────────────────────────
const restaurantPinIcon = new L.DivIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      width: 44px;
      height: 44px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(245,158,11,0.5);
      border: 3px solid white;
    ">
      <div style="transform: rotate(45deg); font-size: 20px;">🏪</div>
    </div>
  `,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -48],
});

type TabType = 'all' | 'dispatch' | 'location' | 'finance';

// ── Ana Bileşen ────────────────────────────────────────────────────────────
export const Settings: React.FC = () => {
  const { merchant, updateMerchant } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // ── Bölüm A: Lokasyon ve İletişim State'leri (Restoran Düzenleyebilir) ────
  const [isOpen, setIsOpen] = useState(merchant?.isOpen ?? true);
  const [storeName, setStoreName] = useState(merchant?.name || 'İskenderun Dürüm Evi');
  const [contactName, setContactName] = useState('Ahmet Can');
  const [phone, setPhone] = useState('0326 614 00 00');
  const [workingHours, setWorkingHours] = useState('10:00 - 23:30');

  const [district, setDistrict] = useState('İskenderun');
  const [neighborhood, setNeighborhood] = useState('İsmet İnönü Mah.');
  const [street, setStreet] = useState('Atatürk Bulvarı');
  const [buildingNo, setBuildingNo] = useState('No: 42/B');
  const [fullAddress, setFullAddress] = useState(
    'İsmet İnönü Mah. Atatürk Bulvarı No: 42/B, Sahil Yanı, İskenderun / Hatay'
  );

  // Harita Konumu
  const getSavedLocation = (): [number, number] => {
    try {
      const saved = localStorage.getItem(LOCATION_KEY);
      if (saved) {
        const { lat, lng } = JSON.parse(saved) as { lat: number; lng: number };
        if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng];
      }
    } catch {
      // ignore
    }
    return [36.5867, 36.1714]; // İskenderun merkezi
  };

  const [pickedLocation, setPickedLocation] = useState<[number, number]>(getSavedLocation());
  const [isLocationPicked, setIsLocationPicked] = useState(() => !!localStorage.getItem(LOCATION_KEY));
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // ── Bölüm B: Operasyon ve Dağıtım Modeli State'i (Kurye Firması Belirler) ──
  const normalizeDispatchMode = (mode: unknown): DispatchMode => {
    if (mode === 'SmartAuto' || mode === 3 || mode === '3') return DispatchMode.SmartAuto;
    if (mode === 'Manual' || mode === 2 || mode === '2') return DispatchMode.Manual;
    return DispatchMode.Pool;
  };

  const [dispatchMode, setDispatchMode] = useState<DispatchMode>(
    normalizeDispatchMode(merchant?.dispatchMode)
  );

  // ── H3 Hexagon ve Dağıtım Motoru Algoritma Ayarları State'leri ─────────────
  const [hexagonSizeMeters, setHexagonSizeMeters] = useState<number>(
    merchant?.hexagonSizeMeters ?? 1120
  );
  const [maxCourierDistanceKm, setMaxCourierDistanceKm] = useState<number>(
    merchant?.maxCourierDistanceKm ?? 6
  );
  const [maxOrdersPerTour, setMaxOrdersPerTour] = useState<number>(
    merchant?.maxOrdersPerTour ?? 2
  );
  const [orderBatchingTimeMinutes, setOrderBatchingTimeMinutes] = useState<number>(
    merchant?.orderBatchingTimeMinutes ?? 15
  );
  const [crossRestaurantDistanceMeters, setCrossRestaurantDistanceMeters] = useState<number>(
    merchant?.crossRestaurantDistanceMeters ?? 200
  );

  // ── Bölüm C: Finans ve Mahsuplaşma State'leri (Kurye Firması Sözleşmesi) ───
  const [packageFee, setPackageFee] = useState<number>(
    merchant?.defaultPackageFee ?? 75.0
  );
  const [reconciliationPeriod, setReconciliationPeriod] = useState<ReconciliationPeriod>(
    merchant?.reconciliationPeriod ?? ReconciliationPeriod.Daily
  );

  // ── Form & İşlem Durumları ────────────────────────────────────────────────
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Backend'den Ayarları Yükle ───────────────────────────────────────────
  useEffect(() => {
    if (!merchant?.id) return;

    let isMounted = true;
    setIsLoadingSettings(true);

    merchantService
      .getSettings(merchant.id)
      .then((res) => {
        if (isMounted && res.isSuccess && res.data) {
          const d = res.data;
          if (d.name) setStoreName(d.name);
          if (d.phoneNumber) setPhone(d.phoneNumber);
          if (d.address) setFullAddress(d.address);
          if (typeof d.isOpen === 'boolean') setIsOpen(d.isOpen);
          if (typeof d.defaultPackageFee === 'number') setPackageFee(d.defaultPackageFee);

          // Dağıtım Modu (Enum string veya number desteği)
          if (d.dispatchMode !== undefined && d.dispatchMode !== null) {
            setDispatchMode(normalizeDispatchMode(d.dispatchMode));
          }

          // H3 Hexagon Algoritma Parametreleri
          if (typeof d.hexagonSizeMeters === 'number') setHexagonSizeMeters(d.hexagonSizeMeters);
          if (typeof d.maxCourierDistanceKm === 'number') setMaxCourierDistanceKm(d.maxCourierDistanceKm);
          if (typeof d.maxOrdersPerTour === 'number') setMaxOrdersPerTour(d.maxOrdersPerTour);
          if (typeof d.orderBatchingTimeMinutes === 'number') setOrderBatchingTimeMinutes(d.orderBatchingTimeMinutes);
          if (typeof d.crossRestaurantDistanceMeters === 'number') setCrossRestaurantDistanceMeters(d.crossRestaurantDistanceMeters);

          // Mahsuplaşma Periyodu (Enum string veya number desteği)
          if (d.reconciliationPeriod !== undefined && d.reconciliationPeriod !== null) {
            if (typeof d.reconciliationPeriod === 'string') {
              if (d.reconciliationPeriod === 'Daily') setReconciliationPeriod(ReconciliationPeriod.Daily);
              else if (d.reconciliationPeriod === 'Weekly') setReconciliationPeriod(ReconciliationPeriod.Weekly);
              else if (d.reconciliationPeriod === 'Monthly') setReconciliationPeriod(ReconciliationPeriod.Monthly);
            } else {
              setReconciliationPeriod(d.reconciliationPeriod);
            }
          }

          if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
            const coords: [number, number] = [d.latitude, d.longitude];
            setPickedLocation(coords);
            setIsLocationPicked(true);
            localStorage.setItem(LOCATION_KEY, JSON.stringify({ lat: d.latitude, lng: d.longitude }));
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingSettings(false);
      });

    return () => {
      isMounted = false;
    };
  }, [merchant?.id]);

  // ── Adres Yardımcıları ───────────────────────────────────────────────────
  const syncFullAddress = useCallback((d: string, n: string, s: string, b: string) => {
    const parts: string[] = [];
    if (n) parts.push(n);
    if (s) parts.push(s);
    if (b) parts.push(b);
    if (d) parts.push(`${d} / Hatay`);
    setFullAddress(parts.join(', '));
  }, []);

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const firstNeighborhood = DISTRICT_NEIGHBORHOODS[newDistrict]?.[0] || '';
    setNeighborhood(firstNeighborhood);
    syncFullAddress(newDistrict, firstNeighborhood, street, buildingNo);
  };

  const handleNeighborhoodChange = (newNeighborhood: string) => {
    setNeighborhood(newNeighborhood);
    syncFullAddress(district, newNeighborhood, street, buildingNo);
  };

  const handleStreetChange = (newStreet: string) => {
    setStreet(newStreet);
    syncFullAddress(district, neighborhood, newStreet, buildingNo);
  };

  const handleBuildingChange = (newBuilding: string) => {
    setBuildingNo(newBuilding);
    syncFullAddress(district, neighborhood, street, newBuilding);
  };

  // ── Harita Konum Seçimi ──────────────────────────────────────────────────
  const handleLocationPick = useCallback((lat: number, lng: number) => {
    setPickedLocation([lat, lng]);
    setIsLocationPicked(true);
  }, []);

  const handleResetLocation = () => {
    const defaultPos: [number, number] = [36.5867, 36.1714];
    setPickedLocation(defaultPos);
    setIsLocationPicked(false);
    setFlyTrigger((t) => t + 1);
    localStorage.removeItem(LOCATION_KEY);
  };

  const handleCopyCoords = () => {
    const text = `${pickedLocation[0].toFixed(6)}, ${pickedLocation[1].toFixed(6)}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // ── Tarayıcı Geolocation ─────────────────────────────────────────────────
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tarayıcınız konum servisini desteklemiyor.');
      return;
    }
    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const pos: [number, number] = [latitude, longitude];
        setPickedLocation(pos);
        setIsLocationPicked(true);
        setFlyTrigger((t) => t + 1);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Konum izni verilmedi. Tarayıcı izinlerinden aktif edin.');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('Konum bilgisine ulaşılamadı. GPS sinyalinizi kontrol edin.');
            break;
          case err.TIMEOUT:
            setLocationError('Konum isteği zaman aşımına uğradı.');
            break;
          default:
            setLocationError('Konum alınırken bir sorun oluştu.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── Kaydet (PUT /api/merchants/{id}/settings) ─────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    setSaveError(null);

    const lat = pickedLocation[0];
    const lng = pickedLocation[1];

    const hasValidGps = isLocationPicked && typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0;
    if (dispatchMode === DispatchMode.SmartAuto && !hasValidGps) {
      setIsSaving(false);
      setSaveError(
        '⚠️ Akıllı GPS (SmartAuto) otonom dağıtım modelini kullanabilmek için işletmenizin haritadaki konumu zorunludur! ' +
        'Lütfen "Lokasyon & Harita (GPS)" bölümünden restoranınızın yerini haritadan seçin veya "Mevcut Konumumu Al" butonunu kullanın.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Restoran profil bilgilerini, harita konumunu, dağıtım modelini, algoritma ve finansal ayarları gönderir
    const payload = {
      name: storeName,
      phoneNumber: phone,
      address: fullAddress,
      isOpen,
      latitude: lat,
      longitude: lng,
      workingHours,
      dispatchMode,
      defaultPackageFee: Number(packageFee),
      reconciliationPeriod,
      hexagonSizeMeters: Number(hexagonSizeMeters) || 1120,
      maxCourierDistanceKm: Number(maxCourierDistanceKm) || 6,
      maxOrdersPerTour: Number(maxOrdersPerTour) || 2,
      orderBatchingTimeMinutes: Number(orderBatchingTimeMinutes) || 15,
      crossRestaurantDistanceMeters: Number(crossRestaurantDistanceMeters) || 200,
    };

    try {
      if (merchant?.id) {
        const result = await merchantService.updateSettings(merchant.id, payload);

        if (result.isSuccess) {
          updateMerchant({
            name: storeName,
            phoneNumber: phone,
            address: fullAddress,
            isOpen,
            latitude: lat,
            longitude: lng,
            workingHours,
            dispatchMode,
            defaultPackageFee: Number(packageFee),
            reconciliationPeriod,
            hexagonSizeMeters: Number(hexagonSizeMeters) || 1120,
            maxCourierDistanceKm: Number(maxCourierDistanceKm) || 6,
            maxOrdersPerTour: Number(maxOrdersPerTour) || 2,
            orderBatchingTimeMinutes: Number(orderBatchingTimeMinutes) || 15,
            crossRestaurantDistanceMeters: Number(crossRestaurantDistanceMeters) || 200,
          });

          // Yeşil Toast bildirimi ve başarı durumu
          useNotificationStore.getState().addNotification({
            type: 'delivered',
            title: '✅ Ayarlar Başarıyla Kaydedildi',
            message: 'İşletme profili ve H3 lojistik dağıtım motoru ayarları güncellendi.',
          });

          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 5000);
        } else {
          setSaveError(result.message || 'Ayarlar kaydedilemedi.');
        }
      } else {
        // Fallback: LocalStore güncelle
        updateMerchant({
          name: storeName,
          phoneNumber: phone,
          address: fullAddress,
          isOpen,
          latitude: lat,
          longitude: lng,
          workingHours,
          dispatchMode,
          defaultPackageFee: Number(packageFee),
          reconciliationPeriod,
          hexagonSizeMeters: Number(hexagonSizeMeters) || 1120,
          maxCourierDistanceKm: Number(maxCourierDistanceKm) || 6,
          maxOrdersPerTour: Number(maxOrdersPerTour) || 2,
          orderBatchingTimeMinutes: Number(orderBatchingTimeMinutes) || 15,
          crossRestaurantDistanceMeters: Number(crossRestaurantDistanceMeters) || 200,
        });

        useNotificationStore.getState().addNotification({
          type: 'delivered',
          title: '✅ Ayarlar Kaydedildi',
          message: 'Yerel ayarlar başarıyla güncellendi.',
        });

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 5000);
      }
    } catch {
      setSaveError('Sunucuya bağlanırken beklenmeyen bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-16">
      {/* ── Üst Başlık & Kurye Firması Yetki Rozeti ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Restoran Ayarları & Saha Bilgileri
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                  İşletme Paneli
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Restoran iletişim ve harita GPS konumunuzu buradan yönetebilirsiniz.
              </p>
            </div>
          </div>
        </div>

        {/* Sağ Taraf: Bilgiler Alınıyor & Kaydet Butonu */}
        <div className="flex flex-wrap items-center gap-3">
          {isLoadingSettings && (
            <span className="text-xs text-slate-400 flex items-center space-x-1.5 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>Bilgiler alınıyor...</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-sm flex items-center space-x-2 transition-all shadow-md shadow-amber-500/25 disabled:opacity-60 min-h-[44px]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
          </button>
        </div>
      </div>

      {/* ── Bildirimler (Başarı / Hata) ────────────────────────────────────── */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start space-x-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm">Ayarlar Başarıyla Güncellendi</h4>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              İşletme GPS konumu, servis durumu ve operasyonel bilgiler veritabanına işlendi.
              Canlı Saha Radarı bu koordinatları merkez almaktadır.
            </p>
          </div>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm">Kaydetme İşlemi Başarısız</h4>
            <p className="text-xs text-rose-700 mt-0.5">{saveError}</p>
          </div>
        </div>
      )}

      {/* ── Sekme Gezintisi (Navigation Tabs) ──────────────────────────────── */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all flex items-center space-x-2 ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tüm Bilgiler</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('location')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all flex items-center space-x-2 ${
            activeTab === 'location'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>📍 Lokasyon & Harita (GPS)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dispatch')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all flex items-center space-x-2 ${
            activeTab === 'dispatch'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>📡 Dağıtım Modeli</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all flex items-center space-x-2 ${
            activeTab === 'finance'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>💰 Finans & Sözleşme</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* ================================================================= */}
        {/* ── BÖLÜM A: LOKASYON VE İLETİŞİM (RESTORAN DÜZENLEYEBİLİR) ─────── */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'location') && (
          <>
            {/* İşletme Servis Durumu Switch */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                    <Store className="w-5 h-5 text-amber-500" />
                    <span>İşletme Anlık Servis Durumu</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kapalı durumdayken kuryeler restoranınızı kapalı görür ve otomatik çağrı akışı durdurulur.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className={`px-5 py-2.5 rounded-xl font-black text-sm flex items-center space-x-2 transition-all shadow-xs min-h-[44px] touch-manipulation ${
                    isOpen
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{isOpen ? '🟢 İşletme Açık (Sipariş Alıyor)' : '🔴 İşletme Kapalı (Durduruldu)'}</span>
                </button>
              </div>
            </div>

            {/* GPS Harita Konum Kartı (Leaflet) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                    <Target className="w-5 h-5 text-emerald-500" />
                    <span>Restoran GPS Konumu & Saha Radarı Merkezi</span>
                    {isLocationPicked && (
                      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        ✓ Konum Seçildi
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Haritada restoranınızın tam koordinatını iğneleyin. Kuryeler paketi teslim almaya bu noktaya gelir.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95"
                  >
                    {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                    <span>{isLocating ? 'Alınıyor...' : 'Şu Anki Konumumu Al'}</span>
                  </button>
                </div>
              </div>

              {locationError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}

              {/* Harita Talimatı */}
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-800">
                <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
                <p>
                  <strong>Haritada restoranınızın tam üstüne tıklayın veya 🏪 iğnesini sürükleyin.</strong> Koordinatlar anında güncellenir.
                </p>
              </div>

              {/* Leaflet Harita */}
              <div className="h-[380px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative">
                <MapContainer
                  center={pickedLocation}
                  zoom={15}
                  scrollWheelZoom={true}
                  style={{ width: '100%', height: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapClickHandler onLocationPick={handleLocationPick} />
                  <FlyToLocation position={pickedLocation} trigger={flyTrigger} />

                  <Marker
                    position={pickedLocation}
                    icon={restaurantPinIcon}
                    draggable={true}
                    eventHandlers={{
                      dragend(e) {
                        const latlng = (e.target as L.Marker).getLatLng();
                        handleLocationPick(latlng.lat, latlng.lng);
                      },
                    }}
                  />
                </MapContainer>

                <div className="absolute bottom-3 left-3 z-[999] bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-xs pointer-events-none">
                  🖱️ Tıkla veya iğneyi sürükle
                </div>
              </div>

              {/* Koordinat Çubuğu */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seçili GPS Koordinatı</p>
                    <p className="text-sm font-black text-slate-900 font-mono">
                      {pickedLocation[0].toFixed(6)}, {pickedLocation[1].toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                  >
                    📋 Kopyala
                  </button>
                  <button
                    type="button"
                    onClick={handleResetLocation}
                    className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg transition-all"
                  >
                    ↺ Sıfırla
                  </button>
                </div>
              </div>
            </div>

            {/* Adres ve İletişim Detayları */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-6">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span>Restoran Adres & İletişim Bilgileri</span>
                </h3>
              </div>

              {/* İlçe, Mahalle, Cadde, No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">İlçe *</label>
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[46px]"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Mahalle *</span>
                    <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                      {DISTRICT_NEIGHBORHOODS[district]?.length || 0}
                    </span>
                  </label>
                  <select
                    value={neighborhood}
                    onChange={(e) => handleNeighborhoodChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[46px]"
                  >
                    {DISTRICT_NEIGHBORHOODS[district]?.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Cadde / Sokak</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => handleStreetChange(e.target.value)}
                    placeholder="Örn: Atatürk Bulvarı"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[46px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Bina / Kapı No</label>
                  <input
                    type="text"
                    value={buildingNo}
                    onChange={(e) => handleBuildingChange(e.target.value)}
                    placeholder="Örn: No: 42/B"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[46px]"
                  />
                </div>
              </div>

              {/* Tam Açık Adres */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tam Açık Adres (Kurye Görünümü) *
                </label>
                <textarea
                  rows={2}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="İsmet İnönü Mah. Atatürk Bulvarı No: 42/B, Sahil Yanı, İskenderun / Hatay"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-y"
                />
              </div>

              {/* İşletme Adı, Yetkili, Telefon, Çalışma Saatleri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">İşletme Adı *</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[46px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Yetkili Adı Soyadı</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[46px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">İşletme Telefonu</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[46px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Çalışma Saatleri</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={workingHours}
                      onChange={(e) => setWorkingHours(e.target.value)}
                      placeholder="10:00 - 23:30"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[46px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* ── BÖLÜM B: OPERASYON VE DAĞITIM MODELİ (FİRMA SÖZLEŞMESİ) ─────── */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'dispatch') && (
          <div className="relative">
            {/* ─── Kilit Overlay: Restoran bu bolumu degistiremez ─────────── */}
            <div className="absolute inset-0 z-20 rounded-2xl bg-slate-900/5 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 pointer-events-auto cursor-not-allowed">
              <div className="flex flex-col items-center gap-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl px-6 py-4 shadow-lg shadow-slate-900/10 text-center max-w-xs">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-black text-slate-900">Kurye Firması Tarafından Yönetiliyor</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dağıtım modeli ve algoritma parametreleri, anlaşmalı kurye firmanız tarafından merkezi olarak belirlenir. Değiştirmek için firmanızla iletişime geçin.
                </p>
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sözleşmeli & Kilitli</span>
                </span>
              </div>
            </div>
            <div className="pointer-events-none select-none opacity-40 bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kurye Şirketi Sözleşmeli Dağıtım Modeli</span>
                  </span>
                  <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                    <span>Sipariş Dağıtım & Kurye Atama Modeli</span>
                  </h2>
                </div>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Bu restorana uygulanacak kurye operasyon stratejisi, kurye lojistik firmanız ile yapılan sözleşme kapsamında belirlenmiştir.
                </p>
              </div>

              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sözleşmeli Model</span>
              </div>
            </div>

            {/* 3 Dağıtım Modeli Kartı (Sözleşmeli Gösterim) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {/* Kart 1: Havuz Sistemi */}
              {(() => {
                const isSelected = dispatchMode === DispatchMode.Pool;
                return (
                  <div
                    className={`rounded-2xl p-5 md:p-6 transition-all border-2 text-left flex flex-col justify-between select-none ${
                      isSelected
                        ? 'border-amber-500 bg-gradient-to-b from-amber-50/60 to-white shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50/50 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          <Radio className="w-6 h-6" />
                        </div>

                        <div className="flex items-center space-x-2">
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Sözleşmeli Aktif Model</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-500">
                              Pasif
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                        <span>📡 Havuz Sistemi</span>
                      </h3>
                      <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                        Tüm Boş Kuryelere Düşer • İlk Kabul Eden Alır
                      </p>

                      <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                        Sipariş onaylandığı anda sahadaki uygun tüm kuryelerin ekranına anında bildirim gider. Paketi ilk
                        kabul eden kurye siparişi üstlenir ve restorana yönlendirilir.
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ⚡ Hızlı Reaksiyon
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        👥 Çoklu Kurye Havuzu
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Kart 2: Manuel Atama */}
              {(() => {
                const isSelected = dispatchMode === DispatchMode.Manual;
                return (
                  <div
                    className={`rounded-2xl p-5 md:p-6 transition-all border-2 text-left flex flex-col justify-between select-none ${
                      isSelected
                        ? 'border-blue-500 bg-gradient-to-b from-blue-50/60 to-white shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50/50 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          <Crosshair className="w-6 h-6" />
                        </div>

                        <div className="flex items-center space-x-2">
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Sözleşmeli Aktif Model</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-500">
                              Pasif
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                        <span>🎯 Manuel Atama</span>
                      </h3>
                      <p className="text-[11px] font-bold text-blue-700 mt-0.5">
                        Panele Düşer • Yönetici Kuryeyi Kendisi Seçer
                      </p>

                      <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                        Sipariş sisteme 'Atama Bekliyor' statüsünde aktarılır. İşletme veya filo yöneticisi haritadan ya da
                        listeden istediği kuryeyi seçerek paketi zimmetler.
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        🛡️ Tam Kontrol
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        📋 Sıralı Yönetim
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Kart 3: Akıllı GPS Auto-Dispatch */}
              {(() => {
                const isSelected = dispatchMode === DispatchMode.SmartAuto;
                return (
                  <div
                    className={`rounded-2xl p-5 md:p-6 transition-all border-2 text-left flex flex-col justify-between select-none ${
                      isSelected
                        ? 'border-purple-600 bg-gradient-to-b from-purple-50/60 to-white shadow-lg shadow-purple-600/10 ring-2 ring-purple-600/20'
                        : 'border-slate-200 bg-slate-50/50 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          <Bot className="w-6 h-6" />
                        </div>

                        <div className="flex items-center space-x-2">
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Sözleşmeli Aktif Model</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-500">
                              Pasif
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                        <span>🤖 Akıllı GPS (Auto-Dispatch)</span>
                      </h3>
                      <p className="text-[11px] font-bold text-purple-700 mt-0.5">
                        En Yakın Boş Kuryeye Yapay Zeka ile Otomatik Atama
                      </p>

                      <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                        Sistem restoranın GPS koordinatına en yakın boş kuryeyi harita bazında otonom tespit eder ve
                        insan müdahalesine gerek kalmadan siparişi milisaniyeler içinde atar.
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        📍 Minimum Mesafe
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        🚀 Sıfır Gecikme
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── ALGORİTMA AYARLARI BÖLÜMÜ (Akıllı GPS Modunda Açılır) ── */}
            {dispatchMode === DispatchMode.SmartAuto && (
              <div className="rounded-2xl border-2 border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-white p-6 md:p-8 shadow-md shadow-purple-500/5 animate-in fade-in slide-in-from-top-3 duration-300 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-black text-slate-900">
                          H3 Hexagon Algoritması & Otonom Kümeleme Ayarları
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-xs">
                          Enterprise
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Bu parametreler kurye lojistik firmanızın otonom H3 kümeleme motoru tarafından merkezi olarak yönetilmektedir.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-purple-700 border border-purple-200 shadow-xs">
                      ⚡ Firma Tarafından Yönetiliyor
                    </span>
                  </div>
                </div>

                {/* 5 Algoritma Parametresi Göstergesi (Salt Okunur Sözleşme) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* 1: Hexagon Büyüklüğü (m) */}
                  <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-purple-100 shadow-xs">
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-purple-600" />
                        <span>Hexagon Büyüklüğü</span>
                      </span>
                      <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                        H3 Çap
                      </span>
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type="number"
                        readOnly
                        value={hexagonSizeMeters}
                        className="w-full bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-700 cursor-not-allowed pr-12 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        metre
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                      Altıgen hücre arama çapı (1120m).
                    </p>
                  </div>

                  {/* 2: Kurye Atama Mesafesi (km) */}
                  <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-purple-100 shadow-xs">
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Navigation className="w-4 h-4 text-indigo-600" />
                        <span>Kurye Atama Mesafesi</span>
                      </span>
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                        Yarıçap
                      </span>
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type="number"
                        readOnly
                        value={maxCourierDistanceKm}
                        className="w-full bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-700 cursor-not-allowed pr-12 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        km
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                      Kurye atama alanı sınırı ({maxCourierDistanceKm} km).
                    </p>
                  </div>

                  {/* 3: Tur Başına Sipariş Sayısı */}
                  <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-purple-100 shadow-xs">
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Boxes className="w-4 h-4 text-emerald-600" />
                        <span>Sipariş Sayısı (Batching)</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        Kapasite
                      </span>
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type="number"
                        readOnly
                        value={maxOrdersPerTour}
                        className="w-full bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-700 cursor-not-allowed pr-14 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        paket
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                      Kuryenin turda alabileceği maksimum paket ({maxOrdersPerTour} paket).
                    </p>
                  </div>

                  {/* 4: Restoranlar Arası Mesafe (m) */}
                  <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-purple-100 shadow-xs">
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Store className="w-4 h-4 text-amber-600" />
                        <span>Restoranlar Arası Mesafe</span>
                      </span>
                      <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                        Çapraz
                      </span>
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type="number"
                        readOnly
                        value={crossRestaurantDistanceMeters}
                        className="w-full bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-700 cursor-not-allowed pr-12 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        metre
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                      Başka restorandan paket birleştirme mesafesi ({crossRestaurantDistanceMeters}m).
                    </p>
                  </div>

                  {/* 5: Sipariş Birleştirme Süresi (dk) */}
                  <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-purple-100 shadow-xs">
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-rose-600" />
                        <span>Sipariş Birleştirme Süresi</span>
                      </span>
                      <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                        Zaman
                      </span>
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type="number"
                        readOnly
                        value={orderBatchingTimeMinutes}
                        className="w-full bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-700 cursor-not-allowed pr-14 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        dakika
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                      Ortak güzergah için sipariş biriktirme süresi ({orderBatchingTimeMinutes} dk).
                    </p>
                  </div>

                  {/* Özet ve Bilgi Kartı */}
                  <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-4 rounded-xl shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-purple-200">
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Canlı Algoritma Özeti</span>
                      </div>
                      <p className="text-xs text-purple-100 mt-1.5 leading-relaxed font-medium">
                        Kuryeler <strong className="text-white font-bold">{hexagonSizeMeters}m</strong> altıgen alanı ve <strong className="text-white font-bold">{maxCourierDistanceKm} km</strong> yarıçap içinde taranır. Kurye başına azami <strong className="text-white font-bold">{maxOrdersPerTour} paket</strong> rotalanır.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-purple-400/30 flex items-center justify-between text-[10px] text-purple-200 font-mono">
                      <span>Batching: {orderBatchingTimeMinutes} dk</span>
                      <span>Çapraz: {crossRestaurantDistanceMeters}m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bilgilendirme Notu */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3 text-xs text-slate-600">
              <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <p>
                <strong>Kurye Şirketi Kuralı:</strong> Sipariş dağıtım algoritması kurye lojistik firmasının filo operasyon standartlarına göre
                merkezi olarak yönetilir. Dağıtım modeli değişikliği talepleriniz için filo koordinatörünüz ile görüşünüz.
              </p>
            </div>
          </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ── BÖLÜM C: FİNANS VE MAHSUPLAŞMA (KURYE FİRMASI SÖZLEŞMESİ) ──── */}
        {/* ================================================================= */}
        {(activeTab === 'all' || activeTab === 'finance') && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>B2B Finansal Sözleşme</span>
                </span>
                <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span>Finans & Mahsuplaşma Koşulları</span>
                </h2>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Kurye lojistik firması ile restoran arasındaki paket başı hakediş ve kasa hesaplaşma periyodu.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Alan 1: DefaultPackageFee (Paket Başı Ücret - TL) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                      Sabit Paket Başı Taşıma Ücreti
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Her teslimatta kurye firması / kurye hakedişine yazılan sabit bedel.
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>

                {/* Restoran Modu: Sözleşmeli Sabit Paket Ücreti */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-black text-emerald-600">₺{packageFee.toFixed(2)}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1.5">/ paket</span>
                  </div>
                  <span className="inline-flex items-center space-x-1.5 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Kurye Şirketi Sözleşme Tarifesi</span>
                  </span>
                </div>
              </div>

              {/* Alan 2: ReconciliationPeriod (Hesap Kesim / Mahsuplaşma Sıklığı) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                      Mahsuplaşma Sıklığı (Periyot)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kurye firması ile restoran arasındaki kasa mutabakat takvimi.
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>

                {/* Restoran Modu: Sözleşmeli Takvim Göstergesi */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-900 block">
                      {reconciliationPeriod === ReconciliationPeriod.Daily && '📅 Günlük (Her Gece 23:59)'}
                      {reconciliationPeriod === ReconciliationPeriod.Weekly && '📆 Haftalık (Her Pazar Gecesi)'}
                      {reconciliationPeriod === ReconciliationPeriod.Monthly && '🗓️ Aylık (Ay Sonu Mutabakat)'}
                    </span>
                    <span className="text-[11px] text-slate-500">Otomatik Kasa Sıfırlama ve Mutabakat</span>
                  </div>
                  <span className="inline-flex items-center space-x-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Sözleşmeli Takvim</span>
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  {reconciliationPeriod === ReconciliationPeriod.Daily && (
                    <>📅 <strong>Günlük Periyot:</strong> Her gece 23:59'da nakit tahsilatlar ile paket hakedişleri karşılaştırılarak kasa kapatılır.</>
                  )}
                  {reconciliationPeriod === ReconciliationPeriod.Weekly && (
                    <>📆 <strong>Haftalık Periyot:</strong> Haftalık sipariş hacmi ve nakit teslimatları her Pazar gecesi toplanıp mutabakat sağlanır.</>
                  )}
                  {reconciliationPeriod === ReconciliationPeriod.Monthly && (
                    <>🗓️ <strong>Aylık Periyot:</strong> Ayın son gününde kurumsal cari hesap ekstresi düzenlenip toplu mahsuplaşma yapılır.</>
                  )}
                </p>
              </div>
            </div>

            {/* B2B Mahsuplaşma Sözleşme Notu */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 to-blue-50/70 border border-emerald-200/80 flex items-start space-x-3.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 space-y-1">
                <span className="font-bold text-slate-900 block">
                  Mahsuplaşma Dengesi (Kurye Şirketi & Restoran Sözleşmesi)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Kapıda toplanan nakit tutarlar restorana teslim edilir. Sistem, işletmenizin sözleşmeli sabit paket ücretini
                  (₺{packageFee.toFixed(2)}) kurye hakedişi olarak hesaplar. Seçili periyotta <strong>Kasa Mahsuplaşması</strong> çalıştırıldığında
                  resmi mutabakat raporu düzenlenir. Fiyat revizyonları için kurye lojistik firmanızla görüşünüz.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Alt Kaydet Çubuğu ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-xs">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Restoran ayarları kaydedildiğinde harita GPS ve profil bilgileriniz anında güncellenir.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-sm flex items-center space-x-2.5 transition-all shadow-md shadow-amber-500/25 min-h-[48px] disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
