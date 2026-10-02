import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Package, Search, RefreshCw, Filter,
  Clock, CheckCircle2, XCircle, Truck,
  ArrowUpDown, AlertTriangle, Banknote, CreditCard, Wifi,
  UserCheck, X, Check
} from 'lucide-react';
import { orderService } from '../../services/orderService';
import { courierService } from '../../services/courierService';
import { merchantService, type MerchantDto } from '../../services/merchantService';
import { startSignalR, onOrderUpdate } from '../../services/signalRService';
import { useCourierStore } from '../../stores/courierStore';
import type { Order, OrderStatus } from '../../types';
import type { CourierState } from '../../types/courier';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Created:   { label: 'Oluşturuldu', color: 'bg-blue-50 text-blue-700 border-blue-200',     icon: Clock },
  Pending:   { label: 'Bekliyor',    color: 'bg-amber-50 text-amber-700 border-amber-200',   icon: AlertTriangle },
  Assigned:  { label: 'Atandı',      color: 'bg-violet-50 text-violet-700 border-violet-200', icon: Truck },
  PickedUp:  { label: 'Yolda',       color: 'bg-teal-50 text-teal-700 border-teal-200',      icon: Truck },
  Delivered: { label: 'Teslim Edildi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  Cancelled: { label: 'İptal Edildi', color: 'bg-rose-50 text-rose-700 border-rose-200',      icon: XCircle },
};

const PAYMENT_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  Cash:               { label: 'Nakit',        icon: Banknote },
  Online:             { label: 'Online',        icon: Wifi },
  CreditCardOnDelivery: { label: 'Kapıda Kart', icon: CreditCard },
};

function getStatus(status: Order['status']) {
  return STATUS_MAP[String(status)] ?? { label: String(status), color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Package };
}

function getPayment(method: Order['paymentMethod']) {
  return PAYMENT_MAP[String(method)] ?? { label: String(method), icon: Banknote };
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

type StatusFilter = 'all' | 'pending' | 'assigned' | 'pickedup' | 'delivered' | 'cancelled';

// ─── Main Component ───────────────────────────────────────────────────────────

export const FirmOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<CourierState[]>([]);
  const [merchants, setMerchants] = useState<MerchantDto[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [merchantFilter, setMerchantFilter] = useState<string>('all');
  const [sortDesc, setSortDesc] = useState(true);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assignTargetOrder, setAssignTargetOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Canlı SignalR Kurye Durumları ile Senkronize Liste
  const courierMap = useCourierStore((s) => s.couriers);
  const storeCouriers = useMemo(() => Array.from(courierMap.values()), [courierMap]);
  const liveCouriers = useMemo(() => {
    if (couriers.length === 0) return storeCouriers;
    return couriers.map((c) => {
      const live = courierMap.get(c.id);
      if (live) {
        return {
          ...c,
          isOnline: live.isOnline !== undefined ? live.isOnline : c.isOnline,
          isAvailable: live.isAvailable !== undefined ? live.isAvailable : c.isAvailable,
          lat: live.lat ?? c.lat,
          lng: live.lng ?? c.lng,
        };
      }
      return c;
    });
  }, [couriers, storeCouriers, courierMap]);

  const openAssignModal = useCallback(async (order: Order) => {
    setAssignTargetOrder(order);
    try {
      const res = await courierService.getAllCouriers();
      if (res.isSuccess && res.data) {
        setCouriers(res.data);
      }
    } catch {
      // Sessiz fallback
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, courierRes, merchantRes] = await Promise.all([
        orderService.getAllOrders(),
        courierService.getAllCouriers(),
        merchantService.getAllMerchants(),
      ]);

      if (orderRes.isSuccess && orderRes.data) setOrders(orderRes.data);
      if (courierRes.isSuccess && courierRes.data) setCouriers(courierRes.data);
      if (merchantRes.isSuccess && merchantRes.data) setMerchants(merchantRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    startSignalR().catch(() => {});
    const unsubscribe = onOrderUpdate((payload) => {
      console.info('[FirmOrders] Canlı sipariş güncellemesi:', payload);
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Filtreleme & Sıralama
  useEffect(() => {
    let list = [...orders];

    // Restoran Filtresi
    if (merchantFilter !== 'all') {
      list = list.filter(o => o.merchantId === merchantFilter);
    }

    // Arama
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.recipientName.toLowerCase().includes(q) ||
        o.recipientPhone.includes(q) ||
        (o.orderCode ?? '').toLowerCase().includes(q) ||
        (o.courierName ?? '').toLowerCase().includes(q) ||
        (o.merchantName ?? '').toLowerCase().includes(q) ||
        (o.deliveryAddressLine ?? '').toLowerCase().includes(q)
      );
    }

    // Durum Filtresi
    if (statusFilter === 'pending') list = list.filter(o => ['Created', 'Pending'].includes(String(o.status)));
    else if (statusFilter === 'assigned') list = list.filter(o => String(o.status) === 'Assigned');
    else if (statusFilter === 'pickedup') list = list.filter(o => String(o.status) === 'PickedUp');
    else if (statusFilter === 'delivered') list = list.filter(o => String(o.status) === 'Delivered');
    else if (statusFilter === 'cancelled') list = list.filter(o => String(o.status) === 'Cancelled');

    // Sıralama
    list.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDesc ? -diff : diff;
    });

    setFiltered(list);
  }, [orders, search, statusFilter, merchantFilter, sortDesc]);

  // Kurye Atama
  const handleAssignCourier = async (courierId: string) => {
    if (!assignTargetOrder) return;
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await orderService.assignCourier(assignTargetOrder.id, courierId);
      if (res.isSuccess) {
        const assignedCourier = liveCouriers.find(c => c.id === courierId);
        setSuccessMsg(`✅ Sipariş #${assignTargetOrder.orderCode ?? assignTargetOrder.id.slice(0, 6)} başarıyla ${assignedCourier ? assignedCourier.firstName + ' ' + assignedCourier.lastName : 'kuryeye'} atandı.`);
        setAssignTargetOrder(null);
        if (selectedOrder?.id === assignTargetOrder.id) {
          setSelectedOrder(null);
        }
        await loadData();
      } else {
        setErrorMsg(res.message || 'Kurye ataması yapılamadı.');
      }
    } catch {
      setErrorMsg('Sunucu hatası oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  // Durum Güncelleme
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus | string | number, statusName: string) => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await orderService.updateStatus(orderId, newStatus);
      if (res.isSuccess) {
        setSuccessMsg(`✅ Sipariş durumu "${statusName}" olarak güncellendi.`);
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: statusName as OrderStatus } : null);
        }
        await loadData();
      } else {
        setErrorMsg(res.message || 'Durum güncellenemedi.');
      }
    } catch {
      setErrorMsg('Sunucu hatası oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  // İstatistikler
  const today = new Date().toDateString();
  const todayDelivered = orders.filter(o => o.status === 'Delivered' && new Date(o.deliveredAt ?? '').toDateString() === today);
  const pendingCount = orders.filter(o => ['Created','Pending'].includes(String(o.status))).length;

  return (
    <div className="space-y-6">

      {/* ── Başlık & Yenile ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tüm Siparişler & Havuz</h1>
          <p className="text-sm text-slate-500 mt-0.5">{orders.length} toplam sipariş · {pendingCount} kurye bekleyen</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-sm shadow-teal-500/20 transition-all active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* ── KPI Kartları ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Sipariş', value: orders.length, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Bekleyen (Havuza)', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Yoldaki Paketler', value: orders.filter(o => ['Assigned','PickedUp'].includes(String(o.status))).length, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Bugün Teslimat', value: todayDelivered.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} rounded-2xl border border-slate-200/80 p-4 shadow-sm`}>
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── Bildirimler ────────────────────────────────────────── */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800 flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4 text-emerald-500" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-semibold text-rose-800 flex-1">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4 text-rose-500" /></button>
        </div>
      )}

      {/* ── Filtre & Arama Tablosu ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex flex-col md:flex-row gap-3">
          {/* Arama */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Alıcı adı, telefon, adres, restoran veya kurye ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
            />
          </div>

          {/* Restoran Filtresi */}
          <div className="flex items-center space-x-2">
            <select
              value={merchantFilter}
              onChange={e => setMerchantFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
            >
              <option value="all">Tüm Restoranlar ({merchants.length})</option>
              {merchants.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Durum Butonları */}
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'pending', label: 'Bekleyen' },
              { id: 'assigned', label: 'Atandı' },
              { id: 'pickedup', label: 'Yolda' },
              { id: 'delivered', label: 'Teslim' },
              { id: 'cancelled', label: 'İptal' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as StatusFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === f.id ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={() => setSortDesc(p => !p)}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              title="Yeniden eskiye sırala"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Sipariş Listesi ────────────────────────────────────── */}
        <div className="divide-y divide-slate-50">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center space-x-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-48" />
                  <div className="h-2.5 bg-slate-100 rounded w-32" />
                </div>
                <div className="w-16 h-5 bg-slate-100 rounded-full" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Sipariş bulunamadı</p>
              <p className="text-xs text-slate-300 mt-1">Arama kriterlerini değiştirin.</p>
            </div>
          ) : (
            filtered.map(order => {
              const s = getStatus(order.status);
              const p = getPayment(order.paymentMethod);
              const SIcon = s.icon;
              const PIcon = p.icon;
              const isUnassigned = ['Created', 'Pending'].includes(String(order.status));

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="px-5 py-4 flex items-center space-x-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isUnassigned ? 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Package className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                      <p className="text-sm font-bold text-slate-900 truncate">{order.recipientName}</p>
                      {order.orderCode && (
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                          #{order.orderCode}
                        </span>
                      )}
                      {order.merchantName && (
                        <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {order.merchantName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-0.5">
                      <span className="text-xs text-slate-500 font-medium">{order.recipientPhone}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400 truncate max-w-xs">{order.deliveryAddressLine}</span>
                      {order.courierName ? (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md font-bold">
                            🚴 {order.courierName}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold">
                            ⏳ Kurye Atanmadı
                          </span>
                        </>
                      )}
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{timeAgo(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Sağ İşlem & Tutar */}
                  <div className="flex items-center space-x-3 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Ödeme Tutarı */}
                    <span className="hidden sm:inline-flex items-center space-x-1 text-xs font-black px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
                      <PIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>₺{order.totalOrderAmount.toFixed(0)}</span>
                    </span>

                    {/* Durum Rozeti */}
                    <span className={`inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${s.color}`}>
                      <SIcon className="w-3.5 h-3.5" />
                      <span>{s.label}</span>
                    </span>

                    {/* Manuel Kurye Ata Butonu */}
                    {isUnassigned && (
                      <button
                        onClick={() => openAssignModal(order)}
                        className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-sm shadow-teal-500/20 transition-all active:scale-95 flex items-center space-x-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Kurye Ata</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sayfa Özeti */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">
              {filtered.length} sipariş listeleniyor {filtered.length !== orders.length && `(toplam ${orders.length} içinden)`}
            </p>
            <p className="text-xs text-slate-500 font-semibold">
              Kurye bekleyen: <span className="text-amber-600 font-bold">{pendingCount}</span> sipariş
            </p>
          </div>
        )}
      </div>

      {/* ── MANUEL KURYE ATAMA MODALI ─────────────────────────────── */}
      {assignTargetOrder && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Kurye Ata</h3>
                  <p className="text-xs text-slate-400">Sipariş: #{assignTargetOrder.orderCode ?? assignTargetOrder.id.slice(0, 6)}</p>
                </div>
              </div>
              <button onClick={() => setAssignTargetOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sipariş Özeti */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
              <p className="font-bold text-slate-800">{assignTargetOrder.recipientName} ({assignTargetOrder.recipientPhone})</p>
              <p className="text-slate-500 truncate">{assignTargetOrder.deliveryAddressLine}</p>
              <p className="font-black text-teal-700 pt-0.5">Tutar: ₺{assignTargetOrder.totalOrderAmount.toFixed(2)}</p>
            </div>

            {/* Kurye Seçimi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Filodaki Kuryeyi Seçin:</label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {liveCouriers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Kayıtlı kurye bulunamadı.</p>
                ) : (
                  [...liveCouriers]
                    .sort((a, b) => {
                      if (a.isOnline === b.isOnline) {
                        if (a.isAvailable === b.isAvailable) return a.firstName.localeCompare(b.firstName);
                        return a.isAvailable ? -1 : 1;
                      }
                      return a.isOnline ? -1 : 1;
                    })
                    .map((courier) => {
                      const isOnline = Boolean(courier.isOnline);
                      const isAvailable = Boolean(courier.isAvailable);

                      return (
                        <div
                          key={courier.id}
                          className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                            isOnline && isAvailable
                              ? 'border-teal-200 bg-teal-50/20 hover:border-teal-400 hover:bg-teal-50/50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                              isOnline ? (isAvailable ? 'bg-teal-500' : 'bg-amber-500') : 'bg-slate-400'
                            }`}>
                              {courier.firstName.charAt(0)}{courier.lastName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {courier.firstName} {courier.lastName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {courier.phoneNumber} · {courier.vehicleBrand || 'Motosiklet'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              !isOnline
                                ? 'bg-slate-100 text-slate-500'
                                : isAvailable
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {!isOnline ? '⚪ Çevrimdışı' : isAvailable ? '🛵 Müsait' : '📦 Meşgul'}
                            </span>

                            <button
                              disabled={actionLoading}
                              onClick={() => handleAssignCourier(courier.id)}
                              className="px-3 py-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
                            >
                              Ata
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setAssignTargetOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SİPARİŞ DETAY VE DURUM ÇEKMECESİ ─────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Sipariş Detayı</h3>
                  <p className="text-xs text-slate-400">#{selectedOrder.orderCode ?? selectedOrder.id.slice(0, 8)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bilgiler Tablosu */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Restoran:</span>
                  <span className="font-bold text-slate-800">{selectedOrder.merchantName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Alıcı Müşteri:</span>
                  <span className="font-bold text-slate-800">{selectedOrder.recipientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Alıcı Telefonu:</span>
                  <span className="font-bold text-teal-700">{selectedOrder.recipientPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Teslimat Adresi:</span>
                  <span className="font-medium text-slate-700 text-right max-w-xs truncate">{selectedOrder.deliveryAddressLine}</span>
                </div>
                {selectedOrder.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Sipariş Notu:</span>
                    <span className="font-semibold text-amber-700">{selectedOrder.notes}</span>
                  </div>
                )}
              </div>

              {/* Finansal & Durum Bilgisi */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-teal-50 border border-teal-100 rounded-2xl text-center">
                  <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Sipariş Tutarı</p>
                  <p className="text-lg font-black text-teal-800 mt-0.5">₺{selectedOrder.totalOrderAmount.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-violet-50 border border-violet-100 rounded-2xl text-center">
                  <p className="text-[10px] text-violet-600 font-bold uppercase tracking-wider">
                    {['Delivered', '5'].includes(String(selectedOrder.status)) ? 'Teslim Eden Kurye' : 'Atanan Kurye'}
                  </p>
                  <p className="text-sm font-black text-violet-800 mt-1 truncate">
                    {selectedOrder.courierName ? `🚴 ${selectedOrder.courierName}` : 'Henüz Atanmadı'}
                  </p>
                </div>
              </div>

              {/* Hızlı Durum Aksiyonları veya Tamamlandı Notu */}
              {['Delivered', 'Cancelled', '5', '6'].includes(String(selectedOrder.status)) ? (
                <div className={`p-4 rounded-2xl border text-center font-bold text-xs flex items-center justify-center space-x-2 ${
                  ['Delivered', '5'].includes(String(selectedOrder.status))
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {['Delivered', '5'].includes(String(selectedOrder.status)) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Bu sipariş teslim edilmiş ve kapatılmıştır. Kurye değişikliği yapılamaz.</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Bu sipariş iptal edilmiştir. Kurye değişikliği yapılamaz.</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">Hızlı Durum Değiştir:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => {
                        openAssignModal(selectedOrder);
                      }}
                      className="p-2.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{selectedOrder.courierId ? 'Kurye Değiştir' : 'Kurye Ata'}</span>
                    </button>

                    <button
                      disabled={actionLoading || selectedOrder.status === 'PickedUp'}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'PickedUp', 'PickedUp')}
                      className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Teslim Alındı (Yolda)</span>
                    </button>

                    <button
                      disabled={actionLoading}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'Delivered', 'Delivered')}
                      className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Teslim Edildi</span>
                    </button>

                    <button
                      disabled={actionLoading}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'Cancelled', 'Cancelled')}
                      className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Siparişi İptal Et</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
