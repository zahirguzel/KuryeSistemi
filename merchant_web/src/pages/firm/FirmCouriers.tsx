import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Search, RefreshCw, CheckCircle2, XCircle,
  Wallet, Phone, ArrowUpDown,
  RotateCcw, AlertTriangle, TrendingDown, TrendingUp,
  Plus, Filter, Edit3, Trash2, X, Mail
} from 'lucide-react';
import { courierService } from '../../services/courierService';
import { merchantService, type MerchantDto } from '../../services/merchantService';
import { financeService } from '../../services/financeService';
import { useAuthStore } from '../../stores/authStore';
import type { CourierState } from '../../types/courier';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function balanceColor(bal: number) {
  if (bal > 0) return 'text-rose-600';   // kurye borçlu (firmaya ödemesi var)
  if (bal < 0) return 'text-emerald-600'; // kurye alacaklı
  return 'text-slate-400';
}

function balanceBg(bal: number) {
  if (bal > 0) return 'bg-rose-50 border-rose-200 text-rose-700';
  if (bal < 0) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return 'bg-slate-50 border-slate-200 text-slate-500';
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type SortKey = 'name' | 'balance' | 'status';

// ─── Main Component ───────────────────────────────────────────────────────────

export const FirmCouriers: React.FC = () => {
  const { user } = useAuthStore();
  const firmMerchantId = user?.merchantId || '';

  const [couriers, setCouriers] = useState<CourierState[]>([]);
  const [merchants, setMerchants] = useState<MerchantDto[]>([]);
  const [filtered, setFiltered] = useState<CourierState[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'busy' | 'online'>('all');
  const [filterMerchant, setFilterMerchant] = useState<string>('all');
  const [reconciling, setReconciling] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCourier, setEditCourier] = useState<CourierState | null>(null);
  const [deleteConfirmCourier, setDeleteConfirmCourier] = useState<CourierState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    merchantId: '', // '' = Ortak Filo (restorana tahsisli değil)
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    vehicleType: 0,
    licensePlate: '',
    vehicleBrand: '',
    vehicleModel: '',
    isAvailable: true,
  });

  const loadCouriers = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [courierRes, merchantRes] = await Promise.all([
        courierService.getAllCouriers(),
        merchantService.getAllMerchants(),
      ]);

      if (courierRes.isSuccess && courierRes.data) {
        setCouriers(courierRes.data);
      } else {
        setErrorMsg(courierRes.message ?? 'Kuryeler alınamadı.');
      }

      if (merchantRes.isSuccess && merchantRes.data) {
        setMerchants(merchantRes.data);
      }
    } catch {
      setErrorMsg('Kurye ve işletme listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [formData.merchantId]);

  useEffect(() => { loadCouriers(); }, [loadCouriers]);

  // Filtre + sıralama
  useEffect(() => {
    let list = [...couriers];

    // Restoran Filtresi
    if (filterMerchant !== 'all') {
      list = list.filter(c => filterMerchant === 'fleet' ? !c.merchantId : c.merchantId === filterMerchant);
    }

    // Arama
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.phoneNumber.includes(q) ||
        (c.licensePlate && c.licensePlate.toLowerCase().includes(q))
      );
    }

    // Durum filtresi
    if (filterStatus === 'available') list = list.filter(c => c.isAvailable);
    else if (filterStatus === 'busy') list = list.filter(c => !c.isAvailable);
    else if (filterStatus === 'online') list = list.filter(c => c.isOnline);

    // Sıralama
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'tr');
      else if (sortKey === 'balance') cmp = (a.currentBalance ?? 0) - (b.currentBalance ?? 0);
      else if (sortKey === 'status') cmp = Number(b.isAvailable) - Number(a.isAvailable);
      return sortAsc ? cmp : -cmp;
    });

    setFiltered(list);
  }, [couriers, search, sortKey, sortAsc, filterStatus, filterMerchant]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleReconcile = async (courier: CourierState) => {
    if ((courier.currentBalance ?? 0) === 0) {
      setErrorMsg(`${courier.firstName} ${courier.lastName} adlı kurye'nin bakiyesi zaten 0.`);
      return;
    }
    setReconciling(courier.id);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await financeService.reconcileCourier(courier.id);
      if (res.isSuccess) {
        setSuccessMsg(`✅ ${courier.firstName} ${courier.lastName} ile mahsuplaşma tamamlandı. Sıfırlanan: ₺${fmt(courier.currentBalance ?? 0)}`);
        await loadCouriers();
      } else {
        setErrorMsg(res.message ?? 'Mahsuplaşma başarısız.');
      }
    } catch {
      setErrorMsg('Mahsuplaşma sırasında hata oluştu.');
    } finally {
      setReconciling(null);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      merchantId: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      vehicleType: 0,
      licensePlate: '',
      vehicleBrand: '',
      vehicleModel: '',
      isAvailable: true,
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (courier: CourierState) => {
    setEditCourier(courier);
    // Parse vehicle type string to number
    let vType = 0;
    if (typeof courier.vehicleType === 'string') {
      const vLower = courier.vehicleType.toLowerCase();
      if (vLower.includes('car') || vLower.includes('oto')) vType = 1;
      else if (vLower.includes('bic') || vLower.includes('bisiklet')) vType = 2;
      else if (vLower.includes('scooter')) vType = 4;
    }

    setFormData({
      merchantId: courier.merchantId || '',
      firstName: courier.firstName,
      lastName: courier.lastName,
      phoneNumber: courier.phoneNumber,
      email: courier.email,
      vehicleType: vType,
      licensePlate: courier.licensePlate || '',
      vehicleBrand: courier.vehicleBrand || '',
      vehicleModel: courier.vehicleModel || '',
      isAvailable: courier.isAvailable,
    });
  };


  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber) {
      setErrorMsg('Lütfen zorunlu alanları (Ad, Soyad, Telefon) doldurun.');
      return;
    }

    setActionLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await courierService.createCourier({
        merchantId: formData.merchantId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        email: formData.email || `${formData.phoneNumber}@kurye.com`,
        vehicleType: formData.vehicleType,
        licensePlate: formData.licensePlate,
        vehicleBrand: formData.vehicleBrand,
        vehicleModel: formData.vehicleModel,
      });

      if (res.isSuccess) {
        setSuccessMsg(`✅ ${formData.firstName} ${formData.lastName} kurye olarak başarıyla kaydedildi.`);
        setShowAddModal(false);
        await loadCouriers();
      } else {
        let err = res.message || 'Kurye eklenirken hata oluştu.';
        if (Array.isArray(res.errors) && res.errors.length > 0) err += ` (${res.errors.join(', ')})`;
        setErrorMsg(err);
      }
    } catch {
      setErrorMsg('Sunucu hatası oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourier) return;

    setActionLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await courierService.updateCourier(editCourier.id, {
        merchantId: formData.merchantId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        vehicleType: formData.vehicleType,
        licensePlate: formData.licensePlate,
        vehicleBrand: formData.vehicleBrand,
        vehicleModel: formData.vehicleModel,
        isAvailable: formData.isAvailable,
      });

      if (res.isSuccess) {
        setSuccessMsg(`✅ ${formData.firstName} ${formData.lastName} kurye bilgileri güncellendi.`);
        setEditCourier(null);
        await loadCouriers();
      } else {
        let err = res.message || 'Kurye güncellenirken hata oluştu.';
        if (Array.isArray(res.errors) && res.errors.length > 0) err += ` (${res.errors.join(', ')})`;
        setErrorMsg(err);
      }
    } catch {
      setErrorMsg('Sunucu hatası oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCourier = async () => {
    if (!deleteConfirmCourier) return;

    setActionLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await courierService.deleteCourier(deleteConfirmCourier.id);
      if (res.isSuccess) {
        setSuccessMsg(`✅ ${deleteConfirmCourier.firstName} ${deleteConfirmCourier.lastName} başarıyla silindi.`);
        setDeleteConfirmCourier(null);
        await loadCouriers();
      } else {
        setErrorMsg(res.message || 'Kurye silinemedi.');
      }
    } catch {
      setErrorMsg('Kurye silinirken sunucu hatası oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  // Özet istatistikler
  const totalBalance = couriers.reduce((s, c) => s + (c.currentBalance ?? 0), 0);
  const debtCount = couriers.filter(c => (c.currentBalance ?? 0) > 0).length;
  const availableCount = couriers.filter(c => c.isAvailable).length;

  return (
    <div className="space-y-6">

      {/* ── Başlık & Eylemler ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kurye Yönetimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">{couriers.length} kayıtlı kurye · {availableCount} müsait</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm rounded-xl shadow-sm shadow-teal-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kurye Ekle</span>
          </button>
          <button
            onClick={loadCouriers}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-bold text-sm rounded-xl shadow-sm transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* ── Özet KPI ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Kurye', value: couriers.length, icon: Users, bg: 'bg-teal-50', color: 'text-teal-600' },
          { label: 'Müsait', value: availableCount, icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Bekleyen Borç', value: debtCount, icon: AlertTriangle, bg: 'bg-rose-50', color: 'text-rose-600' },
          {
            label: 'Toplam Bakiye',
            value: `${totalBalance >= 0 ? '+' : ''}₺${fmt(totalBalance)}`,
            icon: Wallet,
            bg: totalBalance >= 0 ? 'bg-amber-50' : 'bg-emerald-50',
            color: totalBalance >= 0 ? 'text-amber-600' : 'text-emerald-600',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${kpi.bg}`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <p className="text-xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── Bildirimler ────────────────────────────────────────── */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-emerald-800">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-rose-800">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-rose-500 hover:text-rose-700">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Filtre ve Arama ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex flex-col md:flex-row gap-3">
          {/* Arama */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="İsim, telefon veya plaka ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* Restoran / Filo Filtresi */}
          <div className="flex items-center space-x-2">
            <select
              value={filterMerchant}
              onChange={e => setFilterMerchant(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
            >
              <option value="all">Tüm Filo Kuryeleri ({couriers.length})</option>
              <option value="fleet">🌟 Ortak Filo (Tüm Restoranlar)</option>
              {merchants.map(m => (
                <option key={m.id} value={m.id}>🏪 {m.name} (Zimmetli)</option>
              ))}
            </select>
          </div>

          {/* Durum filtresi */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
            {(['all', 'available', 'busy', 'online'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === f
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {{ all: 'Tümü', available: 'Müsait', busy: 'Meşgul', online: 'Online' }[f]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tablo Başlıkları ─────────────────────────────────── */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          <button onClick={() => toggleSort('name')} className="flex items-center space-x-1 hover:text-slate-700">
            <span>Kurye & Filo Modeli</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <span>Telefon & E-Posta</span>
          <button onClick={() => toggleSort('status')} className="flex items-center space-x-1 hover:text-slate-700">
            <span>Durum</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSort('balance')} className="flex items-center space-x-1 hover:text-slate-700">
            <span>Bakiye</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <span className="text-right">İşlemler</span>
        </div>

        {/* ── Satırlar ─────────────────────────────────────────── */}
        <div className="divide-y divide-slate-50">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-40" />
                  <div className="h-2.5 bg-slate-100 rounded w-24" />
                </div>
                <div className="w-20 h-6 bg-slate-100 rounded-full" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Kurye bulunamadı</p>
              <p className="text-xs text-slate-300 mt-1">Arama kriterlerini değiştirin veya yeni kurye ekleyin.</p>
            </div>
          ) : (
            filtered.map(courier => {
              const bal = courier.currentBalance ?? 0;
              const isReconciling = reconciling === courier.id;
              const merchant = merchants.find(m => m.id === courier.merchantId);
              const isSharedFleet = !courier.merchantId || courier.merchantId === firmMerchantId || !merchant;

              return (
                <div
                  key={courier.id}
                  className="px-5 py-4 grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 sm:gap-4 items-center hover:bg-slate-50/80 transition-colors"
                >
                  {/* Kurye Bilgisi */}
                  <div className="flex items-center space-x-3">
                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 ${
                      courier.isOnline ? 'bg-teal-500' : 'bg-slate-300'
                    }`}>
                      {courier.firstName.charAt(0)}{courier.lastName.charAt(0)}
                      {courier.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{courier.firstName} {courier.lastName}</p>
                      <p className="text-[11px] text-slate-400">
                        {courier.vehicleBrand} {courier.vehicleModel} · {courier.licensePlate || 'Plakasız'}
                      </p>
                      {isSharedFleet ? (
                        <span className="inline-block text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md mt-0.5 border border-teal-200">
                          🌟 Ortak Filo (Tüm Restoranlar)
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-0.5 border border-amber-200">
                          🏪 {merchant?.name} (Zimmetli)
                        </span>
                      )}
                    </div>
                  </div>


                  {/* Telefon & E-posta */}
                  <div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{courier.phoneNumber}</span>
                    </div>
                    {courier.email && (
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{courier.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Durum */}
                  <div>
                    <span className={`inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                      courier.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${courier.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{courier.isAvailable ? 'Müsait' : 'Meşgul'}</span>
                    </span>
                  </div>

                  {/* Bakiye */}
                  <div>
                    <span className={`inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full border ${balanceBg(bal)}`}>
                      {bal > 0 ? <TrendingUp className="w-3 h-3" /> : bal < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                      <span className={balanceColor(bal)}>
                        {bal === 0 ? '₺0,00' : `${bal > 0 ? '' : '-'}₺${fmt(bal)}`}
                      </span>
                    </span>
                    {bal > 0 && <p className="text-[10px] text-rose-500 mt-0.5">Kurye borçlu</p>}
                    {bal < 0 && <p className="text-[10px] text-emerald-600 mt-0.5">Firma borçlu</p>}
                  </div>

                  {/* Aksiyon Butonları */}
                  <div className="flex items-center space-x-2 justify-end">
                    <button
                      onClick={() => handleReconcile(courier)}
                      disabled={isReconciling || bal === 0}
                      title="Nakit Kasa Mahsuplaş"
                      className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        bal === 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-teal-500 hover:bg-teal-600 text-white shadow-sm shadow-teal-500/20 disabled:opacity-60'
                      }`}
                    >
                      {isReconciling ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden md:inline">Mahsuplaş</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(courier)}
                      title="Kuryeyi Düzenle"
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmCourier(courier)}
                      title="Kuryeyi Sil"
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sayfa özeti */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">
              {filtered.length} kurye gösteriliyor
              {filtered.length !== couriers.length && ` (toplam ${couriers.length} içinden)`}
            </p>
            <p className="text-xs text-slate-500 font-semibold">
              Bakiyesi sıfır olmayan: <span className="text-rose-600">{debtCount}</span> kurye
            </p>
          </div>
        )}
      </div>

      {/* ── YENİ KURYE EKLE MODALI ──────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Plus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Yeni Kurye Ekle</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 mt-4">
              {/* Restoran / Filo Seçimi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bağlı Olduğu Filo Modeli / Restoran *</label>
                <select
                  value={formData.merchantId}
                  onChange={e => setFormData({ ...formData, merchantId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold text-slate-800"
                >
                  <option value="">🌟 Ortak Filo / Tüm Restoranlar (Havuz Dağıtım)</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>🏪 {m.name} (Özel / Zimmetli)</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ortak Filo seçilirse kurye tüm bağlı restoranların siparişlerini alabilir.
                </p>
              </div>


              {/* Ad & Soyad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ahmet"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Soyad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Yılmaz"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              {/* Telefon & E-Posta */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefon *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+905551112233"
                    value={formData.phoneNumber}
                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-Posta</label>
                  <input
                    type="email"
                    placeholder="ahmet@kurye.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              {/* Araç Bilgileri */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Araç Tipi</label>
                  <select
                    value={formData.vehicleType}
                    onChange={e => setFormData({ ...formData, vehicleType: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value={0}>Motosiklet</option>
                    <option value={1}>Otomobil</option>
                    <option value={2}>Bisiklet</option>
                    <option value={4}>Scooter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marka / Model</label>
                  <input
                    type="text"
                    placeholder="Honda PCX"
                    value={formData.vehicleBrand}
                    onChange={e => setFormData({ ...formData, vehicleBrand: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plaka</label>
                  <input
                    type="text"
                    placeholder="34 ABC 123"
                    value={formData.licensePlate}
                    onChange={e => setFormData({ ...formData, licensePlate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm shadow-sm shadow-teal-500/20 disabled:opacity-60 transition-all"
                >
                  {actionLoading ? 'Kaydediliyor...' : 'Kuryeyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DÜZENLE MODALI ──────────────────────────────────────── */}
      {editCourier && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Kuryeyi Düzenle</h2>
              </div>
              <button onClick={() => setEditCourier(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              {/* Restoran / Filo Seçimi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bağlı Olduğu Filo Modeli / Restoran *</label>
                <select
                  value={formData.merchantId}
                  onChange={e => setFormData({ ...formData, merchantId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold text-slate-800"
                >
                  <option value="">🌟 Ortak Filo / Tüm Restoranlar (Havuz Dağıtım)</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>🏪 {m.name} (Özel / Zimmetli)</option>
                  ))}
                </select>
              </div>

              {/* Ad & Soyad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ad *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Soyad *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              {/* Telefon & E-Posta */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefon *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-Posta</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              {/* Araç Bilgileri */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Araç Tipi</label>
                  <select
                    value={formData.vehicleType}
                    onChange={e => setFormData({ ...formData, vehicleType: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value={0}>Motosiklet</option>
                    <option value={1}>Otomobil</option>
                    <option value={2}>Bisiklet</option>
                    <option value={4}>Scooter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marka</label>
                  <input
                    type="text"
                    value={formData.vehicleBrand}
                    onChange={e => setFormData({ ...formData, vehicleBrand: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plaka</label>
                  <input
                    type="text"
                    value={formData.licensePlate}
                    onChange={e => setFormData({ ...formData, licensePlate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              {/* Müsaitlik Durumu */}
              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="isAvailableCheck"
                  checked={formData.isAvailable}
                  onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <label htmlFor="isAvailableCheck" className="text-sm font-semibold text-slate-700">
                  Kurye Müsait (Sipariş alabilir)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditCourier(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm shadow-sm shadow-teal-500/20 disabled:opacity-60 transition-all"
                >
                  {actionLoading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SİLME ONAY MODALI ────────────────────────────────────── */}
      {deleteConfirmCourier && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Kuryeyi Sil</h3>
            <p className="text-xs text-slate-500 mt-2">
              <span className="font-bold text-slate-700">{deleteConfirmCourier.firstName} {deleteConfirmCourier.lastName}</span> adlı kuryeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>

            <div className="flex items-center justify-center space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirmCourier(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteCourier}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/20 disabled:opacity-60 transition-all"
              >
                {actionLoading ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
