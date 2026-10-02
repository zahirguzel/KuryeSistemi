// src/pages/OrderKanban.tsx
//
// Canlı Sipariş Akış Tablosu (Kanban & Real-time SignalR Entegrasyonu)

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Clock,
  Bike,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Banknote,
  CreditCard,
  Globe,
  Search,
  Phone,
  RefreshCw,
  XCircle,
  Loader2,
  FileText,
  X,
  Check,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { courierService } from '../services/courierService';
import { onOrderUpdate, startSignalR } from '../services/signalRService';
import { useNotificationStore } from '../stores/notificationStore';
import type { Order, OrderStatus, PaymentMethod } from '../types';
import type { CourierState } from '../types/courier';

type OrderTabType = 'all' | 'pending' | 'delivering' | 'delivered' | 'cancelled';

export const OrderKanban: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OrderTabType>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // ── 1. Backend'den Günün Siparişlerini Çek ──────────────────────────────────
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await orderService.getTodayOrders();
      if (res.isSuccess && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('[OrderKanban] Sipariş yükleme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── 2. Sayfa Açılışında Yükle & SignalR Gerçek Zamanlı Dinle ─────────────────
  useEffect(() => {
    loadOrders();

    // SignalR bağlantısını başlat ve yeni sipariş/durum değişikliklerini dinle
    startSignalR();
    const unsubscribe = onOrderUpdate((payload) => {
      console.info('[OrderKanban] Canlı sipariş güncellemesi yakalandı:', payload);
      // Sunucudan güncel durumu anında tazele
      loadOrders();
    });

    return () => {
      unsubscribe();
    };
  }, [loadOrders]);

  // ── 3. Siparişi İptal Et ────────────────────────────────────────────────────
  const handleCancelOrder = async (orderId: string, recipientName: string) => {
    if (
      !window.confirm(
        `#${recipientName} adına açılmış bu siparişi iptal etmek istediğinize emin misiniz?`
      )
    ) {
      return;
    }

    setCancellingOrderId(orderId);
    try {
      const res = await orderService.updateStatus(orderId, 'Cancelled');
      if (res.isSuccess) {
        await loadOrders();
      } else {
        alert(res.message || 'Sipariş iptal edilemedi.');
      }
    } catch {
      alert('Sipariş iptal edilirken sunucu hatası oluştu.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setActionLoadingId(orderId);
    try {
      const res = await orderService.updateStatus(orderId, newStatus);
      if (res.isSuccess) {
        await loadOrders();
      } else {
        alert(res.message || 'Durum güncellenemedi.');
      }
    } catch {
      alert('İşlem sırasında sunucu hatası oluştu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Kurye Atama Modalı State'leri ──────────────────────────────────────────
  const [assignModalOrder, setAssignModalOrder] = useState<Order | null>(null);
  const [couriersList, setCouriersList] = useState<CourierState[]>([]);
  const [isLoadingCouriers, setIsLoadingCouriers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [courierSearchTerm, setCourierSearchTerm] = useState('');

  const handleOpenAssignModal = async (order: Order) => {
    setAssignModalOrder(order);
    setCourierSearchTerm('');
    setIsLoadingCouriers(true);
    try {
      const res = await courierService.getAllCouriers();
      if (res.isSuccess && res.data) {
        setCouriersList(res.data);
      }
    } catch (err) {
      console.error('[OrderKanban] Kuryeler yüklenemedi:', err);
    } finally {
      setIsLoadingCouriers(false);
    }
  };

  const handleAssignCourier = async (orderId: string, courierId: string, courierName: string) => {
    setIsAssigning(true);
    try {
      const res = await orderService.assignCourier(orderId, courierId);
      if (res.isSuccess) {
        useNotificationStore.getState().addNotification({
          type: 'assigned',
          title: '🛵 Kurye Görevlendirildi',
          message: `Sipariş ${courierName} adlı kuryeye başarıyla atandı.`,
        });
        setAssignModalOrder(null);
        await loadOrders();
      } else {
        alert(res.message || 'Kurye ataması başarısız oldu.');
      }
    } catch {
      alert('Kurye atanırken sunucu hatası meydana geldi.');
    } finally {
      setIsAssigning(false);
    }
  };

  // ── 4. Durum Normalizasyonu & Filtreleme ─────────────────────────────────────
  const isOrderPending = (status: OrderStatus) => {
    const s = String(status).toLowerCase();
    return s === 'pending' || s === '0' || s === 'created';
  };

  const isOrderPreparing = (status: OrderStatus) => {
    const s = String(status).toLowerCase();
    return s === 'preparing' || s === '1';
  };

  const isOrderReady = (status: OrderStatus) => {
    const s = String(status).toLowerCase();
    return s === 'ready' || s === '2';
  };

  const isOrderAssigned = (status: OrderStatus) => {
    const s = String(status).toLowerCase();
    return s === 'assigned' || s === '3';
  };

  const isOrderPickedUp = (status: OrderStatus) => {
    const s = String(status).toLowerCase();
    return s === 'pickedup' || s === 'picked_up' || s === '4';
  };

  const isOrderDelivering = (status: OrderStatus) =>
    isOrderAssigned(status) || isOrderPickedUp(status);

  const isOrderDelivered = (status: OrderStatus) => {
    const s = String(status).toLowerCase();
    return s === 'delivered' || s === '5';
  };

  const isOrderCancelled = (status: OrderStatus) => {
    const s = String(status).toLowerCase();
    return s === 'cancelled' || s === 'canceled' || s === '6';
  };

  // Mutfak / Hazırlık: Onay bekleyen, hazırlanan veya paket hazır olanlar
  const kitchenOrders = orders.filter((o) => isOrderPending(o.status) || isOrderPreparing(o.status) || isOrderReady(o.status));
  const deliveringOrders = orders.filter((o) => isOrderDelivering(o.status));
  const deliveredOrders = orders.filter((o) => isOrderDelivered(o.status));
  const cancelledOrders = orders.filter((o) => isOrderCancelled(o.status));

  const getFilteredList = () => {
    let list = orders;
    if (activeTab === 'pending') {
      list = kitchenOrders;
    } else if (activeTab === 'delivering') {
      list = deliveringOrders;
    } else if (activeTab === 'delivered') {
      list = deliveredOrders;
    } else if (activeTab === 'cancelled') {
      list = cancelledOrders;
    }

    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase();
    return list.filter((o) => {
      const nameMatch = o.recipientName?.toLowerCase().includes(term);
      const phoneMatch = o.recipientPhone?.includes(term);
      const idMatch = o.id?.toLowerCase().includes(term);
      const codeMatch = o.orderCode?.toLowerCase().includes(term);
      const addrMatch = (o.deliveryAddressLine || o.deliveryAddress || '')
        .toLowerCase()
        .includes(term);

      return nameMatch || phoneMatch || idMatch || codeMatch || addrMatch;
    });
  };

  const currentList = getFilteredList();

  // ── 5. Tarih & Saat Formatlama ──────────────────────────────────────────────
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Az önce';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // ── 6. Ödeme Rozeti ─────────────────────────────────────────────────────────
  const renderPaymentBadge = (method: PaymentMethod, amount: number) => {
    const isCash = method === 'Cash' || method === 1;
    const isCard = method === 'CreditCardOnDelivery' || method === 2;

    if (isCash) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Banknote className="w-3.5 h-3.5" />
          <span>Kapıda Nakit: ₺{(amount || 0).toFixed(2)}</span>
        </span>
      );
    }
    if (isCard) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <CreditCard className="w-3.5 h-3.5" />
          <span>Kapıda Kart: ₺{(amount || 0).toFixed(2)}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Globe className="w-3.5 h-3.5" />
        <span>Online Ödendi (₺{(amount || 0).toFixed(2)})</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Üst Başlık & Arama / Yenile ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Canlı Sipariş Akış Tablosu (Kanban)
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Havuza düşen, kurye tarafından dağıtılan ve teslim edilen siparişlerin canlı durumu.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Arama Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Müşteri, telefon veya adres ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none w-64 shadow-2xs"
            />
          </div>

          <button
            onClick={loadOrders}
            disabled={isLoading}
            className="p-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-2xs active:scale-95 transition-all disabled:opacity-50"
            title="Siparişleri Yenile"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 4 Büyük Seçenek (Sekmeler / Tabs) ─────────────────────────────── */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* 1. Mutfak / Hazırlık */}
          <button
            onClick={() => setActiveTab('pending')}
            className={`p-3.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2.5 transition-all touch-manipulation active:scale-98 min-h-[52px] ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-500/20'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100/80 border border-slate-200/80'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Mutfak & Hazırlık</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'pending'
                  ? 'bg-white text-amber-600'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {kitchenOrders.length}
            </span>
          </button>

          {/* 2. Kuryede / Yolda */}
          <button
            onClick={() => setActiveTab('delivering')}
            className={`p-3.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2.5 transition-all touch-manipulation active:scale-98 min-h-[52px] ${
              activeTab === 'delivering'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-600/20'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100/80 border border-slate-200/80'
            }`}
          >
            <Bike className="w-4 h-4 shrink-0" />
            <span>Kuryede / Yolda</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'delivering'
                  ? 'bg-white text-blue-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {deliveringOrders.length}
            </span>
          </button>

          {/* 3. Teslim Edildi */}
          <button
            onClick={() => setActiveTab('delivered')}
            className={`p-3.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2.5 transition-all touch-manipulation active:scale-98 min-h-[52px] ${
              activeTab === 'delivered'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-600/20'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100/80 border border-slate-200/80'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Teslim Edildi</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'delivered'
                  ? 'bg-white text-emerald-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {deliveredOrders.length}
            </span>
          </button>

          {/* 4. Tüm Siparişler */}
          <button
            onClick={() => setActiveTab('all')}
            className={`p-3.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2.5 transition-all touch-manipulation active:scale-98 min-h-[52px] ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25 ring-2 ring-slate-900/20'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100/80 border border-slate-200/80'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Tüm Siparişler</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {orders.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Sipariş Kartları Grid'i ───────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3" />
          <h3 className="font-extrabold text-base text-slate-800">Siparişler Yükleniyor...</h3>
          <p className="text-xs text-slate-500 mt-1">Günün aktif siparişleri backend'den getiriliyor.</p>
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-base text-slate-800">Sipariş Bulunamadı</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'Arama kriterlerinize uygun sipariş bulunamadı.'
              : 'Seçtiğiniz aşamada şu anda kayıtlı sipariş bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentList.map((order) => {
            const isPending = isOrderPending(order.status);
            const isPreparing = isOrderPreparing(order.status);
            const isReady = isOrderReady(order.status);
            const isAssigned = isOrderAssigned(order.status);
            const isPickedUp = isOrderPickedUp(order.status);
            const isDelivering = isOrderDelivering(order.status);
            const isDelivered = isOrderDelivered(order.status);
            const isCancelled = isOrderCancelled(order.status);
            const isCancelling = cancellingOrderId === order.id;
            const isActionLoading = actionLoadingId === order.id;

            const orderShortCode =
              order.orderCode || `#KS-${order.id.substring(0, 4).toUpperCase()}`;
            const address =
              order.deliveryAddressLine || order.deliveryAddress || 'Teslimat adresi belirtilmemiş';
            const district = order.deliveryDistrict ? `, ${order.deliveryDistrict}` : '';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Üst Satır: Kod, Durum ve Saat */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-black text-base text-slate-900 tracking-tight">
                      {orderShortCode}
                    </span>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(order.createdAt)}</span>
                      </span>

                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          Onay Bekliyor
                        </span>
                      )}
                      {isPreparing && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          🧑‍🍳 Hazırlanıyor
                        </span>
                      )}
                      {isReady && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-cyan-50 text-cyan-700 border border-cyan-200">
                          📦 Paket Hazır
                        </span>
                      )}
                      {isAssigned && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                          🛵 Kurye Atandı
                        </span>
                      )}
                      {isPickedUp && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                          🚀 Yolda
                        </span>
                      )}
                      {isDelivered && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✅ Teslim Edildi
                        </span>
                      )}
                      {isCancelled && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                          ❌ İptal Edildi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Müşteri & İletişim */}
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-base text-slate-900">
                        {order.recipientName}
                      </h4>
                      <a
                        href={`tel:${order.recipientPhone}`}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-amber-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{order.recipientPhone}</span>
                      </a>
                    </div>

                    <div className="flex items-start space-x-2 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-medium leading-relaxed">
                        {address}
                        {district}
                      </span>
                    </div>

                    {order.notes && (
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                        <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate italic">"{order.notes}"</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alt Kısım: Restoran Aksiyonları, Ödeme ve Kurye */}
                <div className="space-y-3 pt-2">
                  {/* Restoran Mutfak Aksiyon Butonları */}
                  {isPending && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                      disabled={isActionLoading}
                      className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 active:scale-98 text-white shadow-xs flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
                    >
                      {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>🧑‍🍳</span>}
                      <span>Siparişi Onayla (Hazırlanıyor)</span>
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'Ready')}
                      disabled={isActionLoading}
                      className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 active:scale-98 text-white shadow-xs flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
                    >
                      {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>📦</span>}
                      <span>Paket Hazır (Kurye Çağır)</span>
                    </button>
                  )}

                  {isReady && !order.courierName && (
                    <div className="space-y-2">
                      <div className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 text-center flex items-center justify-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <span>Paket Hazır • Kurye Bekleniyor</span>
                      </div>
                      <button
                        onClick={() => handleOpenAssignModal(order)}
                        className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-xs flex items-center justify-center space-x-1.5 transition-all"
                      >
                        <Bike className="w-3.5 h-3.5" />
                        <span>🛵 Kuryeyi Hemen Görevlendir</span>
                      </button>
                    </div>
                  )}

                  {isAssigned && (
                    <div className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 text-center flex items-center justify-center space-x-1.5">
                      <span>🛵</span>
                      <span>Kurye Paketi Almaya Geliyor: {order.courierName || 'Atandı'}</span>
                    </div>
                  )}

                  {isPickedUp && (
                    <div className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 text-center flex items-center justify-center space-x-1.5">
                      <span>🚀</span>
                      <span>Paket Yolda • Müşteriye Teslim Ediliyor</span>
                    </div>
                  )}

                  {/* Ödeme Rozeti */}
                  <div>{renderPaymentBadge(order.paymentMethod, order.totalOrderAmount)}</div>

                  {/* Kurye Durumu & İptal Butonu */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          order.courierName
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Bike className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-700 truncate max-w-[140px]">
                        {order.courierName
                          ? `Kurye: ${order.courierName}`
                          : isDelivering
                          ? 'Kurye Atandı'
                          : 'Kurye Bekleniyor'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!isDelivered && !isCancelled && (
                        <>
                          <button
                            onClick={() => handleOpenAssignModal(order)}
                            className="px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-all active:scale-95 inline-flex items-center space-x-1"
                            title="Kurye Ata veya Değiştir"
                          >
                            <Bike className="w-3 h-3" />
                            <span>{order.courierName ? 'Değiştir' : 'Ata'}</span>
                          </button>

                          <button
                            onClick={() => handleCancelOrder(order.id, order.recipientName)}
                            disabled={isCancelling}
                            className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-all disabled:opacity-50 inline-flex items-center space-x-1"
                          >
                            {isCancelling ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            <span>İptal</span>
                          </button>
                        </>
                      )}

                      <span className="text-xs font-black text-slate-900">
                        ₺{(order.totalOrderAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Kurye Atama Modalı (Popup) ────────────────────────────────────── */}
      {assignModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Üst Başlık */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">
                    Siparişe Kurye Ata
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {assignModalOrder.orderCode || `#KS-${assignModalOrder.id.substring(0, 4).toUpperCase()}`} • {assignModalOrder.recipientName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalOrder(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Teslimat Adresi Özeti */}
            <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-100 flex items-start space-x-2 text-xs text-amber-900">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">
                {assignModalOrder.deliveryAddressLine || assignModalOrder.deliveryAddress}
                {assignModalOrder.deliveryDistrict ? `, ${assignModalOrder.deliveryDistrict}` : ''}
              </span>
            </div>

            {/* Kurye Arama */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Kurye adı, telefon veya plaka ara..."
                  value={courierSearchTerm}
                  onChange={(e) => setCourierSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Kurye Listesi */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {isLoadingCouriers ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-xs font-bold text-slate-600">Kuryeler listeleniyor...</p>
                </div>
              ) : couriersList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Bike className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold text-slate-600">Sistemde kurye bulunamadı</p>
                </div>
              ) : (
                couriersList
                  .filter((c) => {
                    if (!courierSearchTerm.trim()) return true;
                    const q = courierSearchTerm.toLowerCase();
                    return (
                      c.firstName.toLowerCase().includes(q) ||
                      c.lastName.toLowerCase().includes(q) ||
                      c.phoneNumber.includes(q) ||
                      c.licensePlate.toLowerCase().includes(q)
                    );
                  })
                  .map((courier) => {
                    const isOnline = courier.isOnline;
                    const isAvailable = courier.isAvailable;
                    const isCurrent = assignModalOrder.courierName?.includes(courier.firstName);

                    return (
                      <div
                        key={courier.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                          isCurrent
                            ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 ${
                              !isOnline ? 'bg-slate-400' : isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          >
                            {courier.firstName.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-extrabold text-sm text-slate-900 truncate">
                                {courier.firstName} {courier.lastName}
                              </h4>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white">
                                  Atanmış
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                              <span>{courier.phoneNumber}</span>
                              <span>•</span>
                              <span className="font-mono">{courier.licensePlate || courier.vehicleType}</span>
                            </div>

                            <div className="flex items-center space-x-2 mt-1">
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  isOnline
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}
                                />
                                <span>{isOnline ? 'Mesaide' : 'Çevrimdışı'}</span>
                              </span>

                              {isOnline && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isAvailable
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {isAvailable ? 'Boşta' : 'Meşgul'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            handleAssignCourier(
                              assignModalOrder.id,
                              courier.id,
                              `${courier.firstName} ${courier.lastName}`
                            )
                          }
                          disabled={isAssigning || !isOnline}
                          className="shrink-0 ml-3 px-3 py-1.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 text-white shadow-xs transition-all flex items-center space-x-1"
                        >
                          {isAssigning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Görevi Ver</span>
                        </button>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Alt Kısım */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>Seçilen kuryeye anlık push bildirimi ve görev iletilir.</span>
              <button
                onClick={() => setAssignModalOrder(null)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
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
