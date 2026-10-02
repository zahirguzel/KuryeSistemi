import React, { useEffect, useState } from 'react';
import {
  Building2, Phone, Mail, MapPin,
  Save, CheckCircle2, AlertTriangle, Lock,
  Volume2, VolumeX, Eye, EyeOff, RefreshCw,
  LogOut, Compass, ShieldCheck, Banknote, Clock,
  FileText, Layers, Sliders, Bot, Navigation,
  Boxes, Store
} from 'lucide-react';

import { api } from '../../services/api';
import { merchantService } from '../../services/merchantService';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import type { ServiceResult } from '../../types/auth';
import type { Merchant } from '../../types';
import { DispatchMode, ReconciliationPeriod } from '../../types';
import { useNavigate } from 'react-router-dom';

import {
  ALL_TURKEY_CITIES,
  getFirmOperatingZone,
  setFirmOperatingZone,
  type FirmOperatingZone
} from '../../constants/locations';


const Section: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
  badge?: string;
}> = ({ title, subtitle, icon: Icon, children, badge }) => (
  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {badge && (
        <span className="text-[10px] font-black px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full border border-teal-200">
          {badge}
        </span>
      )}
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

// ─── Field ────────────────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ElementType;
  readOnly?: boolean;
  hint?: string;
}> = ({ label, value, onChange, type = 'text', placeholder, icon: Icon, readOnly, hint }) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
    <div className="relative">
      {Icon && <Icon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 text-sm border rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors font-medium min-h-[46px]
          ${readOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200 text-slate-900'}`}
      />
    </div>
    {hint && <p className="text-[11px] text-slate-400 mt-1 font-medium">{hint}</p>}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const FirmSettings: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { soundEnabled, toggleSound, addNotification } = useNotificationStore();
  const navigate = useNavigate();
  const merchantId = user?.merchantId;

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Profil ve İletişim Form Alanları
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxOffice, setTaxOffice] = useState('İskenderun Vergi Dairesi');
  const [taxNumber, setTaxNumber] = useState('9870123456');

  // 2. Filo & Dağıtım Politikaları
  const [defaultPackageFee, setDefaultPackageFee] = useState(50);
  const [courierCutFee, setCourierCutFee] = useState(40);
  const [defaultDispatchMode, setDefaultDispatchMode] = useState<DispatchMode>(DispatchMode.Pool);
  const [offerTimeoutSec, setOfferTimeoutSec] = useState(45);
  const [maxConcurrentOrders, setMaxConcurrentOrders] = useState(3);

  // H3 Hexagon ve Otonom Dağıtım Algoritma Parametreleri
  const [hexagonSizeMeters, setHexagonSizeMeters] = useState<number>(1120);
  const [maxCourierDistanceKm, setMaxCourierDistanceKm] = useState<number>(6);
  const [maxOrdersPerTour, setMaxOrdersPerTour] = useState<number>(2);
  const [orderBatchingTimeMinutes, setOrderBatchingTimeMinutes] = useState<number>(15);
  const [crossRestaurantDistanceMeters, setCrossRestaurantDistanceMeters] = useState<number>(200);

  // 3. Finans & Kasa Limitleri
  const [maxCashLimit, setMaxCashLimit] = useState(3000);
  const [reconciliationPeriod, setReconciliationPeriod] = useState<ReconciliationPeriod>(ReconciliationPeriod.Daily);
  const [autoReminder, setAutoReminder] = useState(true);

  // 4. Harita Bölgesi & Operasyon Şehri (81 İl Dinamik Desteği)
  const [operatingZone, setOperatingZone] = useState<FirmOperatingZone>(getFirmOperatingZone());
  const [selectedCityId, setSelectedCityId] = useState<string>(operatingZone.cityId || '31');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(operatingZone.district || 'İskenderun');
  const [syncToAllMerchants, setSyncToAllMerchants] = useState(true);

  // Sadece form yerel state'ini güncelle — "Kaydet" butonuna basılana kadar sisteme yazılmaz!
  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    const found = ALL_TURKEY_CITIES.find(c => c.id === cityId);
    if (found) {
      const defaultDist = found.districts[0] || `${found.name} Merkez`;
      setSelectedDistrict(defaultDist);
    }
  };

  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
  };

  const normalizeDispatchMode = (mode: unknown): DispatchMode => {
    if (mode === 'Pool' || mode === 1 || mode === '1') return DispatchMode.Pool;
    if (mode === 'Manual' || mode === 2 || mode === '2') return DispatchMode.Manual;
    if (mode === 'SmartAuto' || mode === 3 || mode === '3') return DispatchMode.SmartAuto;
    return DispatchMode.Pool;
  };

  const normalizeReconciliationPeriod = (period: unknown): ReconciliationPeriod => {
    if (period === 'Daily' || period === 1 || period === '1') return ReconciliationPeriod.Daily;
    if (period === 'Weekly' || period === 2 || period === '2') return ReconciliationPeriod.Weekly;
    if (period === 'Monthly' || period === 3 || period === '3') return ReconciliationPeriod.Monthly;
    return ReconciliationPeriod.Daily;
  };

  // Şifre Değiştirme Modalı State'leri
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!merchantId) return;
    (async () => {
      try {
        const res = await api.get<ServiceResult<Merchant>>(`/merchants/${merchantId}`);
        if (res.data.isSuccess && res.data.data) {
          const m = res.data.data;
          setMerchant(m);
          setName(m.name);
          setPhone(m.phoneNumber ?? '');
          setAddress(m.address ?? '');
          if (m.defaultPackageFee) setDefaultPackageFee(m.defaultPackageFee);
          if (m.courierCutFee !== undefined && m.courierCutFee !== null) setCourierCutFee(m.courierCutFee);
          if (m.dispatchMode !== undefined && m.dispatchMode !== null) {
            setDefaultDispatchMode(normalizeDispatchMode(m.dispatchMode));
          }
          if (m.reconciliationPeriod !== undefined && m.reconciliationPeriod !== null) {
            setReconciliationPeriod(normalizeReconciliationPeriod(m.reconciliationPeriod));
          }
          if (typeof m.hexagonSizeMeters === 'number') setHexagonSizeMeters(m.hexagonSizeMeters);
          if (typeof m.maxCourierDistanceKm === 'number') setMaxCourierDistanceKm(m.maxCourierDistanceKm);
          if (typeof m.maxOrdersPerTour === 'number') {
            setMaxOrdersPerTour(m.maxOrdersPerTour);
            setMaxConcurrentOrders(m.maxOrdersPerTour);
          }
          if (typeof m.orderBatchingTimeMinutes === 'number') setOrderBatchingTimeMinutes(m.orderBatchingTimeMinutes);
          if (typeof m.crossRestaurantDistanceMeters === 'number') setCrossRestaurantDistanceMeters(m.crossRestaurantDistanceMeters);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantId]);

  const handleSave = async () => {
    if (!merchantId) return;
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const currentCity = ALL_TURKEY_CITIES.find(c => c.id === selectedCityId);
      const coords = currentCity?.coords || operatingZone.coords;

      const res = await api.put<ServiceResult<Merchant>>(`/merchants/${merchantId}/settings`, {
        name: name.trim(),
        phoneNumber: phone.trim(),
        address: address.trim(),
        latitude: coords[0],
        longitude: coords[1],
        defaultPackageFee: Number(defaultPackageFee),
        courierCutFee: Number(courierCutFee),
        dispatchMode: defaultDispatchMode,
        reconciliationPeriod: reconciliationPeriod,
        hexagonSizeMeters: Number(hexagonSizeMeters),
        maxCourierDistanceKm: Number(maxCourierDistanceKm),
        maxOrdersPerTour: Number(maxOrdersPerTour),
        orderBatchingTimeMinutes: Number(orderBatchingTimeMinutes),
        crossRestaurantDistanceMeters: Number(crossRestaurantDistanceMeters),
      });

      if (res.data.isSuccess) {
        // Zustand store ve localStorage senkronizasyonu
        useAuthStore.getState().updateMerchant({
          name: name.trim(),
          phoneNumber: phone.trim(),
          address: address.trim(),
          latitude: coords[0],
          longitude: coords[1],
        });

        // Operasyon Bölgesi (İl & İlçe) Konfigürasyonunu Kaydet
        if (currentCity) {
          const updated = setFirmOperatingZone({
            cityId: currentCity.id,
            cityName: currentCity.name,
            district: selectedDistrict,
            coords: currentCity.coords
          });
          setOperatingZone(updated);
        }

        // Bağlı tüm restoranlara da bu dağıtım stratejisini ve H3 parametrelerini uygula
        if (syncToAllMerchants) {
          try {
            const allRes = await merchantService.getAllMerchants();
            if (allRes.isSuccess && allRes.data) {
              const affiliated = allRes.data.filter((m) => m.id !== merchantId);
              await Promise.allSettled(
                affiliated.map((m) =>
                  merchantService.updateSettings(m.id, {
                    dispatchMode: defaultDispatchMode,
                    hexagonSizeMeters: Number(hexagonSizeMeters),
                    maxCourierDistanceKm: Number(maxCourierDistanceKm),
                    maxOrdersPerTour: Number(maxOrdersPerTour),
                    orderBatchingTimeMinutes: Number(orderBatchingTimeMinutes),
                    crossRestaurantDistanceMeters: Number(crossRestaurantDistanceMeters),
                  })
                )
              );
            }
          } catch (syncErr) {
            console.warn('Restoranlara senkronizasyon hatası:', syncErr);
          }
        }

        setSuccessMsg(
          syncToAllMerchants
            ? 'Firma ve tüm bağlı restoranların dağıtım ayarları başarıyla eşitlendi ve kaydedildi.'
            : 'Firma filo ayarları başarıyla kaydedildi.'
        );
        addNotification({
          type: 'delivered',
          title: '✅ Ayarlar Güncellendi',
          message: syncToAllMerchants
            ? 'Firma profili ve bağlı tüm restoranların H3 lojistik parametreleri eşitlendi.'
            : 'Firma profili ve H3 algoritma parametreleri başarıyla kaydedildi.',
        });
      } else {
        setErrorMsg(res.data.message ?? 'Güncelleme başarısız.');
      }
    } catch {
      setErrorMsg('Sunucu hatası oluştu. Tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Tüm şifre alanlarını doldurunuz.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.post<ServiceResult>('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data.isSuccess) {
        setPasswordSuccess('Şifreniz başarıyla güncellendi.');
        addNotification({
          type: 'delivered',
          title: '🔒 Şifre Güncellendi',
          message: 'Hesap şifreniz başarıyla değiştirildi.',
        });
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordSuccess('');
        }, 1500);
      } else {
        setPasswordError(res.data.message || 'Mevcut şifre hatalı.');
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setPasswordError(errObj?.response?.data?.message || 'Şifre güncellenirken bir hata oluştu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogoutAll = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-3xl border border-slate-200 h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Üst Başlık & Kaydet Butonu ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Firma & Filo Ayarları</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lojistik firması kurumsal profili, filo dağıtım modelleri ve nakit kasa limitleri
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition-all">
            <input
              type="checkbox"
              checked={syncToAllMerchants}
              onChange={(e) => setSyncToAllMerchants(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <span>Tüm Restoranlara Uygula</span>
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-black text-sm rounded-2xl shadow-md shadow-teal-500/20 transition-all active:scale-95 min-h-[46px]"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
          </button>
        </div>
      </div>

      {/* Bildirimler */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-semibold text-rose-800">{errorMsg}</p>
        </div>
      )}

      {/* 1. Kurumsal Firma & Fatura Bilgileri */}
      <Section title="Kurumsal Firma & İletişim Profili" subtitle="Ticari ünvan, vergi ve merkez adres bilgileri" icon={Building2} badge="Resmi Profil">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Firma Ticari Ünvanı *" value={name} onChange={setName} icon={Building2} placeholder="Zahir Lojistik & Kurye A.Ş." />
            <Field label="Yetkili Telefon Numarası *" value={phone} onChange={setPhone} icon={Phone} placeholder="+90 5XX XXX XX XX" type="tel" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Vergi Dairesi" value={taxOffice} onChange={setTaxOffice} icon={FileText} placeholder="İskenderun V.D." />
            <Field label="Vergi Kimlik No (VKN / TCKN)" value={taxNumber} onChange={setTaxNumber} icon={FileText} placeholder="1234567890" />
          </div>

          <Field label="Firma Merkez Adresi" value={address} onChange={setAddress} icon={MapPin} placeholder="Atatürk Bulvarı, No:12 İskenderun / Hatay" />
          <Field label="Sistem Giriş E-Postası" value={merchant?.email ?? ''} onChange={() => {}} icon={Mail} readOnly hint="E-posta adresi sistem güvenliği nedeniyle doğrudan değiştirilemez." />
        </div>
      </Section>

      {/* 2. Firma Operasyon Bölgesi (81 İl Uyumlu) */}
      <Section title="Firma Operasyon Bölgesi (81 İl Uyumlu)" subtitle="Radar haritası, yeni işletme kayıtları ve hızlı sipariş bölge odağı" icon={Compass} badge="Bölge & Harita">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div>
              <p className="text-xs font-bold text-slate-800">Aktif Operasyon Bölgesi</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Seçilen il ve ilçe harita ve sipariş varsayılanlarını belirler.</p>
            </div>
            <span className="text-xs font-black uppercase tracking-wider bg-teal-50 text-teal-700 px-3 py-1 rounded-xl border border-teal-200 shadow-2xs">
              {ALL_TURKEY_CITIES.find(c => c.id === selectedCityId)?.name ?? operatingZone.cityName} / {selectedDistrict}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* İl Seçimi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Operasyon İli (Şehir - 81 İl)
              </label>
              <select
                value={selectedCityId}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[46px]"
              >
                {ALL_TURKEY_CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {String(c.plate).padStart(2, '0')} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Merkez İlçe Seçimi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Merkez İlçe / Operasyon Hub'ı
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[46px]"
              >
                {(ALL_TURKEY_CITIES.find(c => c.id === selectedCityId)?.districts || [selectedDistrict]).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seçilen İlin Hızlı Atlama Odakları */}
          {(() => {
            const currentCity = ALL_TURKEY_CITIES.find(c => c.id === selectedCityId);
            if (!currentCity || currentCity.quickHubs.length === 0) return null;
            return (
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                  {currentCity.name} Bölgesindeki Önemli Ticari / Gastronomi Odakları
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {currentCity.quickHubs.map((hub) => (
                    <span
                      key={hub.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                      title={hub.description}
                    >
                      📍 {hub.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </Section>

      {/* 3. Filo Dağıtım Politikaları & Komisyon Hesaplayıcı */}
      <Section title="Filo Dağıtım Politikaları & Fiyatlandırma" subtitle="Yeni restoranlar için varsayılan paket ücretleri ve atama kuralları" icon={Sliders} badge="Operasyon">
        <div className="space-y-5">
          {/* Paket Ücreti & Kurye Payı */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Varsayılan Paket Ücreti (TL) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₺</span>
                <input
                  type="number"
                  step="0.5"
                  value={defaultPackageFee}
                  onChange={e => setDefaultPackageFee(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Restorandan tahsil edilecek ücret</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kurye Hakediş Payı (TL) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₺</span>
                <input
                  type="number"
                  step="0.5"
                  value={courierCutFee}
                  onChange={e => setCourierCutFee(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Kuryenin paket başı kazancı</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Net Firma Komisyonu</label>
              <div className="px-3.5 py-2.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 font-black text-sm flex items-center justify-between">
                <span>₺{(defaultPackageFee - courierCutFee).toFixed(2)}</span>
                <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-md">
                  %{defaultPackageFee > 0 ? (((defaultPackageFee - courierCutFee) / defaultPackageFee) * 100).toFixed(0) : 0} Kâr
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Paket başı kalan net şirket kârı</p>
            </div>
          </div>

          {/* Varsayılan Dağıtım Modu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Varsayılan Sipariş Dağıtım Modeli</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  mode: DispatchMode.Pool,
                  label: '📡 Havuz Sistemi',
                  desc: 'Sipariş tüm boş kuryelere düşer, ilk kabul eden alır.',
                },
                {
                  mode: DispatchMode.Manual,
                  label: '🎯 Manuel Atama',
                  desc: 'Siparişler panele düşer, yönetici kuryeyi kendisi seçer.',
                },
                {
                  mode: DispatchMode.SmartAuto,
                  label: '🤖 Akıllı GPS',
                  desc: 'Restorana en yakın boş kuryeye otomatik teklif iletir.',
                },
              ].map(item => (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => setDefaultDispatchMode(item.mode)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    normalizeDispatchMode(defaultDispatchMode) === item.mode
                      ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/30 shadow-sm text-teal-950 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm block">{item.label}</span>
                    {normalizeDispatchMode(defaultDispatchMode) === item.mode && (
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block font-normal leading-snug">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* H3 Hexagon ve Otonom Kümeleme Algoritma Ayarları (Akıllı GPS seçildiğinde açılır) */}
          {normalizeDispatchMode(defaultDispatchMode) === DispatchMode.SmartAuto && (
            <div className="rounded-2xl border-2 border-teal-200/90 bg-gradient-to-br from-teal-50/70 via-emerald-50/30 to-white p-5 md:p-6 shadow-xs animate-in fade-in slide-in-from-top-3 duration-300 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-teal-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-black text-slate-900">
                        H3 Hexagon Algoritması & Otonom Kümeleme Parametreleri
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white">
                        Akıllı GPS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kuryelerin ve siparişlerin hangi coğrafi altıgen hücrelerde ve hangi kurallarla birleştirileceğini belirleyin.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-teal-700 border border-teal-200 shadow-xs">
                    ⚡ Otomatik Motor Aktif
                  </span>
                </div>
              </div>

              {/* 5 Algoritma Parametresi Input Izgarası */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Hexagon Büyüklüğü */}
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs hover:border-teal-300 transition-all">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-teal-600" />
                      <span>Hexagon Büyüklüğü</span>
                    </span>
                    <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded">
                      H3 Çap
                    </span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="number"
                      min={100}
                      max={10000}
                      step={50}
                      value={hexagonSizeMeters}
                      onChange={(e) => setHexagonSizeMeters(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 pr-12 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      metre
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Altıgen hücre arama çapı (Örn: 1120m).
                  </p>
                </div>

                {/* 2. Kurye Atama Mesafesi */}
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs hover:border-teal-300 transition-all">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Navigation className="w-4 h-4 text-indigo-600" />
                      <span>Kurye Atama Mesafesi</span>
                    </span>
                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                      Yarıçap
                    </span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      step={0.5}
                      value={maxCourierDistanceKm}
                      onChange={(e) => setMaxCourierDistanceKm(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 pr-12 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      km
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Kurye atama alanı sınırı (Örn: 6 km).
                  </p>
                </div>

                {/* 3. Tur Başına Sipariş Sayısı */}
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs hover:border-teal-300 transition-all">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Boxes className="w-4 h-4 text-emerald-600" />
                      <span>Sipariş Sayısı (Batching)</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Kapasite
                    </span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={1}
                      value={maxOrdersPerTour}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMaxOrdersPerTour(val);
                        setMaxConcurrentOrders(val);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 pr-14 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      paket
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Kuryenin bir turda alabileceği maksimum paket sayısı.
                  </p>
                </div>

                {/* 4. Restoranlar Arası Mesafe */}
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs hover:border-teal-300 transition-all">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Store className="w-4 h-4 text-amber-600" />
                      <span>Restoranlar Arası Mesafe</span>
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                      Çapraz
                    </span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="number"
                      min={50}
                      max={3000}
                      step={25}
                      value={crossRestaurantDistanceMeters}
                      onChange={(e) => setCrossRestaurantDistanceMeters(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 pr-12 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      metre
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Başka restorandan paket birleştirme mesafesi (Örn: 200m).
                  </p>
                </div>

                {/* 5. Sipariş Birleştirme Bekleme Süresi */}
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs hover:border-teal-300 transition-all">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span>Birleştirme Bekleme Süresi</span>
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                      Pencere
                    </span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      step={1}
                      value={orderBatchingTimeMinutes}
                      onChange={(e) => setOrderBatchingTimeMinutes(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 pr-12 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      dakika
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ortak rota için sipariş bekletme aralığı (Örn: 15dk).
                  </p>
                </div>

                {/* Özet Kartı */}
                <div className="bg-teal-900 text-white p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-300 flex items-center space-x-1">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Algoritma Özeti</span>
                    </span>
                    <p className="text-xs text-teal-100 mt-1 leading-snug">
                      <strong>{maxCourierDistanceKm} km</strong> içindeki kuryeler <strong>{hexagonSizeMeters}m</strong> hücrede taranır. Kurye başına en fazla <strong>{maxOrdersPerTour} paket</strong> eşleştirilir.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-teal-700/60 flex items-center justify-between text-[11px] text-teal-200">
                    <span>Bekleme: {orderBatchingTimeMinutes} dk</span>
                    <span>Çapraz: {crossRestaurantDistanceMeters}m</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Zaman Aşımı & Eşzamanlı Paket Sınırı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Kurye Teklif Zaman Aşımı Süresi</span>
              </label>
              <select
                value={offerTimeoutSec}
                onChange={e => setOfferTimeoutSec(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              >
                <option value={30}>30 Saniye (Çok Hızlı)</option>
                <option value={45}>45 Saniye (Önerilen)</option>
                <option value={60}>60 Saniye (1 Dakika)</option>
                <option value={90}>90 Saniye</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Kurye bu sürede kabul etmezse teklif sonraki kuryeye aktarılır.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Maksimum Eşzamanlı Paket Taşıma Limiti</span>
              </label>
              <select
                value={maxConcurrentOrders}
                onChange={e => setMaxConcurrentOrders(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              >
                <option value={1}>1 Paket (Tek Sipariş - Hızlı Teslimat)</option>
                <option value={2}>2 Paket (Çift Teslimat)</option>
                <option value={3}>3 Paket (Optimize Rota)</option>
                <option value={4}>4 Paket (Maksimum Yoğunluk)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Kuryenin aynı anda üzerine alabileceği aktif sipariş sınırı.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* 3. Finans, Mahsuplaşma & Kasa Güvenlik Limitleri */}
      <Section title="Finans, Mahsuplaşma & Nakit Limitleri" subtitle="Kurye borç/alacak takibi ve güvenlik kuralları" icon={Banknote} badge="Finans">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-500" />
                <span>Kurye Maksimum Nakit Kasa Limiti (TL)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₺</span>
                <input
                  type="number"
                  step="100"
                  value={maxCashLimit}
                  onChange={e => setMaxCashLimit(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Kurye kapıda bu tutardan fazla nakit topladığında uyarı verilir ve kasayı kapatması istenir.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Varsayılan Mahsuplaşma Periyodu</label>
              <select
                value={reconciliationPeriod}
                onChange={e => setReconciliationPeriod(Number(e.target.value) as ReconciliationPeriod)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              >
                <option value={ReconciliationPeriod.Daily}>Günlük (Her Gece 23:59)</option>
                <option value={ReconciliationPeriod.Weekly}>Haftalık (Her Pazar Gecesi)</option>
                <option value={ReconciliationPeriod.Monthly}>Aylık (Ay Sonu Cari Mutabakat)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Bağlı restoranlarla resmi hesap kapatma takvimi.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div>
              <p className="text-xs font-bold text-slate-800">Otomatik Kasa Sıfırlama ve Kapanış Hatırlatıcısı</p>
              <p className="text-[11px] text-slate-400">Mahsuplaşma saati geldiğinde panelde yöneticilere otomatik bildirim düşürür.</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoReminder(!autoReminder)}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                autoReminder ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {autoReminder ? '🟢 Aktif' : '⚪ Pasif'}
            </button>
          </div>
        </div>
      </Section>


      {/* 5. Bildirimler & Sistem Güvenliği */}
      <Section title="Bildirim Tercihleri & Sistem Güvenliği" subtitle="Canlı sesli alarmlar, şifre ve oturum yönetimi" icon={Lock} badge="Güvenlik">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${soundEnabled ? 'bg-teal-500/10 text-teal-600' : 'bg-slate-200 text-slate-500'}`}>
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Canlı Bildirim & Gong Sesleri</p>
                <p className="text-[11px] text-slate-400">Yeni sipariş ve teslimat olaylarında Web Audio API sentezleyici sesi çalar.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                soundEnabled
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {soundEnabled ? '🟢 Açık' : '⚪ Kapalı'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-slate-800">Yönetici Şifresi</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Firma paneli giriş şifrenizi güvenle güncelleyin.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="text-xs font-black text-teal-700 hover:text-teal-800 border border-teal-200 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl transition-all"
            >
              Şifre Değiştir
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-slate-800">Oturumu Kapat</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Bu tarayıcıdaki aktif oturumu güvenle sonlandırın.</p>
            </div>
            <button
              type="button"
              onClick={handleLogoutAll}
              className="text-xs font-black text-rose-700 hover:text-rose-800 border border-rose-200 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl transition-all flex items-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      </Section>

      {/* ─── ALT AKSİYON ÇUBUĞU (KAYDET BUTONU AŞAĞIDA) ─────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <label className="flex items-center space-x-2.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-2xl border border-slate-200 cursor-pointer select-none transition-all w-full sm:w-auto justify-center sm:justify-start">
            <input
              type="checkbox"
              checked={syncToAllMerchants}
              onChange={(e) => setSyncToAllMerchants(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <span>Bu Ayarları Bağlı Tüm Restoranlara Uygula</span>
          </label>
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            Değişiklikleri kaydet butonuna basana kadar ayarlar geçerli olmaz.
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-8 py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-98 disabled:opacity-60 text-white font-black text-sm rounded-2xl shadow-lg shadow-teal-600/25 transition-all min-h-[48px]"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>{saving ? 'Ayarlar Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
        </button>
      </div>

      {/* ── ŞİFRE DEĞİŞTİRME MODALI ───────────────────────────────────── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Şifre Değiştir</h3>
                <p className="text-xs text-slate-500">Hesap giriş şifrenizi güncelleyin</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mevcut Şifre *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Mevcut şifreniz"
                    required
                    className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Yeni Şifre *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  required
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Yeni Şifre (Tekrar) *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Yeni şifrenizi tekrar girin"
                  required
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isChangingPassword}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-black rounded-xl shadow-md shadow-teal-500/25 transition-all flex items-center space-x-2 disabled:opacity-60"
                >
                  {isChangingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Güncelleniyor...</span>
                    </>
                  ) : (
                    <span>Şifreyi Güncelle</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
