// src/pages/Finance.tsx
//
// Restoran Finans & Kurye Firması Mahsuplaşma Masası
// - Restoran ile Kurye Firması arasındaki net hesap dengesi (Toplanan Nakit - Firma Hizmet Bedeli)
// - Nakit / Online / Kapıda Kart bazında filtrelenebilir paket dökümü
// - Paket başı detay modalı
// - Kuryelerin restorana ait teslimat ve nakit tahsilat dağılımı
// - Geçmiş mahsuplaşma arşivi

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Coins,
  Scale,
  History,
  Clock,
  Timer,
  Zap,
  CheckCircle2,
  Loader2,
  Search,
  Filter,
  CreditCard,
  Wifi,
  Banknote,
  Bike,
  Building2,
  ChevronRight,
  X,
  Package,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { courierService } from '../services/courierService';
import { orderService } from '../services/orderService';
import { financeService } from '../services/financeService';
import type { Order, CashSettlement, MerchantFinanceSummary } from '../types';
import type { CourierState } from '../types/courier';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtTime(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDeliveryDuration(createdAt?: string, deliveredAt?: string): {
  minutes: number;
  label: string;
  badgeClass: string;
} | null {
  if (!createdAt || !deliveredAt) return null;
  const start = new Date(createdAt).getTime();
  const end = new Date(deliveredAt).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return null;

  const diffSeconds = Math.round((end - start) / 1000);
  if (diffSeconds < 60) {
    return {
      minutes: 1,
      label: '< 1 dk',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  const totalMinutes = Math.round(diffSeconds / 60);

  let label = `${totalMinutes} dk`;
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    label = mins > 0 ? `${hours} sa ${mins} dk` : `${hours} sa`;
  }

  let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (totalMinutes > 45) {
    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (totalMinutes > 30) {
    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return { minutes: totalMinutes, label, badgeClass };
}

function isCash(method: unknown): boolean {
  return method === 'Cash' || method === 1 || String(method).toLowerCase() === 'cash';
}

function isOnline(method: unknown): boolean {
  return method === 'Online' || method === 0 || String(method).toLowerCase() === 'online';
}

function isCard(method: unknown): boolean {
  return (
    method === 'CreditCardOnDelivery' ||
    method === 2 ||
    String(method).toLowerCase().includes('card') ||
    String(method).toLowerCase().includes('kart')
  );
}

function getPaymentBadge(method: Order['paymentMethod']) {
  if (isCash(method)) {
    return {
      label: 'Nakit (Kapıda)',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Banknote,
    };
  }
  if (isOnline(method)) {
    return {
      label: 'Online Ödeme',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: Wifi,
    };
  }
  if (isCard(method)) {
    return {
      label: 'Kapıda Kredi Kartı',
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: CreditCard,
    };
  }
  return {
    label: String(method),
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Coins,
  };
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export const Finance: React.FC = () => {
  const { merchant } = useAuthStore();
  const defaultFee = Number(merchant?.defaultPackageFee ?? 75);

  // Tab & Filtre State'leri
  const [activeTab, setActiveTab] = useState<'packages' | 'couriers' | 'history'>('packages');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'online' | 'card'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [search, setSearch] = useState('');

  // Veri State'leri
  const [orders, setAllOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<CourierState[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<CashSettlement[]>([]);
  const [backendSummary, setBackendSummary] = useState<MerchantFinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detay Modalı
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // ── Verileri Backend'den Çek ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!merchant?.id) return;
    setIsLoading(true);

    try {
      const [ordersRes, couriersRes, historyRes, summaryRes] = await Promise.allSettled([
        orderService.getAllOrders(merchant.id),
        courierService.getAllCouriers(),
        financeService.getSettlementHistory(),
        financeService.getMerchantFinanceSummary({ merchantId: merchant.id }),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value.isSuccess && ordersRes.value.data) {
        setAllOrders(ordersRes.value.data);
      }

      if (couriersRes.status === 'fulfilled' && couriersRes.value.isSuccess && couriersRes.value.data) {
        setCouriers(couriersRes.value.data);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.isSuccess && historyRes.value.data) {
        setSettlementHistory(historyRes.value.data);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.isSuccess && summaryRes.value.data) {
        setBackendSummary(summaryRes.value.data);
      }
    } catch (err) {
      console.error('[Finance] Veri yükleme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  }, [merchant?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Teslim Edilmiş Siparişler (Finansal Veri Tabanı) ───────────────────────
  const allDeliveredOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'Delivered' || o.status === 3 || String(o.status) === 'Delivered'
    );
  }, [orders]);

  // Tarih Filtresi Uygula
  const dateFilteredOrders = useMemo(() => {
    if (dateFilter === 'all') return allDeliveredOrders;
    const now = new Date();

    return allDeliveredOrders.filter((o) => {
      const d = new Date(o.deliveredAt || o.createdAt);
      if (dateFilter === 'today') {
        return d.toDateString() === now.toDateString();
      }
      if (dateFilter === 'week') {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (dateFilter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [allDeliveredOrders, dateFilter]);

  // ── Finansal Hesaplamalar (Restoran <-> Kurye Firması Dengesi) ──────────────
  const financeMetrics = useMemo(() => {
    const list = dateFilteredOrders;

    const cashOrders = list.filter((o) => isCash(o.paymentMethod));
    const onlineOrders = list.filter((o) => isOnline(o.paymentMethod));
    const cardOrders = list.filter((o) => isCard(o.paymentMethod));

    // 1. Kuryelerin Tahsil Ettiği Nakit (Restoran Parası Kurye/Firmada Duruyor)
    const cashTotal = cashOrders.reduce((sum, o) => sum + (o.totalOrderAmount || 0), 0);

    // 2. Restoranın Doğrudan Aldığı Tutar (Online + Kapıda Kart)
    const onlineTotal = onlineOrders.reduce((sum, o) => sum + (o.totalOrderAmount || 0), 0);
    const cardTotal = cardOrders.reduce((sum, o) => sum + (o.totalOrderAmount || 0), 0);
    const merchantDirectTotal = onlineTotal + cardTotal;

    // 3. Toplam Ciro
    const totalGrossRevenue = cashTotal + merchantDirectTotal;

    // 4. Kurye Firması Lojistik Hizmet Bedeli
    // Teslim edilen her paket için restoran firmaya DefaultPackageFee öder
    const totalFirmDeliveryFee = list.length * defaultFee;

    // 5. Net Mahsuplaşma Dengesi (Firma ile Restoran Arasındaki Hesap)
    const netBalance = cashTotal - totalFirmDeliveryFee;

    // Eğer backend'den gelen resmi özet hazırsa ve filtre 'all' ise backend hesaplamalarını öncelikli kullan
    if (backendSummary && dateFilter === 'all') {
      const bCashCount = backendSummary.orders.filter((o) => isCash(o.paymentMethod)).length;
      const bOnlineCount = backendSummary.orders.filter((o) => isOnline(o.paymentMethod)).length;
      const bCardCount = backendSummary.orders.filter((o) => isCard(o.paymentMethod)).length;

      return {
        deliveredCount: backendSummary.totalDeliveredCount,
        cashCount: bCashCount,
        onlineCount: bOnlineCount,
        cardCount: bCardCount,
        cashTotal: backendSummary.totalCashAmount,
        onlineTotal: backendSummary.totalOnlineAmount,
        cardTotal: backendSummary.totalCardAmount,
        merchantDirectTotal: backendSummary.totalDirectRevenue,
        totalGrossRevenue: backendSummary.totalCashAmount + backendSummary.totalDirectRevenue,
        totalFirmDeliveryFee: backendSummary.totalFirmDeliveryFee,
        netBalance: backendSummary.netSettlementBalance,
      };
    }

    return {
      deliveredCount: list.length,
      cashCount: cashOrders.length,
      onlineCount: onlineOrders.length,
      cardCount: cardOrders.length,
      cashTotal,
      onlineTotal,
      cardTotal,
      merchantDirectTotal,
      totalGrossRevenue,
      totalFirmDeliveryFee,
      netBalance,
    };
  }, [backendSummary, dateFilter, dateFilteredOrders, defaultFee]);

  // ── Tablo İçin Nihai Filtrelenmiş Paketler (Ödeme Yöntemi & Arama) ───────────
  const displayOrders = useMemo(() => {
    let result = dateFilteredOrders;

    // Ödeme yöntemi filtresi
    if (paymentFilter === 'cash') {
      result = result.filter((o) => isCash(o.paymentMethod));
    } else if (paymentFilter === 'online') {
      result = result.filter((o) => isOnline(o.paymentMethod));
    } else if (paymentFilter === 'card') {
      result = result.filter((o) => isCard(o.paymentMethod));
    }

    // Arama sorgusu
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          (o.orderCode ?? '').toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          (o.recipientName ?? '').toLowerCase().includes(q) ||
          (o.recipientPhone ?? '').includes(q) ||
          (o.courierName ?? '').toLowerCase().includes(q) ||
          (o.deliveryAddressLine ?? '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [dateFilteredOrders, paymentFilter, search]);

  // ── Kurye Dağılımı (Restoranın Paketlerini Teslim Eden Kuryeler) ───────────
  const courierBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        plate: string;
        deliveredCount: number;
        cashCollected: number;
        onlineCount: number;
        cardCount: number;
        lastDeliveredAt?: string;
      }
    >();

    dateFilteredOrders.forEach((o) => {
      const cid = o.courierId || o.courierName || 'unknown';
      const cInfo = couriers.find((c) => c.id === o.courierId);

      const existing = map.get(cid) || {
        id: cid,
        name: o.courierName || `${cInfo?.firstName || 'Kurye'} ${cInfo?.lastName || ''}`.trim(),
        phone: cInfo?.phoneNumber || '—',
        plate: cInfo?.licensePlate || cInfo?.vehicleBrand || 'Motosiklet',
        deliveredCount: 0,
        cashCollected: 0,
        onlineCount: 0,
        cardCount: 0,
        lastDeliveredAt: o.deliveredAt || o.createdAt,
      };

      existing.deliveredCount += 1;
      if (isCash(o.paymentMethod)) {
        existing.cashCollected += o.totalOrderAmount || 0;
      } else if (isOnline(o.paymentMethod)) {
        existing.onlineCount += 1;
      } else if (isCard(o.paymentMethod)) {
        existing.cardCount += 1;
      }

      if (o.deliveredAt && (!existing.lastDeliveredAt || new Date(o.deliveredAt) > new Date(existing.lastDeliveredAt))) {
        existing.lastDeliveredAt = o.deliveredAt;
      }

      map.set(cid, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.deliveredCount - a.deliveredCount);
  }, [dateFilteredOrders, couriers]);

  return (
    <div className="space-y-6">
      {/* ── Üst Başlık & Eylemler ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Kasa & Mahsuplaşma Masası
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <p className="text-xs sm:text-sm text-slate-500">
              Kurye firması ile olan teslimat hesaplaşmanızı, nakit tahsilatları ve paket ödemelerini anlık takip edin.
            </p>
            {backendSummary?.averageDeliveryDurationMinutes ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-800 rounded-lg text-xs font-bold">
                <Timer className="w-3.5 h-3.5 text-amber-600" />
                <span>Ort. Teslimat Süresi: <strong>{backendSummary.averageDeliveryDurationMinutes} dk</strong></span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tarih Aralığı Seçici */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            {[
              { id: 'today', label: 'Bugün' },
              { id: 'week', label: 'Bu Hafta' },
              { id: 'month', label: 'Bu Ay' },
              { id: 'all', label: 'Tüm Zamanlar' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  dateFilter === d.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-xs font-bold shadow-2xs active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* ── 4'lü Finansal Özet Kartları (Restoran <-> Kurye Firması) ──────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Kuryelerdeki Nakit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Kuryedeki Nakit
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            ₺{fmt(financeMetrics.cashTotal)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{financeMetrics.cashCount} nakit siparişin kuryedeki tutarı</span>
          </p>
          <div className="mt-2 text-[10px] font-bold text-amber-700 bg-amber-50/70 border border-amber-200/60 rounded px-2 py-0.5 inline-block">
            Restoran Parası (Firma Tarafında)
          </div>
        </div>

        {/* 2. Kurye Firması Hizmet Bedeli */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Firma Paket Bedeli
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            ₺{fmt(financeMetrics.totalFirmDeliveryFee)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <Scale className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            <span>{financeMetrics.deliveredCount} paket × ₺{fmt(defaultFee)} sabit ücret</span>
          </p>
          <div className="mt-2 text-[10px] font-bold text-violet-700 bg-violet-50/70 border border-violet-200/60 rounded px-2 py-0.5 inline-block">
            Lojistik Komisyon Tutarı
          </div>
        </div>

        {/* 3. Online & Kartlı Ödemeler */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Online / Kartlı Ciro
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            ₺{fmt(financeMetrics.merchantDirectTotal)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{financeMetrics.onlineCount + financeMetrics.cardCount} sipariş (Doğrudan hesaba)</span>
          </p>
          <div className="mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50/70 border border-emerald-200/60 rounded px-2 py-0.5 inline-block">
            Restoran Kasasında Kalan
          </div>
        </div>

        {/* 4. Net Mahsuplaşma Durumu */}
        <div className={`p-5 rounded-2xl border shadow-xs transition-all ${
          financeMetrics.netBalance > 0
            ? 'bg-emerald-50/70 border-emerald-300'
            : financeMetrics.netBalance < 0
            ? 'bg-rose-50/70 border-rose-300'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Net Hesaplaşma
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
              financeMetrics.netBalance > 0
                ? 'bg-emerald-200/70 text-emerald-800'
                : financeMetrics.netBalance < 0
                ? 'bg-rose-200/70 text-rose-800'
                : 'bg-slate-200 text-slate-700'
            }`}>
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>

          <h3 className={`text-2xl font-black tracking-tight ${
            financeMetrics.netBalance > 0
              ? 'text-emerald-800'
              : financeMetrics.netBalance < 0
              ? 'text-rose-800'
              : 'text-slate-800'
          }`}>
            ₺{fmt(Math.abs(financeMetrics.netBalance))}
          </h3>

          <p className="text-[11px] font-bold mt-1">
            {financeMetrics.netBalance > 0 ? (
              <span className="text-emerald-700">🟢 Firma Restorana Ödeyecek</span>
            ) : financeMetrics.netBalance < 0 ? (
              <span className="text-rose-700">🔴 Restoran Firmaya Borçlu</span>
            ) : (
              <span className="text-slate-500">⚪ Hesap Tam Dengede</span>
            )}
          </p>

          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
            Hesap: Nakit (₺{fmt(financeMetrics.cashTotal)}) - Paket Ücreti (₺{fmt(financeMetrics.totalFirmDeliveryFee)})
          </p>
        </div>
      </div>

      {/* ── Sekme Geçiş Butonları ────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('packages')}
          className={`pb-3.5 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'packages'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Teslim Edilen Paketler ({financeMetrics.deliveredCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('couriers')}
          className={`pb-3.5 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'couriers'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>Kurye Dağılımı ({courierBreakdown.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3.5 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Mahsuplaşma Geçmişi ({settlementHistory.length})</span>
        </button>
      </div>

      {/* ── 1. SEKME: Teslim Edilen Paketler & Ödeme Filtreleri ────────────── */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          {/* Ödeme Türü Filtre Butonları + Arama Çubuğu */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* Ödeme Türü Filtreleri (Nakit / Online / Kapıda Kart) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Ödeme Türü:
              </span>

              <button
                onClick={() => setPaymentFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  paymentFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tümü ({financeMetrics.deliveredCount})
              </button>

              <button
                onClick={() => setPaymentFilter('cash')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  paymentFilter === 'cash'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Nakit ({financeMetrics.cashCount})</span>
                <span className="text-[10px] opacity-80">· ₺{fmt(financeMetrics.cashTotal)}</span>
              </button>

              <button
                onClick={() => setPaymentFilter('online')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  paymentFilter === 'online'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Online ({financeMetrics.onlineCount})</span>
                <span className="text-[10px] opacity-80">· ₺{fmt(financeMetrics.onlineTotal)}</span>
              </button>

              <button
                onClick={() => setPaymentFilter('card')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  paymentFilter === 'card'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Kapıda Kart ({financeMetrics.cardCount})</span>
                <span className="text-[10px] opacity-80">· ₺{fmt(financeMetrics.cardTotal)}</span>
              </button>
            </div>

            {/* Arama */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Paket, müşteri veya kurye ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Paket Listesi Tablosu */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                    <th className="py-3.5 px-5">Sipariş No & Teslim Süresi</th>
                    <th className="py-3.5 px-5">Müşteri Bilgisi</th>
                    <th className="py-3.5 px-5">Teslim Eden Kurye</th>
                    <th className="py-3.5 px-5">Ödeme Türü</th>
                    <th className="py-3.5 px-5">Sipariş Tutarı</th>
                    <th className="py-3.5 px-5">Firma Kesintisi</th>
                    <th className="py-3.5 px-5">Kasa Mahsuplaşma Etkisi</th>
                    <th className="py-3.5 px-5 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                        <span>Sipariş dökümü yükleniyor...</span>
                      </td>
                    </tr>
                  ) : displayOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span className="font-semibold text-slate-600 block">Kayıtlı teslimat bulunamadı</span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          Seçilen filtre ve tarih aralığında teslim edilmiş sipariş görünmüyor.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    displayOrders.map((order) => {
                      const badge = getPaymentBadge(order.paymentMethod);
                      const BadgeIcon = badge.icon;
                      const isOrderCash = isCash(order.paymentMethod);
                      const backendOrder = backendSummary?.orders?.find((bo) => bo.orderId === order.id);
                      const duration = backendOrder?.deliveryDurationFormatted
                        ? {
                            label: backendOrder.deliveryDurationFormatted,
                            badgeClass:
                              (backendOrder.deliveryDurationMinutes ?? 0) > 45
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : (backendOrder.deliveryDurationMinutes ?? 0) > 30
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          }
                        : getDeliveryDuration(order.createdAt, order.deliveredAt);

                      // Mahsuplaşma etkisi:
                      // Nakit siparişte: Kurye müşteriden parayı aldı, kurye firması bu parayı restorana borçlu,
                      // ancak firma hizmet bedeli düşülür: (TotalOrderAmount - defaultFee)
                      const cashNet = (order.totalOrderAmount || 0) - defaultFee;

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Sipariş No & Teslim Süresi (Dakika) */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-slate-900 text-xs">
                                {order.orderCode ?? `#${order.id.slice(0, 8)}`}
                              </span>
                              {duration && (
                                <span
                                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${duration.badgeClass}`}
                                  title={`Paket sipariş verildikten ${duration.label} sonra kapıya teslim edildi.`}
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  <span>{duration.label}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-600 flex items-center gap-1 mt-1 font-semibold">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Teslim: {fmtDate(order.deliveredAt || order.createdAt)}</span>
                            </div>
                            {order.deliveredAt && order.createdAt && (
                              <div className="text-[9px] text-slate-400 mt-0.5">
                                <span>Saat: </span>
                                <strong className="text-slate-600 font-semibold">{fmtTime(order.createdAt)}</strong>
                                <span> → </span>
                                <strong className="text-slate-600 font-semibold">{fmtTime(order.deliveredAt)}</strong>
                              </div>
                            )}
                          </td>

                          {/* Müşteri */}
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-slate-900">{order.recipientName}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                              {order.deliveryAddressLine || order.deliveryDistrict || 'İskenderun'}
                            </div>
                          </td>

                          {/* Kurye */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center space-x-1.5">
                              <Bike className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span className="font-semibold text-slate-800">
                                {order.courierName || 'Atandı'}
                              </span>
                            </div>
                          </td>

                          {/* Ödeme Türü */}
                          <td className="py-3.5 px-5">
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              <BadgeIcon className="w-3 h-3 shrink-0" />
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          {/* Sipariş Tutarı */}
                          <td className="py-3.5 px-5">
                            <span className="font-black text-slate-900 text-xs">
                              ₺{fmt(order.totalOrderAmount || 0)}
                            </span>
                          </td>

                          {/* Firma Kesintisi */}
                          <td className="py-3.5 px-5">
                            <span className="font-bold text-violet-700 text-xs">
                              -₺{fmt(defaultFee)}
                            </span>
                            <span className="text-[9px] text-slate-400 block">Lojistik payı</span>
                          </td>

                          {/* Kasa Mahsuplaşma Etkisi */}
                          <td className="py-3.5 px-5">
                            {isOrderCash ? (
                              <div>
                                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  cashNet >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  <span>
                                    {cashNet >= 0 ? `+₺${fmt(cashNet)} Alacak` : `-₺${fmt(Math.abs(cashNet))} Borç`}
                                  </span>
                                </span>
                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                  Kuryede: ₺{fmt(order.totalOrderAmount)}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                  <span>-₺{fmt(defaultFee)} Borç</span>
                                </span>
                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                  Ciro restoranda kaldı
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Detay Butonu */}
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors inline-flex items-center space-x-1"
                            >
                              <span>İncele</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. SEKME: Kurye Dağılımı Tablosu ─────────────────────────────── */}
      {activeTab === 'couriers' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-extrabold text-base text-slate-900">
              Kurye Bazında Teslimat ve Nakit Tahsilat Dağılımı
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              İşletmenizin siparişlerini teslim eden saha kuryeleri ve üzerlerindeki nakit tutarları.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <th className="py-3.5 px-5">Kurye</th>
                  <th className="py-3.5 px-5">Telefon & Araç</th>
                  <th className="py-3.5 px-5">Toplam Teslimat</th>
                  <th className="py-3.5 px-5">Nakit Tahsilat</th>
                  <th className="py-3.5 px-5">Online / Kartlı Teslimat</th>
                  <th className="py-3.5 px-5">Son Teslimat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {courierBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <Bike className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span>Bu tarih aralığında sipariş teslim eden kurye bulunamadı.</span>
                    </td>
                  </tr>
                ) : (
                  courierBreakdown.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900 text-sm">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="text-slate-600 font-medium">{c.phone}</div>
                        <div className="text-[10px] text-slate-400">{c.plate}</div>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-slate-800">
                        {c.deliveredCount} Paket
                      </td>
                      <td className="py-3.5 px-5 font-black text-amber-600">
                        ₺{fmt(c.cashCollected)}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-600">
                        {c.onlineCount + c.cardCount} Paket
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 text-[11px]">
                        {fmtDate(c.lastDeliveredAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 3. SEKME: Geçmiş Mahsuplaşma Arşivi ──────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-extrabold text-base text-slate-900">
              Resmi Mahsuplaşma ve Hesap Kapatma Arşivi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kurye firması veya kuryelerle geçmişte yapılan mutabakat kayıtları.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <th className="py-3.5 px-5">Tarih</th>
                  <th className="py-3.5 px-5">Kurye / Firma</th>
                  <th className="py-3.5 px-5">Paket Adedi</th>
                  <th className="py-3.5 px-5">Toplanan Nakit</th>
                  <th className="py-3.5 px-5">Kurye Hakedişi</th>
                  <th className="py-3.5 px-5">Kapatılan Bakiye</th>
                  <th className="py-3.5 px-5">Açıklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {settlementHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span>Henüz kapatılmış bir mahsuplaşma kaydı bulunmuyor.</span>
                    </td>
                  </tr>
                ) : (
                  settlementHistory.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-medium text-slate-600">
                        {fmtDate(s.settledAt)}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        {s.courierFullName}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-700">
                        {s.deliveredPackageCount} Paket
                      </td>
                      <td className="py-3.5 px-5 font-bold text-amber-600">
                        ₺{fmt(s.cashCollectedTotal)}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-blue-600">
                        ₺{fmt(s.courierEarningsTotal)}
                      </td>
                      <td className="py-3.5 px-5 font-black text-slate-900">
                        ₺{fmt(s.settledAmount)}
                      </td>
                      <td className="py-3.5 px-5 text-slate-400 text-[11px]">
                        {s.notes || 'Gün sonu mahsuplaşması'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SİPARİŞ DETAY MODALI ─────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Başlık */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Sipariş Finansal Detayı
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedOrder.orderCode ?? `#${selectedOrder.id.slice(0, 8)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bilgiler Listesi */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Alıcı Müşteri:</span>
                  <span className="font-bold text-slate-800">{selectedOrder.recipientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Alıcı Telefon:</span>
                  <span className="font-bold text-teal-700">{selectedOrder.recipientPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Teslimat Adresi:</span>
                  <span className="font-medium text-slate-700 text-right max-w-xs truncate">
                    {selectedOrder.deliveryAddressLine || selectedOrder.deliveryDistrict || 'İskenderun'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Teslim Eden Kurye:</span>
                  <span className="font-bold text-slate-900">{selectedOrder.courierName || 'Kurye'}</span>
                </div>
                {selectedOrder.notes && (
                  <div className="flex justify-between pt-1 border-t border-slate-200/50">
                    <span className="text-slate-400 font-medium">Sipariş Notu:</span>
                    <span className="font-semibold text-amber-700">{selectedOrder.notes}</span>
                  </div>
                )}
              </div>

              {/* Teslimat Süresi (Dakika) ve Zaman Çizelgesi */}
              {(() => {
                const modalDuration = getDeliveryDuration(selectedOrder.createdAt, selectedOrder.deliveredAt);
                return (
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/90 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Timer className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Teslim Edilme Süresi</span>
                      </span>
                      {modalDuration ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${modalDuration.badgeClass}`}>
                          <Zap className="w-3.5 h-3.5" />
                          <span>{modalDuration.label}'da Teslim Edildi</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Hesaplanamadı</span>
                      )}
                    </div>

                    {/* Zaman Detayı */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-400 block font-medium">Sipariş Oluşturulma:</span>
                        <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{fmtDate(selectedOrder.createdAt)}</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-400 block font-medium">Kapıda Teslim Edilme:</span>
                        <div className="text-xs font-extrabold text-emerald-700 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{fmtDate(selectedOrder.deliveredAt || selectedOrder.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Finansal Döküm Kartı */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Mahsuplaşma Dökümü
                </h4>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-600">Ödeme Yöntemi:</span>
                  <span className="font-bold text-slate-900">
                    {getPaymentBadge(selectedOrder.paymentMethod).label}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Müşteriden Alınan Tutar:</span>
                  <span className="font-black text-sm text-slate-900">
                    ₺{fmt(selectedOrder.totalOrderAmount || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Kurye Firması Hizmet Bedeli:</span>
                  <span className="font-bold text-rose-700">-₺{fmt(defaultFee)}</span>
                </div>

                <div className="pt-2 border-t border-amber-200 flex justify-between items-center font-black text-sm">
                  <span className="text-amber-900">Net Hesaplaşma:</span>
                  <span className={
                    isCash(selectedOrder.paymentMethod)
                      ? (selectedOrder.totalOrderAmount - defaultFee) >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                      : 'text-rose-700'
                  }>
                    {isCash(selectedOrder.paymentMethod) ? (
                      (selectedOrder.totalOrderAmount - defaultFee) >= 0
                        ? `+₺${fmt(selectedOrder.totalOrderAmount - defaultFee)} (Firma Restorana Verecek)`
                        : `-₺${fmt(Math.abs(selectedOrder.totalOrderAmount - defaultFee))} (Restoran Firmaya Verecek)`
                    ) : (
                      `-₺${fmt(defaultFee)} (Restoran Firmaya Verecek)`
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Kapat Butonu */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
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
