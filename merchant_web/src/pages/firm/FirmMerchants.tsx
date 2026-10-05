import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Store, Search, RefreshCw, MapPin, Phone,
  Settings, CheckCircle2,
  Package, Plus, Trash2, X, Mail, Lock,
  AlertTriangle, Sliders, Navigation, Sparkles
} from 'lucide-react';
import { merchantService, type MerchantDto, type CreateMerchantRequest } from '../../services/merchantService';
import { DispatchMode, ReconciliationPeriod } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { getFirmOperatingZone, findCity, type QuickHub } from '../../constants/locations';
import { searchAddressOSM, type GeocodingResult } from '../../services/geocodingService';
import { startSignalR, onMerchantStatusUpdate } from '../../services/signalRService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DISPATCH_LABELS: Record<string, string> = {
  Pool: '📡 Havuz',
  Manual: '🎯 Manuel',
  SmartAuto: '🤖 Akıllı GPS',
  '0': '📡 Havuz',
  '1': '📡 Havuz',
  '2': '🎯 Manuel',
  '3': '🤖 Akıllı GPS',
};

const PERIOD_LABELS: Record<string, string> = {
  Daily: 'Günlük',
  Weekly: 'Haftalık',
  Monthly: 'Aylık',
  '0': 'Günlük',
  '1': 'Günlük',
  '2': 'Haftalık',
  '3': 'Aylık',
};

export const normalizeDispatchModeValue = (mode: unknown): string => {
  if (mode === 'Pool' || mode === 1 || mode === '1') return '1';
  if (mode === 'Manual' || mode === 2 || mode === '2') return '2';
  if (mode === 'SmartAuto' || mode === 3 || mode === '3') return '3';
  return '1';
};

export const normalizePeriodValue = (period: unknown): string => {
  if (period === 'Daily' || period === 1 || period === '1') return '1';
  if (period === 'Weekly' || period === 2 || period === '2') return '2';
  if (period === 'Monthly' || period === 3 || period === '3') return '3';
  return '1';
};

// ─── Harita & Konum Seçici Yardımcıları ──────────────────────────────────────

const restaurantPinIcon = new L.DivIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      color: white;
      width: 38px;
      height: 38px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(13,148,136,0.5), 0 0 0 3px white;
    ">
      <span style="transform: rotate(45deg); font-size: 17px;">🏪</span>
    </div>
  `,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

function MapClickHandler({
  position,
  onChange,
}: {
  position: [number, number] | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      map.panTo(e.latlng);
    },
  });

  return position ? <Marker position={position} icon={restaurantPinIcon} /> : null;
}

function MapFlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

function MapInitInvalidate() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// ─── Yeni Restoran Ekle Modalı (Haritadan Seçim + Otomatik Strateji) ──────────

interface AddModalProps {
  onClose: () => void;
  onSuccess: (name: string) => void;
}

const AddMerchantModal: React.FC<AddModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const firmMerchantId = user?.merchantId;

  // Firmanın Strateji Ayarları (Otomatik Çekilir)
  const [strategySettings, setStrategySettings] = useState<{
    dispatchMode: DispatchMode;
    defaultPackageFee: number;
    reconciliationPeriod: ReconciliationPeriod;
    hexagonSizeMeters: number;
    maxCourierDistanceKm: number;
    maxOrdersPerTour: number;
    orderBatchingTimeMinutes: number;
    crossRestaurantDistanceMeters: number;
  }>({
    dispatchMode: DispatchMode.SmartAuto,
    defaultPackageFee: 50,
    reconciliationPeriod: ReconciliationPeriod.Daily,
    hexagonSizeMeters: 1120,
    maxCourierDistanceKm: 6,
    maxOrdersPerTour: 2,
    orderBatchingTimeMinutes: 15,
    crossRestaurantDistanceMeters: 200,
  });

  // Firmanın Seçili Operasyon Bölgesi (81 İl Uyumlu)
  const firmOperatingZone = getFirmOperatingZone();
  const currentCityInfo = findCity(firmOperatingZone.cityId);
  const cityQuickHubs: QuickHub[] = (currentCityInfo?.quickHubs && currentCityInfo.quickHubs.length > 0)
    ? currentCityInfo.quickHubs
    : [
        {
          id: 'center',
          name: `${firmOperatingZone.cityName} Merkez`,
          coords: firmOperatingZone.coords,
          description: 'Merkez Odak Noktası'
        }
      ];

  const [formData, setFormData] = useState<CreateMerchantRequest>({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    address: '',
    defaultPackageFee: 50,
    dispatchMode: DispatchMode.SmartAuto,
    reconciliationPeriod: ReconciliationPeriod.Daily,
    latitude: firmOperatingZone.coords[0],
    longitude: firmOperatingZone.coords[1],
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>(firmOperatingZone.coords);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [hasCustomLocation, setHasCustomLocation] = useState(false);
  const [loadingStrategy, setLoadingStrategy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Canlı Adres / Semt Arama State'i (OpenStreetMap Geocoding)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearchAddress = async (queryText: string) => {
    setSearchQuery(queryText);
    if (!queryText.trim() || queryText.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchAddressOSM(queryText, firmOperatingZone.cityName);
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: GeocodingResult) => {
    setFlyTarget([result.lat, result.lng]);
    handleLocationChange(result.lat, result.lng);
    setShowSearchResults(false);
    setSearchQuery(result.displayName.split(',')[0]);
    if (!formData.address) {
      setFormData(prev => ({ ...prev, address: result.displayName }));
    }
  };

  // 1. Firmanın Mevcut Strateji Ayarlarını Otomatik Yükle
  useEffect(() => {
    const loadFirmStrategy = async () => {
      if (!firmMerchantId) {
        setLoadingStrategy(false);
        return;
      }
      try {
        const res = await merchantService.getSettings(firmMerchantId);
        if (res.isSuccess && res.data) {
          const d = res.data;
          const loadedStrategy = {
            dispatchMode: (d.dispatchMode as unknown as DispatchMode) ?? DispatchMode.SmartAuto,
            defaultPackageFee: d.defaultPackageFee ?? 50,
            reconciliationPeriod: (d.reconciliationPeriod as unknown as ReconciliationPeriod) ?? ReconciliationPeriod.Daily,
            hexagonSizeMeters: d.hexagonSizeMeters ?? 1120,
            maxCourierDistanceKm: d.maxCourierDistanceKm ?? 6,
            maxOrdersPerTour: d.maxOrdersPerTour ?? 2,
            orderBatchingTimeMinutes: d.orderBatchingTimeMinutes ?? 15,
            crossRestaurantDistanceMeters: d.crossRestaurantDistanceMeters ?? 200,
          };
          setStrategySettings(loadedStrategy);
          setFormData((prev) => ({
            ...prev,
            dispatchMode: loadedStrategy.dispatchMode,
            defaultPackageFee: loadedStrategy.defaultPackageFee,
            reconciliationPeriod: loadedStrategy.reconciliationPeriod,
          }));

          if (typeof d.latitude === 'number' && typeof d.longitude === 'number' && d.latitude !== 0) {
            setMapCenter([d.latitude, d.longitude]);
          }
        }
      } catch (err) {
        console.warn('Firma strateji ayarları yüklenemedi:', err);
      } finally {
        setLoadingStrategy(false);
      }
    };
    loadFirmStrategy();
  }, [firmMerchantId]);

  const handleLocationChange = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    setHasCustomLocation(true);
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum servisini desteklemiyor.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        handleLocationChange(lat, lng);
        setFlyTarget([lat, lng]);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setError('Cihazınızın GPS konumu alınamadı.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('İşletme adı, e-posta ve şifre zorunludur.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      // 1. Yeni İşletmeyi Kaydet
      const res = await merchantService.createMerchant(formData);
      if (res.isSuccess && res.data) {
        const newMerchantId = res.data.id;

        // 2. Firmanın Seçtiği Otonom Dağıtım ve H3 Algoritma Parametrelerini Otomatik Senkronize Et
        try {
          await merchantService.updateSettings(newMerchantId, {
            dispatchMode: formData.dispatchMode ?? strategySettings.dispatchMode,
            defaultPackageFee: formData.defaultPackageFee ?? strategySettings.defaultPackageFee,
            reconciliationPeriod: formData.reconciliationPeriod ?? strategySettings.reconciliationPeriod,
            hexagonSizeMeters: strategySettings.hexagonSizeMeters,
            maxCourierDistanceKm: strategySettings.maxCourierDistanceKm,
            maxOrdersPerTour: strategySettings.maxOrdersPerTour,
            orderBatchingTimeMinutes: strategySettings.orderBatchingTimeMinutes,
            crossRestaurantDistanceMeters: strategySettings.crossRestaurantDistanceMeters,
            latitude: formData.latitude,
            longitude: formData.longitude,
          });
        } catch (updateErr) {
          console.warn('Algoritma ayarları güncelleme uyarısı:', updateErr);
        }

        onSuccess(formData.name);
        onClose();
      } else {
        setError(res.message || 'Kayıt başarısız oldu.');
      }
    } catch {
      setError('Sunucu hatası oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">Yeni Restoran / İşletme Ekle</h3>
              <p className="text-xs text-slate-400">Haritadan konumunu işaretleyin, strateji ayarları otomatik uygulansın.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Firmanın Aktif Strateji Özeti (Otomatik Uygulanan Ayarlar) */}
        <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-black text-purple-900">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Firma Strateji Ayarları (Otomatik Eşleşecek)</span>
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-100/90 px-2 py-0.5 rounded-full border border-purple-200">
              {loadingStrategy ? 'Yükleniyor...' : '✓ Hazır Şablon'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
            <div className="bg-white/90 p-2 rounded-xl border border-purple-100 shadow-xs">
              <span className="text-slate-400 font-semibold block">Dağıtım Modu</span>
              <span className="font-black text-purple-900">{DISPATCH_LABELS[String(formData.dispatchMode)] ?? '🤖 Akıllı GPS'}</span>
            </div>
            <div className="bg-white/90 p-2 rounded-xl border border-purple-100 shadow-xs">
              <span className="text-slate-400 font-semibold block">H3 Altıgen</span>
              <span className="font-black text-purple-900">{strategySettings.hexagonSizeMeters}m (Res-8)</span>
            </div>
            <div className="bg-white/90 p-2 rounded-xl border border-purple-100 shadow-xs">
              <span className="text-slate-400 font-semibold block">Maks Kurye</span>
              <span className="font-black text-purple-900">{strategySettings.maxCourierDistanceKm} km</span>
            </div>
            <div className="bg-white/90 p-2 rounded-xl border border-purple-100 shadow-xs">
              <span className="text-slate-400 font-semibold block">Tur / Paket</span>
              <span className="font-black text-purple-900">{strategySettings.maxOrdersPerTour} Paket (200m Çapraz)</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* İşletme Temel Bilgileri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Restoran / İşletme Adı *</label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Örn: Hatay Dürüm Dünyası"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefon</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+905551234567"
                  value={formData.phoneNumber}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>

          {/* E-posta ve Şifre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giriş E-Postası *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="restoran@kurye.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giriş Şifresi *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>

          {/* Açık Adres */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Açık Adres / Semt</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Örn: Karaağaç Mah. Uğur Mumcu Cad. No: 15"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* ─── HARİTADAN RESTORAN KONUMU SEÇME BÖLÜMÜ ────────────────────── */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                <Navigation className="w-4 h-4 text-teal-600" />
                <span>Haritadan Restoran Konumu Seçin</span>
                <span className="text-rose-500">*</span>
              </label>

              <button
                type="button"
                disabled={isLocating}
                onClick={handleGetMyLocation}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-white border border-teal-200 px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 self-start sm:self-auto active:scale-95 disabled:opacity-50"
              >
                <span>{isLocating ? '⏳ GPS Alınıyor...' : '📍 Mevcut GPS Konumumu Al'}</span>
              </button>
            </div>

            {/* Canlı Adres / Semt / Mekan Arama Çubuğu */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchAddress(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchResults(true);
                  }}
                  placeholder={`🔍 ${firmOperatingZone.cityName} içinde semt, cadde, mahalle veya mekan ara...`}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-9 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-2xs"
                />
                {isSearching && (
                  <div className="absolute right-3 top-2.5">
                    <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                  </div>
                )}
              </div>

              {/* Canlı Arama Sonuçları Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-1000 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 transition-colors flex items-start space-x-2"
                    >
                      <span className="text-teal-600 mt-0.5 shrink-0">📍</span>
                      <span className="text-slate-700 font-medium line-clamp-2">{res.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dinamik Hızlı Semt / Odak Noktaları */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              <span className="text-slate-400 font-semibold shrink-0">
                {firmOperatingZone.cityName} Odakları:
              </span>
              {cityQuickHubs.map((hub) => (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => {
                    setFlyTarget(hub.coords);
                    handleLocationChange(hub.coords[0], hub.coords[1]);
                  }}
                  title={hub.description}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-teal-400 hover:text-teal-700 text-slate-700 font-bold shrink-0 transition-colors shadow-2xs active:scale-95"
                >
                  {hub.name}
                </button>
              ))}
            </div>

            {/* İnteraktif Harita Kutusu */}
            <div className="h-60 w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner relative">
              <MapContainer
                center={mapCenter}
                zoom={14}
                scrollWheelZoom={true}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler
                  position={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                  onChange={handleLocationChange}
                />
                <MapFlyTo center={flyTarget} />
                <MapInitInvalidate />
              </MapContainer>

              <div className="absolute top-2.5 right-2.5 z-[400] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 shadow-md border border-slate-200/80 pointer-events-none flex items-center space-x-1.5">
                <span>👆</span>
                <span>Haritaya tıklayarak pini yerleştirin</span>
              </div>
            </div>

            {/* Seçilen Koordinat Kartı */}
            <div className="flex items-center justify-between text-xs bg-emerald-50/80 border border-emerald-200/80 px-3.5 py-2.5 rounded-xl text-emerald-950">
              <div className="flex items-center space-x-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Seçilen Konum:</span>
                <span className="font-mono text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  {formData.latitude?.toFixed(6) ?? '—'}, {formData.longitude?.toFixed(6) ?? '—'}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 hidden sm:inline">
                {hasCustomLocation ? '✓ Konum Belirlendi' : 'Varsayılan Merkez'}
              </span>
            </div>
          </div>

          {/* Paket Ücreti ve Dağıtım Tercihi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Restorana Özel Paket Ücreti (₺)</label>
              <div className="relative">
                <Package className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.defaultPackageFee}
                  onChange={e => setFormData({ ...formData, defaultPackageFee: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold text-teal-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kurye Dağıtım Stratejisi</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { val: DispatchMode.Pool, label: '📡 Havuz' },
                  { val: DispatchMode.Manual, label: '🎯 Manuel' },
                  { val: DispatchMode.SmartAuto, label: '🤖 Akıllı GPS' },
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setFormData({ ...formData, dispatchMode: item.val })}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border text-center transition-all ${
                      formData.dispatchMode === item.val
                        ? 'bg-teal-500 text-white border-teal-500 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white text-sm font-black shadow-md shadow-teal-500/20 transition-all active:scale-95"
            >
              {saving ? 'Restoran Oluşturuluyor...' : 'Restoranı Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Edit Modalı ──────────────────────────────────────────────────────────────

interface EditModalProps {
  merchant: MerchantDto;
  onClose: () => void;
  onSave: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ merchant, onClose, onSave }) => {
  const [fee, setFee] = useState(String(merchant.defaultPackageFee));
  const [dispatch, setDispatch] = useState(normalizeDispatchModeValue(merchant.dispatchMode));
  const [period, setPeriod] = useState(normalizePeriodValue(merchant.reconciliationPeriod));
  const [hexagonSizeMeters, setHexagonSizeMeters] = useState(merchant.hexagonSizeMeters ?? 1120);
  const [maxCourierDistanceKm, setMaxCourierDistanceKm] = useState(merchant.maxCourierDistanceKm ?? 6);
  const [maxOrdersPerTour, setMaxOrdersPerTour] = useState(merchant.maxOrdersPerTour ?? 2);
  const [orderBatchingTimeMinutes, setOrderBatchingTimeMinutes] = useState(merchant.orderBatchingTimeMinutes ?? 15);
  const [crossRestaurantDistanceMeters, setCrossRestaurantDistanceMeters] = useState(merchant.crossRestaurantDistanceMeters ?? 200);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const feeNum = parseFloat(fee);
    if (isNaN(feeNum) || feeNum < 0) { setError('Geçerli bir ücret girin.'); return; }
    setSaving(true);
    try {
      const res = await merchantService.updateSettings(merchant.id, {
        defaultPackageFee: feeNum,
        dispatchMode: Number(dispatch) as DispatchMode,
        reconciliationPeriod: Number(period) as ReconciliationPeriod,
        hexagonSizeMeters: Number(hexagonSizeMeters),
        maxCourierDistanceKm: Number(maxCourierDistanceKm),
        maxOrdersPerTour: Number(maxOrdersPerTour),
        orderBatchingTimeMinutes: Number(orderBatchingTimeMinutes),
        crossRestaurantDistanceMeters: Number(crossRestaurantDistanceMeters),
      });

      if (res.isSuccess) {
        onSave();
        onClose();
      } else {
        setError(res.message || 'Kaydetme başarısız.');
      }
    } catch {
      setError('Kaydetme başarısız. Tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-lg">Restoran Ayarları & Dağıtım Modeli</h3>
            <p className="text-xs text-slate-400 mt-0.5">Kurye lojistik parametrelerini belirleyin</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm font-semibold text-teal-700 bg-teal-50 px-3 py-2 rounded-xl border border-teal-200">
          {merchant.name}
        </p>

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 font-semibold">{error}</p>
        )}

        {/* Paket Başı Ücret */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Restorana Özel Paket Ücreti (₺)</label>
          <div className="relative">
            <Package className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              min="0"
              step="0.5"
              value={fee}
              onChange={e => setFee(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-teal-700"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            💡 Bu restorana özel sözleşme ücreti. Özel ücret yoksa firmanın genel taban tarifesi geçerli olur.
          </p>
        </div>

        {/* Dağıtım Modu */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Dağıtım Stratejisi</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['1', '📡 Havuz'],
              ['2', '🎯 Manuel'],
              ['3', '🤖 Akıllı GPS'],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setDispatch(v)}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                  String(dispatch) === v
                    ? 'bg-teal-500 text-white border-teal-500 shadow-sm shadow-teal-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* H3 Hexagon Algoritma Parametreleri (Akıllı GPS seçildiğinde açılır) */}
        {(String(dispatch) === '3' || Number(dispatch) === DispatchMode.SmartAuto) && (
          <div className="p-4 rounded-2xl border-2 border-teal-200 bg-teal-50/50 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center space-x-2 text-teal-900 border-b border-teal-100 pb-2">
              <Sliders className="w-4 h-4 text-teal-600" />
              <h4 className="text-xs font-black uppercase tracking-wider">H3 Algoritması & Otonom Kümeleme</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Hexagon Çapı */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Hexagon Çapı</span>
                  <span className="text-teal-700 text-[10px]">H3 Çap</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={100}
                    max={10000}
                    step={50}
                    value={hexagonSizeMeters}
                    onChange={e => setHexagonSizeMeters(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl pr-10 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">m</span>
                </div>
              </div>

              {/* Max Kurye Mesafesi */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Maks Kurye Mesafesi</span>
                  <span className="text-teal-700 text-[10px]">Yarıçap</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={0.5}
                    value={maxCourierDistanceKm}
                    onChange={e => setMaxCourierDistanceKm(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl pr-10 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">km</span>
                </div>
              </div>

              {/* Max Paket Sayısı */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Tur Başı Paket</span>
                  <span className="text-teal-700 text-[10px]">Batch</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxOrdersPerTour}
                    onChange={e => setMaxOrdersPerTour(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl pr-12 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">paket</span>
                </div>
              </div>

              {/* Birleştirme Süresi */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Birleştirme Süresi</span>
                  <span className="text-teal-700 text-[10px]">Pencere</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={orderBatchingTimeMinutes}
                    onChange={e => setOrderBatchingTimeMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl pr-10 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">dk</span>
                </div>
              </div>
            </div>

            {/* Çapraz Restoran Mesafesi */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Çapraz Restoran Birleştirme Mesafesi</span>
                <span className="text-teal-700 text-[10px]">Çapraz</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={50}
                  max={3000}
                  step={25}
                  value={crossRestaurantDistanceMeters}
                  onChange={e => setCrossRestaurantDistanceMeters(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl pr-10 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">m</span>
              </div>
            </div>
          </div>
        )}

        {/* Mahsuplaşma Periyodu */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Mahsuplaşma Periyodu</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['1', 'Günlük'],
              ['2', 'Haftalık'],
              ['3', 'Aylık'],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setPeriod(v)}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                  String(period) === v
                    ? 'bg-teal-500 text-white border-teal-500'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex space-x-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white text-sm font-bold transition-all active:scale-95"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const FirmMerchants: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantDto[]>([]);
  const [filtered, setFiltered] = useState<MerchantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<MerchantDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MerchantDto | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await merchantService.getAllMerchants();
      if (res.isSuccess && res.data) {
        setMerchants(res.data);
      }
    } catch {
      setErrorMsg('İşletme listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMerchants(); }, [loadMerchants]);

  // Restoran aç/kapa anında listeye yansır
  useEffect(() => {
    startSignalR().catch(() => {});
    return onMerchantStatusUpdate(({ merchantId, isOpen }) => {
      setMerchants(prev => prev.map(m => (m.id === merchantId ? { ...m, isOpen } : m)));
    });
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? merchants.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.phoneNumber && m.phoneNumber.includes(q))) : merchants
    );
  }, [merchants, search]);

  const handleDeleteMerchant = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await merchantService.deleteMerchant(deleteTarget.id);
      if (res.isSuccess) {
        setSuccessMsg(`✅ ${deleteTarget.name} başarıyla silindi.`);
        setDeleteTarget(null);
        await loadMerchants();
      } else {
        setErrorMsg(res.message || 'İşletme silinemedi.');
      }
    } catch {
      setErrorMsg('Silme işlemi sırasında hata oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  const openCount = merchants.filter(m => m.isOpen).length;

  return (
    <div className="space-y-6">

      {showAddModal && (
        <AddMerchantModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(name) => {
            setSuccessMsg(`✅ ${name} restoranı başarıyla eklendi.`);
            loadMerchants();
          }}
        />
      )}

      {editTarget && (
        <EditModal
          merchant={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={() => {
            setSuccessMsg(`✅ ${editTarget.name} ayarları güncellendi.`);
            loadMerchants();
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Restoranı Sil</h3>
            <p className="text-xs text-slate-500 mt-2">
              <span className="font-bold text-slate-700">{deleteTarget.name}</span> adlı işletmeyi silmek / pasife almak istediğinize emin misiniz?
            </p>

            <div className="flex items-center justify-center space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteMerchant}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm disabled:opacity-60"
              >
                {actionLoading ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başlık & Eylemler */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Restoran Yönetimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">{merchants.length} bağlı restoran · {openCount} açık</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm rounded-xl shadow-sm shadow-teal-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Restoran Ekle</span>
          </button>
          <button
            onClick={loadMerchants}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-bold text-sm rounded-xl shadow-sm transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Başarı mesajı */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800 flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4 text-emerald-500" /></button>
        </div>
      )}

      {/* Hata mesajı */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-semibold text-rose-800 flex-1">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4 text-rose-500" /></button>
        </div>
      )}

      {/* Arama */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Restoran adı, e-posta veya telefon ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm"
        />
      </div>

      {/* Restoran Kartları */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700">Restoran bulunamadı</p>
          <p className="text-xs text-slate-400 mt-1">Arama kriterlerinizi değiştirin veya yeni restoran ekleyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              {/* Başlık & Durum */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-black text-sm">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">{m.name}</h3>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  m.isOpen
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {m.isOpen ? '🟢 Açık' : '⚪ Kapalı'}
                </span>
              </div>

              {/* Bilgiler */}
              <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                {m.phoneNumber && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{m.phoneNumber}</span>
                  </div>
                )}
                {m.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{m.address}</span>
                  </div>
                )}
              </div>

              {/* Ayar Rozetleri */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-center text-[11px]">
                <div>
                  <p className="text-slate-400 font-semibold">Paket Ücreti</p>
                  <p className="font-black text-teal-600 mt-0.5">₺{m.defaultPackageFee ?? 50}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Dağıtım</p>
                  <p className="font-bold text-slate-700 mt-0.5">{DISPATCH_LABELS[String(m.dispatchMode)] ?? '📡 Havuz'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Mahsuplaşma</p>
                  <p className="font-bold text-slate-700 mt-0.5">{PERIOD_LABELS[String(m.reconciliationPeriod)] ?? 'Günlük'}</p>
                </div>
              </div>

              {/* İşlem Butonları */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => setEditTarget(m)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 text-xs font-bold transition-all flex items-center justify-center space-x-1"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Ayarları Düzenle</span>
                </button>
                <button
                  onClick={() => setDeleteTarget(m)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Restoranı Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
