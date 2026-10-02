import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  TrendingUp, RefreshCw, Search, Wallet,
  CheckCircle2, Calendar, Package,
  Banknote, RotateCcw, Download, Users, Store,
  ArrowUpRight, ArrowDownRight, AlertCircle, ShieldCheck,
  FileText, X, Clock, ArrowRightLeft, Printer, FileSpreadsheet,
  Receipt, UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { financeService } from '../../services/financeService';
import { orderService } from '../../services/orderService';
import type { ServiceResult } from '../../types/auth';
import {
  type CashSettlement,
  type Courier,
  type Merchant,
  type Order,
  type MerchantFinanceSummary,
  DispatchMode,
  ReconciliationPeriod
} from '../../types';
import { useNotificationStore } from '../../stores/notificationStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getReconciliationPeriodLabel(period?: ReconciliationPeriod): string {
  switch (period) {
    case ReconciliationPeriod.Daily:
      return 'Günlük';
    case ReconciliationPeriod.Weekly:
      return 'Haftalık';
    case ReconciliationPeriod.Monthly:
      return 'Aylık';
    default:
      return 'Günlük';
  }
}

function getDispatchModeLabel(mode?: DispatchMode): string {
  switch (mode) {
    case DispatchMode.Pool:
      return '📡 Havuz';
    case DispatchMode.Manual:
      return '🎯 Manuel';
    case DispatchMode.SmartAuto:
      return '🤖 Akıllı GPS';
    default:
      return '📡 Havuz';
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const FirmFinance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'merchants' | 'couriers' | 'settlements'>('merchants');
  const [settlements, setSettlements] = useState<CashSettlement[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [settlementCourierFilter, setSettlementCourierFilter] = useState<string>('all');

  // Modal State: Courier Kasa Mahsuplaşma (Kasayı Kapat)
  const [reconcileModalCourier, setReconcileModalCourier] = useState<Courier | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  // Modal State: Kurye Canlı Sipariş & Kasa Ekstresi
  const [selectedCourierForDetail, setSelectedCourierForDetail] = useState<Courier | null>(null);

  // Modal State: Restoran Cari Ekstre & Mahsuplaşma Masası
  const [selectedMerchantForRecon, setSelectedMerchantForRecon] = useState<Merchant | null>(null);
  const [merchantSummary, setMerchantSummary] = useState<MerchantFinanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [reconDateFilter, setReconDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [activeDetailTab, setActiveDetailTab] = useState<'orders' | 'couriers'>('orders');
  const [isSettlingMerchant, setIsSettlingMerchant] = useState(false);

  const addNotification = useNotificationStore((state) => state.addNotification);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settlementsRes, couriersRes, merchantsRes, ordersRes] = await Promise.all([
        api.get<ServiceResult<CashSettlement[]>>('/reconciliation/settlements'),
        api.get<ServiceResult<Courier[]>>('/couriers'),
        api.get<ServiceResult<Merchant[]>>('/merchants'),
        orderService.getAllOrders(),
      ]);

      if (settlementsRes.data.isSuccess && settlementsRes.data.data) {
        setSettlements(settlementsRes.data.data);
      }
      if (couriersRes.data.isSuccess && couriersRes.data.data) {
        setCouriers(couriersRes.data.data);
      }
      if (merchantsRes.data.isSuccess && merchantsRes.data.data) {
        setMerchants(merchantsRes.data.data);
      }
      if (ordersRes.isSuccess && ordersRes.data) {
        setOrders(ordersRes.data);
      }
    } catch (err) {
      console.error('Finans verileri yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load detailed summary for chosen merchant
  const loadMerchantSummary = useCallback(async (merchantId: string, filter: 'all' | 'today' | 'week' | 'month') => {
    setSummaryLoading(true);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;
      const now = new Date();

      if (filter === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        startDate = start.toISOString();
        endDate = now.toISOString();
      } else if (filter === 'week') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = start.toISOString();
        endDate = now.toISOString();
      } else if (filter === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        startDate = start.toISOString();
        endDate = now.toISOString();
      }

      const res = await financeService.getMerchantFinanceSummary({
        merchantId,
        startDate,
        endDate,
      });

      if (res.isSuccess && res.data) {
        setMerchantSummary(res.data);
      } else {
        // Fallback: local aggregation from orders
        const m = merchants.find(item => item.id === merchantId);
        const mOrders = orders.filter(o => o.merchantId === merchantId && (o.status === 'Delivered' || o.status === 3 || o.status === 4));
        const fee = m?.defaultPackageFee || 0;
        const totalCash = mOrders.filter(o => o.paymentMethod === 'Cash' || o.paymentMethod === 1).reduce((s, o) => s + (o.totalOrderAmount || 0), 0);
        const totalDelivered = mOrders.length;
        const totalFee = totalDelivered * fee;
        const net = totalCash - totalFee;

        setMerchantSummary({
          merchantId,
          merchantName: m?.name || 'İşletme',
          defaultPackageFee: fee,
          totalDeliveredCount: totalDelivered,
          totalCashAmount: totalCash,
          totalOnlineAmount: 0,
          totalCardAmount: 0,
          totalDirectRevenue: 0,
          totalFirmDeliveryFee: totalFee,
          netSettlementBalance: net,
          settlementDirection: net > 0 ? 'CourierFirmOwesMerchant' : net < 0 ? 'MerchantOwesCourierFirm' : 'Balanced',
          averageDeliveryDurationMinutes: 24,
          couriers: [],
          orders: mOrders.map(o => ({
            orderId: o.id,
            orderCode: o.orderCode || o.id.slice(0, 8),
            customerName: o.recipientName,
            customerPhoneNumber: o.recipientPhone,
            deliveryAddress: o.deliveryAddress || o.deliveryAddressLine || '',
            paymentMethod: typeof o.paymentMethod === 'number' ? (o.paymentMethod === 1 ? 'Cash' : 'Online') : String(o.paymentMethod),
            totalOrderAmount: o.totalOrderAmount || 0,
            packageFee: fee,
            netCashEffect: (o.paymentMethod === 'Cash' || o.paymentMethod === 1 ? (o.totalOrderAmount || 0) : 0) - fee,
            courierId: o.courierId,
            courierName: o.courierName,
            createdAt: o.createdAt,
            deliveredAt: o.deliveredAt,
          })),
        });
      }
    } catch (err) {
      console.error('Restoran ekstre özeti çekilemedi:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [merchants, orders]);

  useEffect(() => {
    if (selectedMerchantForRecon) {
      loadMerchantSummary(selectedMerchantForRecon.id, reconDateFilter);
    } else {
      setMerchantSummary(null);
    }
  }, [selectedMerchantForRecon, reconDateFilter, loadMerchantSummary]);

  // Canlı Restoran İstatistik Haritası (Master Tablo için anlık hesap)
  const merchantStatsMap = useMemo(() => {
    const map = new Map<string, {
      deliveredCount: number;
      cashCollected: number;
      firmDeliveryFee: number;
      netBalance: number;
      direction: 'CourierFirmOwesMerchant' | 'MerchantOwesCourierFirm' | 'Balanced';
    }>();

    for (const m of merchants) {
      const mOrders = orders.filter(
        o => o.merchantId === m.id && (o.status === 'Delivered' || o.status === 3 || o.status === 4)
      );
      const deliveredCount = mOrders.length;
      const cashCollected = mOrders
        .filter(o => o.paymentMethod === 'Cash' || o.paymentMethod === 1)
        .reduce((sum, o) => sum + (o.totalOrderAmount || 0), 0);
      const fee = m.defaultPackageFee || 0;
      const firmDeliveryFee = deliveredCount * fee;
      const netBalance = cashCollected - firmDeliveryFee;

      let direction: 'CourierFirmOwesMerchant' | 'MerchantOwesCourierFirm' | 'Balanced' = 'Balanced';
      if (netBalance > 0) direction = 'CourierFirmOwesMerchant';
      else if (netBalance < 0) direction = 'MerchantOwesCourierFirm';

      map.set(m.id, {
        deliveredCount,
        cashCollected,
        firmDeliveryFee,
        netBalance,
        direction,
      });
    }

    return map;
  }, [merchants, orders]);

  // Canlı Kurye İstatistik Haritası
  const courierStatsMap = useMemo(() => {
    const map = new Map<string, {
      deliveredCount: number;
      cashCollected: number;
      earningsTotal: number;
      deliveredOrders: Order[];
    }>();

    for (const c of couriers) {
      const cOrders = orders.filter(
        o => o.courierId === c.id && (o.status === 'Delivered' || o.status === 3 || o.status === 4)
      );
      const deliveredCount = cOrders.length;
      const cashCollected = cOrders
        .filter(o => o.paymentMethod === 'Cash' || o.paymentMethod === 1)
        .reduce((sum, o) => sum + (o.totalOrderAmount || 0), 0);
      const earningsTotal = cOrders.reduce((sum, o) => sum + (o.courierEarning || 0), 0);

      map.set(c.id, {
        deliveredCount,
        cashCollected,
        earningsTotal,
        deliveredOrders: cOrders,
      });
    }

    return map;
  }, [couriers, orders]);

  // Canlı Kurye Kasaları Toplamları
  const totalFieldCash = useMemo(() => {
    return Array.from(courierStatsMap.values()).reduce((sum, stat) => sum + stat.cashCollected, 0);
  }, [courierStatsMap]);

  const totalCourierEarnings = useMemo(() => {
    return Array.from(courierStatsMap.values()).reduce((sum, stat) => sum + stat.earningsTotal, 0);
  }, [courierStatsMap]);

  const couriersWithDebtCount = useMemo(() => {
    return couriers.filter(c => (c.currentBalance || 0) < 0).length;
  }, [couriers]);

  const couriersWithCreditCount = useMemo(() => {
    return couriers.filter(c => (c.currentBalance || 0) > 0).length;
  }, [couriers]);

  // Filtreleme: Mahsuplaşma Geçmişi
  const filteredSettlements = settlements.filter(s => {
    if (settlementCourierFilter !== 'all' && s.courierId !== settlementCourierFilter) {
      return false;
    }

    const q = search.toLowerCase();
    const matchesSearch = !q ||
      s.courierFullName.toLowerCase().includes(q) ||
      (s.notes ?? '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (dateFilter === 'all') return true;
    const itemDate = new Date(s.settledAt);
    const now = new Date();

    if (dateFilter === 'today') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    }
    if (dateFilter === 'month') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const filteredCouriers = couriers.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.phoneNumber.includes(q);
  });

  const filteredMerchants = merchants.filter(m => {
    const q = search.toLowerCase();
    return !q ||
      m.name.toLowerCase().includes(q) ||
      (m.phoneNumber ?? '').includes(q) ||
      (m.address ?? '').toLowerCase().includes(q);
  });

  // Özet istatistikler (Settlements)
  const totalSettled = settlements.reduce((s, r) => s + Math.abs(r.settledAmount), 0);
  const totalCash = settlements.reduce((s, r) => s + r.cashCollectedTotal, 0);
  const totalEarnings = settlements.reduce((s, r) => s + r.courierEarningsTotal, 0);
  const totalPackages = settlements.reduce((s, r) => s + r.deliveredPackageCount, 0);

  // Kurye Kasasını Kapatma (Reconcile)
  const handleReconcileCourier = async () => {
    if (!reconcileModalCourier) return;
    setIsReconciling(true);
    try {
      const res = await api.post<ServiceResult<{ message: string }>>(`/reconciliation/couriers/${reconcileModalCourier.id}`);
      if (res.data.isSuccess) {
        addNotification({
          type: 'delivered',
          title: '✅ Kasa Mahsuplaşması Tamamlandı',
          message: `${reconcileModalCourier.firstName} ${reconcileModalCourier.lastName} kuryesinin kasası sıfırlandı ve mahsuplaşma makbuzu oluşturuldu.`,
        });
        setReconcileModalCourier(null);
        await loadData();
      }
    } catch (err) {
      console.error('Kasa kapatma hatası:', err);
      addNotification({
        type: 'warning',
        title: 'Mahsuplaşma Hatası',
        message: 'Kasa sıfırlanırken bir sorun oluştu.',
      });
    } finally {
      setIsReconciling(false);
    }
  };

  // Restoran ile Mutabakat Onaylama
  const handleConfirmMerchantSettlement = async () => {
    if (!selectedMerchantForRecon || !merchantSummary) return;
    setIsSettlingMerchant(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      addNotification({
        type: 'delivered',
        title: '✅ Cari Mutabakat Onaylandı',
        message: `${selectedMerchantForRecon.name} ile dönem mutabakatı sağlandı ve kapatıldı.`,
      });
      setSelectedMerchantForRecon(null);
      await loadData();
    } catch (err) {
      console.error('Mutabakat onay hatası:', err);
      addNotification({
        type: 'warning',
        title: 'İşlem Başarısız',
        message: 'Mutabakat kaydedilirken bir hata oluştu.',
      });
    } finally {
      setIsSettlingMerchant(false);
    }
  };

  // ─── Kasa Kapatma Makbuzu (PDF / Yazdır) ──────────────────────────────────
  const handlePrintSettlementReceipt = (s: CashSettlement) => {
    const printWindow = window.open('', '_blank', 'width=850,height=800');
    if (!printWindow) {
      alert('Lütfen tarayıcınızın açılır pencerelerine (pop-up) izin veriniz.');
      return;
    }

    const receiptNo = `MAK-${s.id.slice(0, 8).toUpperCase()}`;
    const dateFormatted = fmtDate(s.settledAt);
    const amountAbs = Math.abs(s.settledAmount);
    const isCashIn = s.settledAmount <= 0; // Kurye şirkete nakit teslim etti

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <title>Kasa Mahsuplaşma Makbuzu - ${receiptNo}</title>
        <style>
          @page { size: A5 landscape; margin: 10mm 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            font-size: 9.5pt;
            margin: 0;
            padding: 15px;
          }
          .receipt-box {
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 16px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .header h1 {
            font-size: 14pt;
            margin: 0;
            font-weight: 900;
          }
          .header p {
            font-size: 8pt;
            color: #64748b;
            margin: 2px 0 0 0;
          }
          .meta {
            text-align: right;
            font-size: 8.5pt;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            background: #f8fafc;
          }
          .card-title {
            font-size: 7.5pt;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .card-val {
            font-size: 10.5pt;
            font-weight: 800;
            margin-top: 2px;
          }
          .calc-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 9pt;
          }
          .calc-table th, .calc-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
          }
          .calc-table th {
            background: #f1f5f9;
            font-weight: 700;
            text-align: left;
          }
          .total-box {
            background: ${isCashIn ? '#f0fdf4' : '#eff6ff'};
            border: 2px solid ${isCashIn ? '#22c55e' : '#3b82f6'};
            border-radius: 6px;
            padding: 10px;
            text-align: center;
            margin-bottom: 14px;
          }
          .total-title {
            font-size: 8.5pt;
            font-weight: 800;
            color: ${isCashIn ? '#166534' : '#1e40af'};
            text-transform: uppercase;
          }
          .total-amount {
            font-size: 18pt;
            font-weight: 900;
            color: ${isCashIn ? '#15803d' : '#1d4ed8'};
            margin: 2px 0;
          }
          .signs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
          }
          .sign-box {
            border: 1px dashed #94a3b8;
            border-radius: 6px;
            padding: 10px;
            height: 75px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .sign-title {
            font-size: 8pt;
            font-weight: 800;
          }
          .sign-sub {
            font-size: 7.5pt;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 2px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <div>
              <h1>KASA MAHSUPLAŞMA VE TAHSİLAT MAKBUZU</h1>
              <p>Filo Kurye Dağıtım ve Kasa Yönetim Sistemi</p>
            </div>
            <div class="meta">
              <div><strong>Makbuz No:</strong> ${receiptNo}</div>
              <div><strong>Tarih:</strong> ${dateFormatted}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Kurye Bilgileri</div>
              <div class="card-val">${s.courierFullName}</div>
              <div style="font-size:8pt;color:#64748b;">${s.courierPhoneNumber}</div>
            </div>
            <div class="card">
              <div class="card-title">İşlem Özeti</div>
              <div class="card-val">${s.deliveredPackageCount} Paket Teslimatı</div>
              <div style="font-size:8pt;color:#64748b;">${s.notes || 'Kasa Sıfırlama & Mahsuplaşma'}</div>
            </div>
          </div>

          <table class="calc-table">
            <thead>
              <tr>
                <th>Açıklama</th>
                <th style="text-align:right;">Tutar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Kapıda Kurye Tarafından Toplanan Nakit</td>
                <td style="text-align:right;font-weight:700;">₺${fmt(s.cashCollectedTotal)}</td>
              </tr>
              <tr>
                <td>Kuryenin Hak Ettiği Paket Başı Kazanç (Hakediş)</td>
                <td style="text-align:right;font-weight:700;color:#16a34a;">- ₺${fmt(s.courierEarningsTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-title">${isCashIn ? 'KURYEDEN ŞİRKET KASASINA ALINAN NAKİT' : 'ŞİRKETTEN KURYEYE ÖDENEN HAKEDİŞ'}</div>
            <div class="total-amount">₺${fmt(amountAbs)}</div>
            <div style="font-size:8pt;color:#64748b;">Bu işlem ile kuryenin güncel cari kasa bakiyesi 0,00 ₺ olarak sıfırlanmıştır.</div>
          </div>

          <div class="signs">
            <div class="sign-box">
              <div class="sign-title">TESLİM EDEN (KURYE)</div>
              <div class="sign-sub">${s.courierFullName} • İmza:</div>
            </div>
            <div class="sign-box">
              <div class="sign-title">TESLİM ALAN (KASA / YETKİLİ)</div>
              <div class="sign-sub">Kaşe / İmza:</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ─── Excel İndirme (Restoran Ekstresi) ────────────────────────────────────
  const handleExportMerchantExcel = () => {
    if (!selectedMerchantForRecon || !merchantSummary) return;

    const m = selectedMerchantForRecon;
    const s = merchantSummary;
    const directionText =
      s.settlementDirection === 'CourierFirmOwesMerchant'
        ? 'FİRMA ➔ RESTORANA ÖDEYECEK'
        : s.settlementDirection === 'MerchantOwesCourierFirm'
        ? 'RESTORAN ➔ FİRMAYA ÖDEYECEK'
        : 'HESAP DENK / MUTABIK';

    const orderRowsHtml = s.orders.map((o, idx) => `
      <tr>
        <td style="border:1px solid #cbd5e1;text-align:center;padding:6px;">${idx + 1}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;font-family:monospace;font-weight:bold;">${o.orderCode}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;">${fmtDate(o.createdAt)}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;font-weight:bold;">${o.customerName}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;">${o.deliveryAddress}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;font-weight:bold;background-color:${o.paymentMethod === 'Cash' ? '#fef3c7' : '#e0f2fe'};color:${o.paymentMethod === 'Cash' ? '#92400e' : '#075985'};">
          ${o.paymentMethod === 'Cash' ? 'Kapıda Nakit' : 'Online / Kart'}
        </td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;font-weight:bold;mso-number-format:'\\#\\,\\#\\#0\\.00';">${o.totalOrderAmount.toFixed(2)} ₺</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;mso-number-format:'\\#\\,\\#\\#0\\.00';">${o.packageFee.toFixed(2)} ₺</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;font-weight:bold;color:${o.netCashEffect >= 0 ? '#15803d' : '#b45309'};mso-number-format:'\\#\\,\\#\\#0\\.00';">
          ${o.netCashEffect > 0 ? '+' : ''}${o.netCashEffect.toFixed(2)} ₺
        </td>
        <td style="border:1px solid #cbd5e1;padding:6px;">${o.courierName || '—'}</td>
      </tr>
    `).join('');

    const courierRowsHtml = s.couriers.map(c => `
      <tr>
        <td colspan="3" style="border:1px solid #cbd5e1;padding:6px;font-weight:bold;">${c.fullName}</td>
        <td colspan="3" style="border:1px solid #cbd5e1;padding:6px;font-family:monospace;">${c.phoneNumber}</td>
        <td colspan="2" style="border:1px solid #cbd5e1;padding:6px;text-align:center;font-weight:bold;">${c.deliveredCount} Paket</td>
        <td colspan="2" style="border:1px solid #cbd5e1;padding:6px;text-align:right;font-weight:bold;mso-number-format:'\\#\\,\\#\\#0\\.00';">${c.cashCollected.toFixed(2)} ₺</td>
      </tr>
    `).join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <th colspan="10" style="background-color:#0f172a;color:#ffffff;font-size:16pt;font-weight:bold;padding:14px;text-align:center;">
              RESTORAN CARİ HESAP EKSTRESİ VE MAHSUPLAŞMA RAPORU
            </th>
          </tr>
          <tr><td colspan="10"></td></tr>
          <tr>
            <td colspan="2" style="font-weight:bold;color:#475569;">İşletme / Restoran:</td>
            <td colspan="3" style="font-weight:bold;font-size:12pt;color:#0f172a;">${m.name}</td>
            <td colspan="2" style="font-weight:bold;color:#475569;">Rapor Tarihi:</td>
            <td colspan="3">${new Date().toLocaleString('tr-TR')}</td>
          </tr>
          <tr>
            <td colspan="2" style="font-weight:bold;color:#475569;">Telefon / Adres:</td>
            <td colspan="3">${m.phoneNumber || '—'} / ${m.address || '—'}</td>
            <td colspan="2" style="font-weight:bold;color:#475569;">Dönem / Filtre:</td>
            <td colspan="3">${reconDateFilter === 'all' ? 'Tüm Zamanlar' : reconDateFilter === 'today' ? 'Bugün' : reconDateFilter === 'week' ? 'Son 7 Gün' : 'Bu Ay'}</td>
          </tr>
          <tr>
            <td colspan="2" style="font-weight:bold;color:#475569;">Sözleşmeli Paket Ücreti:</td>
            <td colspan="3" style="font-weight:bold;">${m.defaultPackageFee} TL / paket</td>
            <td colspan="2" style="font-weight:bold;color:#475569;">Sözleşme Periyodu:</td>
            <td colspan="3">${getReconciliationPeriodLabel(m.reconciliationPeriod)}</td>
          </tr>
          <tr><td colspan="10"></td></tr>
          
          <!-- KPI Özet Tablosu -->
          <tr>
            <td colspan="2" style="background-color:#f1f5f9;border:1px solid #cbd5e1;padding:8px;font-weight:bold;text-align:center;">
              Teslim Edilen Paket
            </td>
            <td colspan="2" style="background-color:#fef3c7;border:1px solid #cbd5e1;padding:8px;font-weight:bold;text-align:center;color:#92400e;">
              Kapıda Nakit Tahsilat
            </td>
            <td colspan="3" style="background-color:#f1f5f9;border:1px solid #cbd5e1;padding:8px;font-weight:bold;text-align:center;">
              Firma Hizmet Bedeli
            </td>
            <td colspan="3" style="background-color:${s.settlementDirection === 'CourierFirmOwesMerchant' ? '#dcfce7' : '#fee2e2'};border:1px solid #cbd5e1;padding:8px;font-weight:bold;text-align:center;color:${s.settlementDirection === 'CourierFirmOwesMerchant' ? '#166534' : '#991b1b'};">
              Net Mahsuplaşma Bakiyesi
            </td>
          </tr>
          <tr>
            <td colspan="2" style="border:1px solid #cbd5e1;padding:10px;font-size:14pt;font-weight:bold;text-align:center;">
              ${s.totalDeliveredCount} Adet
            </td>
            <td colspan="2" style="border:1px solid #cbd5e1;padding:10px;font-size:14pt;font-weight:bold;text-align:center;color:#b45309;">
              ${s.totalCashAmount.toFixed(2)} ₺
            </td>
            <td colspan="3" style="border:1px solid #cbd5e1;padding:10px;font-size:14pt;font-weight:bold;text-align:center;">
              ${s.totalFirmDeliveryFee.toFixed(2)} ₺ (${s.totalDeliveredCount} × ${s.defaultPackageFee} ₺)
            </td>
            <td colspan="3" style="border:1px solid #cbd5e1;padding:10px;font-size:14pt;font-weight:bold;text-align:center;color:${s.settlementDirection === 'CourierFirmOwesMerchant' ? '#15803d' : '#b91c1c'};">
              ${s.settlementDirection === 'CourierFirmOwesMerchant' ? '+' : s.settlementDirection === 'MerchantOwesCourierFirm' ? '-' : ''}${s.netSettlementBalance.toFixed(2)} ₺
              <br/><span style="font-size:9pt;font-weight:normal;">(${directionText})</span>
            </td>
          </tr>
          <tr><td colspan="10"></td></tr>

          <!-- Sipariş Başlığı -->
          <tr>
            <th colspan="10" style="background-color:#1e293b;color:#ffffff;font-size:12pt;font-weight:bold;padding:8px;text-align:left;">
              1. DETAYLI SİPARİŞ VE TESLİMAT DÖKÜMÜ (${s.orders.length} Sipariş)
            </th>
          </tr>
          <tr style="background-color:#f8fafc;font-weight:bold;">
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;width:40px;">No</td>
            <td style="border:1px solid #cbd5e1;padding:8px;width:120px;">Sipariş Kodu</td>
            <td style="border:1px solid #cbd5e1;padding:8px;width:140px;">Tarih</td>
            <td style="border:1px solid #cbd5e1;padding:8px;width:150px;">Müşteri</td>
            <td style="border:1px solid #cbd5e1;padding:8px;width:240px;">Teslimat Adresi</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;width:110px;">Ödeme Şekli</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;width:120px;">Sipariş Tutarı</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;width:120px;">Firma Payı</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;width:120px;">Net Nakit Etki</td>
            <td style="border:1px solid #cbd5e1;padding:8px;width:140px;">Teslim Eden Kurye</td>
          </tr>
          ${orderRowsHtml}
          ${s.couriers.length > 0 ? `
          <tr><td colspan="10"></td></tr>
          <tr>
            <th colspan="10" style="background-color:#1e293b;color:#ffffff;font-size:12pt;font-weight:bold;padding:8px;text-align:left;">
              2. KURYE TESLİMAT VE TAHSİLAT DAĞILIMI
            </th>
          </tr>
          <tr style="background-color:#f8fafc;font-weight:bold;">
            <td colspan="3" style="border:1px solid #cbd5e1;padding:8px;">Kurye Adı Soyadı</td>
            <td colspan="3" style="border:1px solid #cbd5e1;padding:8px;">Telefon</td>
            <td colspan="2" style="border:1px solid #cbd5e1;padding:8px;text-align:center;">Teslim Edilen Paket</td>
            <td colspan="2" style="border:1px solid #cbd5e1;padding:8px;text-align:right;">Tahsil Edilen Nakit</td>
          </tr>
          ${courierRowsHtml}
          ` : ''}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cari_ekstre_${m.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── PDF / Yazdır: Resmi Cari Hesap Mutabakat Tutanağı ──────────────────────
  const handleDownloadMerchantPdf = () => {
    if (!selectedMerchantForRecon || !merchantSummary) return;

    const m = selectedMerchantForRecon;
    const s = merchantSummary;
    const printWindow = window.open('', '_blank', 'width=1000,height=900');
    if (!printWindow) {
      alert('Lütfen tarayıcınızın açılır pencerelerine izin veriniz.');
      return;
    }

    const directionText =
      s.settlementDirection === 'CourierFirmOwesMerchant'
        ? 'FİRMA ➔ RESTORANA NAKİT ÖDEYECEKTİR'
        : s.settlementDirection === 'MerchantOwesCourierFirm'
        ? 'RESTORAN ➔ FİRMAYA HİZMET BEDELİ ÖDEYECEKTİR'
        : 'HESAPLAR DENK VE MUTABIKTIR';

    const orderRows = s.orders.map((o, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="font-family:monospace;font-weight:600;">${o.orderCode}</td>
        <td>${fmtDate(o.createdAt)}</td>
        <td style="font-weight:600;">${o.customerName}</td>
        <td style="font-size:8pt;color:#475569;">${o.deliveryAddress}</td>
        <td style="text-align:center;">
          <span style="font-weight:bold;padding:2px 6px;border-radius:4px;font-size:7.5pt;background:${o.paymentMethod === 'Cash' ? '#fef3c7' : '#e0f2fe'};color:${o.paymentMethod === 'Cash' ? '#92400e' : '#075985'};">
            ${o.paymentMethod === 'Cash' ? 'Kapıda Nakit' : 'Online / Kart'}
          </span>
        </td>
        <td style="text-align:right;font-weight:600;">₺${fmt(o.totalOrderAmount)}</td>
        <td style="text-align:right;">₺${fmt(o.packageFee)}</td>
        <td style="text-align:right;font-weight:700;color:${o.netCashEffect >= 0 ? '#15803d' : '#b45309'};">
          ${o.netCashEffect > 0 ? '+' : ''}₺${fmt(o.netCashEffect)}
        </td>
        <td style="font-size:8.5pt;">${o.courierName || '—'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <title>Mutabakat Tutanağı - ${m.name}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; font-size: 9pt; padding: 10px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
          .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
          table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 8px; }
          th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; }
          td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
          .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
          .sign-card { border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px; height: 80px; display: flex; flex-direction: column; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin:0;font-size:14pt;">CARİ HESAP MUTABAKAT TUTANAĞI</h1>
            <p style="margin:2px 0;color:#64748b;font-size:8pt;">Filo Kurye Yönetimi • Resmi Finansal Mutabakat Belgesi</p>
          </div>
          <div style="text-align:right;font-size:8pt;">
            <div><strong>Tarih:</strong> ${new Date().toLocaleDateString('tr-TR')}</div>
            <div><strong>Dönem:</strong> ${reconDateFilter.toUpperCase()}</div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div style="font-size:7.5pt;font-weight:700;color:#64748b;">HİZMET VEREN (KURYE FİRMASI)</div>
            <div style="font-size:10pt;font-weight:800;color:#0f172a;margin-top:2px;">Kurye Lojistik & Dağıtım A.Ş.</div>
          </div>
          <div class="card">
            <div style="font-size:7.5pt;font-weight:700;color:#64748b;">HİZMET ALAN (RESTORAN)</div>
            <div style="font-size:10pt;font-weight:800;color:#0f172a;margin-top:2px;">${m.name}</div>
            <div style="font-size:8pt;color:#64748b;">Tarife: ₺${fmt(m.defaultPackageFee || 0)} / paket</div>
          </div>
        </div>

        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:10px;margin-bottom:12px;display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;text-align:center;">
          <div><div style="font-size:7.5pt;color:#64748b;">Teslim Paket</div><div style="font-size:12pt;font-weight:900;">${s.totalDeliveredCount} Adet</div></div>
          <div><div style="font-size:7.5pt;color:#64748b;">Nakit Tahsilat</div><div style="font-size:12pt;font-weight:900;color:#b45309;">₺${fmt(s.totalCashAmount)}</div></div>
          <div><div style="font-size:7.5pt;color:#64748b;">Firma Hizmet Payı</div><div style="font-size:12pt;font-weight:900;">₺${fmt(s.totalFirmDeliveryFee)}</div></div>
          <div><div style="font-size:7.5pt;color:#64748b;">Net Mahsuplaşma</div><div style="font-size:12pt;font-weight:900;color:#15803d;">₺${fmt(s.netSettlementBalance)}</div><div style="font-size:7pt;font-weight:bold;">${directionText}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Sipariş No</th>
              <th>Tarih</th>
              <th>Müşteri</th>
              <th>Adres</th>
              <th>Ödeme</th>
              <th style="text-align:right;">Sipariş</th>
              <th style="text-align:right;">Firma Payı</th>
              <th style="text-align:right;">Net Etki</th>
              <th>Kurye</th>
            </tr>
          </thead>
          <tbody>
            ${orderRows}
          </tbody>
        </table>

        <div class="signs">
          <div class="sign-card"><div style="font-size:8pt;font-weight:bold;">KURYE FİRMASI YETKİLİSİ</div><div style="font-size:7pt;color:#64748b;border-top:1px solid #e2e8f0;">Kaşe / İmza:</div></div>
          <div class="sign-card"><div style="font-size:8pt;font-weight:bold;">RESTORAN YETKİLİSİ</div><div style="font-size:7pt;color:#64748b;border-top:1px solid #e2e8f0;">Kaşe / İmza:</div></div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.focus(); window.print(); }, 250); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ─── CSV İndirme (Restoran Ekstresi) ──────────────────────────────────────
  const handleExportMerchantCsv = () => {
    if (!selectedMerchantForRecon || !merchantSummary) return;
    const m = selectedMerchantForRecon;
    const s = merchantSummary;

    const rows = s.orders.map(o =>
      `"${o.orderCode}";"${fmtDate(o.createdAt)}";"${(o.customerName || '').replace(/"/g, '""')}";"${(o.deliveryAddress || '').replace(/"/g, '""')}";"${o.paymentMethod === 'Cash' ? 'Kapıda Nakit' : 'Online / Kart'}";"${o.totalOrderAmount.toFixed(2)}";"${o.packageFee.toFixed(2)}";"${o.netCashEffect.toFixed(2)}";"${(o.courierName || '').replace(/"/g, '""')}"`
    ).join('\n');

    const header = `"Sipariş Kodu";"Tarih";"Müşteri";"Teslimat Adresi";"Ödeme Türü";"Sipariş Tutarı (TL)";"Firma Paket Payı (TL)";"Net Nakit Etkisi (TL)";"Teslim Eden Kurye"\n`;
    const summaryBlock = `sep=;\n"RESTORAN CARİ HESAP EKSTRESİ VE MUTABAKAT RAPORU"\n"Restoran:";"${m.name}"\n"Dönem:";"${reconDateFilter.toUpperCase()}"\n"Rapor Tarihi:";"${new Date().toLocaleString('tr-TR')}"\n"Toplam Teslim Edilen Paket:";"${s.totalDeliveredCount}"\n"Kapıda Nakit Tahsilat:";"${s.totalCashAmount.toFixed(2)} TL"\n"Firma Hizmet Bedeli:";"${s.totalFirmDeliveryFee.toFixed(2)} TL"\n"Net Cari Bakiye:";"${s.netSettlementBalance.toFixed(2)} TL"\n"Mahsuplaşma Yönü:";"${s.settlementDirection}"\n\n`;

    const blob = new Blob([`\uFEFF${summaryBlock}${header}${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ekstre_${m.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ── Üst Başlık & Yenileme ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Finans & Mahsuplaşma</h1>
              <p className="text-xs text-slate-500 mt-0.5">Filo geneli nakit akışı, canlı kurye kasaları ve restoran mutabakat masası</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'settlements' && (
            <button
              onClick={() => {
                const rows = settlements.map(s =>
                  `"${fmtDate(s.settledAt)}";"${s.courierFullName}";"${s.settledAmount}";"${s.cashCollectedTotal}";"${s.courierEarningsTotal}";"${s.deliveredPackageCount}";"${(s.notes || '').replace(/"/g, '""')}"`
                ).join('\n');
                const blob = new Blob([`\uFEFFsep=;\n"Tarih";"Kurye";"Mahsup Tutarı";"Nakit Tahsilat";"Kurye Hakediş";"Teslim Paket";"Notlar"\n${rows}`], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `mahsuplasma_raporu_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
              }}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>CSV Rapor</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-xs shadow-teal-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* ── Özet KPI Kartları (Genel Finansal Durum) ───────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Mahsup Tutarı', value: `₺${fmt(totalSettled)}`, icon: Wallet, bg: 'bg-teal-50 text-teal-600', border: 'border-teal-200/80', desc: 'Geçmiş kapatılan kasalar' },
          { label: 'Sahadaki Toplam Nakit', value: `₺${fmt(totalFieldCash > 0 ? totalFieldCash : totalCash)}`, icon: Banknote, bg: 'bg-amber-50 text-amber-600', border: 'border-amber-200/80', desc: 'Kuryelerin üzerindeki nakit' },
          { label: 'Kurye Hakediş Alacağı', value: `₺${fmt(totalCourierEarnings > 0 ? totalCourierEarnings : totalEarnings)}`, icon: TrendingUp, bg: 'bg-violet-50 text-violet-600', border: 'border-violet-200/80', desc: 'Paket başı kurye payları' },
          { label: 'Teslim Edilen Paket', value: totalPackages > 0 ? totalPackages : orders.filter(o => o.status === 'Delivered' || o.status === 3 || o.status === 4).length, icon: Package, bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200/80', desc: 'Başarılı teslimatlar' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-2xl border ${kpi.border} p-5 shadow-xs hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">{kpi.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Tab Butonları ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('merchants')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'merchants'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4 text-violet-600" />
            <span>Restoran Cari & Mahsuplaşma</span>
            <span className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full font-black border border-violet-200">
              {merchants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('couriers')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'couriers'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-amber-600" />
            <span>Canlı Kurye Kasaları</span>
            <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-black border border-amber-200">
              {couriers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settlements')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settlements'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-teal-600" />
            <span>Mahsuplaşma Geçmişi & Makbuzlar</span>
            <span className="text-[10px] px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full font-black border border-teal-200">
              {settlements.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Arama ve Filtre Çubuğu ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'merchants'
                ? 'Restoran adı veya adres ara...'
                : activeTab === 'couriers'
                ? 'Kurye adı veya telefon numarası ara...'
                : 'Kurye adı, telefon veya mahsuplaşma notu ara...'
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* Mahsuplaşma Geçmişi sekmesine özel filtreler */}
        {activeTab === 'settlements' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Kurye Filtresi Dropdown */}
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs font-bold">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={settlementCourierFilter}
                onChange={e => setSettlementCourierFilter(e.target.value)}
                className="bg-transparent border-none text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm Kuryeler ({settlements.length})</option>
                {couriers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Tarih Filtresi */}
            <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1 rounded-xl shadow-xs text-xs font-bold">
              {(['all', 'today', 'week', 'month'] as const).map((filterKey) => {
                const labels = { all: 'Tümü', today: 'Bugün', week: 'Son 7 Gün', month: 'Bu Ay' };
                return (
                  <button
                    key={filterKey}
                    onClick={() => setDateFilter(filterKey)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      dateFilter === filterKey
                        ? 'bg-teal-500 text-white font-black shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {labels[filterKey]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SEKME 1: Restoran Cari Hesap & Mahsuplaşma Masası ────────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'merchants' && (
        <div className="space-y-4">
          <div className="bg-linear-to-r from-violet-50 to-indigo-50 border border-violet-200/80 rounded-2xl p-4 flex items-start space-x-3 text-xs text-violet-900 shadow-xs">
            <ArrowRightLeft className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-slate-900 text-sm">Restoran Cari Hesap ve Mahsuplaşma Mantığı</p>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Kuryeler müşteriden <strong>kapıda nakit</strong> tahsilat yaptığında bu para kurye firması kasasına girer. 
                Firma, sözleşmeli <strong>paket başı hizmet bedelini</strong> düşer; kalan tutar <strong className="text-emerald-700">Restorana Ödenir</strong>. 
                Siparişler online/kartlıysa veya tahsilat komisyonu karşılamıyorsa, bakiye <strong className="text-amber-700">Restorandan Tahsil Edilir</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Store className="w-5 h-5 text-violet-400" />
                <div>
                  <h3 className="font-black text-sm text-white">Sözleşmeli Restoranlar & Cari Bakiye Tablosu</h3>
                  <p className="text-xs text-slate-400">Canlı paket sayıları, toplanan nakitler ve anlık mahsuplaşma durumu</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Restoran / İşletme</th>
                    <th className="py-3 px-4">Paket Tarifesi</th>
                    <th className="py-3 px-4 text-center">Teslim Edilen</th>
                    <th className="py-3 px-4 text-right">Kapıda Nakit Tahsilat</th>
                    <th className="py-3 px-4 text-right">Firma Hizmet Bedeli</th>
                    <th className="py-3 px-4 text-right">Net Cari Mahsuplaşma</th>
                    <th className="py-3 px-5 text-right">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredMerchants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        Restoran kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredMerchants.map(merchant => {
                      const stats = merchantStatsMap.get(merchant.id) || {
                        deliveredCount: 0,
                        cashCollected: 0,
                        firmDeliveryFee: 0,
                        netBalance: 0,
                        direction: 'Balanced' as const,
                      };

                      const owesMerchant = stats.direction === 'CourierFirmOwesMerchant';
                      const owesFirm = stats.direction === 'MerchantOwesCourierFirm';

                      return (
                        <tr key={merchant.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 font-black flex items-center justify-center text-sm shrink-0">
                                <Store className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-950 block">{merchant.name}</span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black ${
                                    merchant.isOpen !== false
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {merchant.isOpen !== false ? 'Açık' : 'Kapalı'}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 truncate block max-w-xs">{merchant.address || 'Adres tanımlı'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-flex items-center space-x-1 font-black text-slate-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-xs">
                              <span>₺{fmt(merchant.defaultPackageFee || 0)}</span>
                              <span className="text-[10px] text-amber-700 font-semibold">/paket</span>
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              {getReconciliationPeriodLabel(merchant.reconciliationPeriod)} • {getDispatchModeLabel(merchant.dispatchMode)}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                              <Package className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              {stats.deliveredCount} paket
                            </span>
                          </td>

                          <td className="py-4 px-4 text-right font-black text-slate-900">
                            ₺{fmt(stats.cashCollected)}
                          </td>

                          <td className="py-4 px-4 text-right font-black text-slate-700">
                            ₺{fmt(stats.firmDeliveryFee)}
                          </td>

                          <td className="py-4 px-4 text-right">
                            {owesMerchant && (
                              <div className="inline-flex flex-col items-end">
                                <span className="text-emerald-700 font-black text-sm flex items-center bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                                  +₺{fmt(stats.netBalance)}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 mt-0.5">Restorana Ödenecek</span>
                              </div>
                            )}
                            {owesFirm && (
                              <div className="inline-flex flex-col items-end">
                                <span className="text-amber-700 font-black text-sm flex items-center bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                                  -₺{fmt(stats.netBalance)}
                                </span>
                                <span className="text-[10px] font-bold text-amber-600 mt-0.5">Restorandan Alınacak</span>
                              </div>
                            )}
                            {!owesMerchant && !owesFirm && (
                              <span className="text-slate-400 text-xs font-semibold">₺0,00 (Mutabık)</span>
                            )}
                          </td>

                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => setSelectedMerchantForRecon(merchant)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black rounded-xl shadow-xs shadow-violet-500/20 transition-all active:scale-95 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Ekstre & Mahsuplaş</span>
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

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SEKME 2: Canlı Kurye Kasaları (Detaylı & Anlaşılır) ───────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'couriers' && (
        <div className="space-y-4">
          {/* Anlaşılır Bilgilendirme Kartı */}
          <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-950 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-slate-900 text-sm">Kurye Kasa ve Borç/Alacak Hesap Mantığı</p>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Kurye sipariş tesliminde müşteriden <strong>kapıda nakit</strong> aldığında bu para doğrudan kuryenin cebine girer ve kurye şirkete <strong className="text-rose-700">Nakit Borçlu</strong> duruma geçer. 
                Kuryenin paket teslimatlarından kazandığı <strong>Kurye Hakedişi</strong> bu borçtan otomatik düşülür. 
                Gün sonunda kurye üzerindeki net nakit parayı şirket kasasına teslim ettiğinde <strong className="text-emerald-700">"Kasayı Kapat"</strong> butonuna basılarak kasa sıfırlanır ve resmi makbuz kesilir.
              </p>
            </div>
          </div>

          {/* 4 Canlı Kurye Kasa İndikatörü */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-amber-700 text-xs font-bold mb-1">
                <span>Sahadaki Toplam Nakit</span>
                <Banknote className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl font-black text-slate-900">₺{fmt(totalFieldCash)}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Kuryelerin elden topladığı nakit</p>
            </div>

            <div className="bg-white rounded-2xl border border-violet-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-violet-700 text-xs font-bold mb-1">
                <span>Kurye Hakediş Alacağı</span>
                <TrendingUp className="w-4 h-4 text-violet-500" />
              </div>
              <p className="text-xl font-black text-slate-900">₺{fmt(totalCourierEarnings)}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Kuryelere ödenecek teslimat payı</p>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-rose-700 text-xs font-bold mb-1">
                <span>Nakit Teslim Edecek Kuryeler</span>
                <ArrowDownRight className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-xl font-black text-rose-600">{couriersWithDebtCount} Kurye</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Üzerinde nakit borcu olanlar</p>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-1">
                <span>Alacaklı / Sıfır Kasalar</span>
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl font-black text-emerald-600">
                {couriersWithCreditCount} Kurye
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Kasası temiz veya alacaklı olanlar</p>
            </div>
          </div>

          {/* Kurye Kasaları Tablosu */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-sm text-white">Canlı Kurye Kasaları & Hakediş Durumu</h3>
                  <p className="text-xs text-slate-400">Kuryelerin canlı teslimat adetleri, elden topladıkları nakit ve net kapatılacak kasa bakiyesi</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Kurye</th>
                    <th className="py-3 px-4 text-center">Teslimat</th>
                    <th className="py-3 px-4 text-right">Kapıda Nakit Tahsilat</th>
                    <th className="py-3 px-4 text-right">Kurye Hakedişi</th>
                    <th className="py-3 px-4 text-right">Net Kasa & Hesaplama</th>
                    <th className="py-3 px-5 text-right">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredCouriers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        Kurye kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredCouriers.map(courier => {
                      const stat = courierStatsMap.get(courier.id) || {
                        deliveredCount: 0,
                        cashCollected: 0,
                        earningsTotal: 0,
                        deliveredOrders: [],
                      };

                      const balance = courier.currentBalance || 0;
                      const hasDebt = balance < 0; // Kurye firmaya nakit borçlu (üzerinde para var)
                      const hasCredit = balance > 0; // Firmanın kuryeye hakediş borcu var

                      return (
                        <tr key={courier.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-black flex items-center justify-center text-xs shrink-0">
                                {courier.firstName[0]}{courier.lastName[0]}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-950 block">
                                    {courier.firstName} {courier.lastName}
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      courier.isAvailable
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${courier.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                    {courier.isAvailable ? 'Sahada / Uygun' : 'Çevrimdışı'}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-400 font-mono block">{courier.phoneNumber}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                              <Package className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              {stat.deliveredCount} paket
                            </span>
                          </td>

                          <td className="py-4 px-4 text-right font-black text-amber-900">
                            ₺{fmt(stat.cashCollected)}
                            <div className="text-[10px] text-slate-400 font-normal">müşteriden alınan</div>
                          </td>

                          <td className="py-4 px-4 text-right font-black text-emerald-700">
                            ₺{fmt(stat.earningsTotal)}
                            <div className="text-[10px] text-slate-400 font-normal">paket başı kazanç</div>
                          </td>

                          <td className="py-4 px-4 text-right">
                            {hasDebt && (
                              <div className="inline-flex flex-col items-end">
                                <span className="text-rose-700 font-black text-sm flex items-center bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                                  -₺{fmt(balance)}
                                </span>
                                <span className="text-[10px] font-bold text-rose-600 mt-0.5">
                                  Kurye Firmaya Nakit Teslim Edecek
                                </span>
                              </div>
                            )}
                            {hasCredit && (
                              <div className="inline-flex flex-col items-end">
                                <span className="text-emerald-700 font-black text-sm flex items-center bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                                  +₺{fmt(balance)}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 mt-0.5">
                                  Şirketten Kuryeye Ödenecek Hakediş
                                </span>
                              </div>
                            )}
                            {!hasDebt && !hasCredit && (
                              <div className="inline-flex flex-col items-end">
                                <span className="text-slate-500 font-black text-xs bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                  ₺0,00 (Kasa Temiz)
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5">Borç/Alacak yok</span>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-5 text-right">
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                onClick={() => setSelectedCourierForDetail(courier)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                title="Kuryenin teslim ettiği siparişlerin dökümü"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                <span>Ekstre</span>
                              </button>

                              <button
                                onClick={() => setReconcileModalCourier(courier)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                                title="Kurye ile nakit mahsuplaşmasını yap ve bakiyeyi sıfırla"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                                <span>Kasayı Kapat</span>
                              </button>
                            </div>
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

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SEKME 3: Mahsuplaşma Geçmişi & Resmi Makbuzlar (Detaylı) ─── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          {/* Bilgilendirici İpucu Kartı */}
          <div className="bg-linear-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl p-4 flex items-start space-x-3 text-xs text-teal-950 shadow-xs">
            <Receipt className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-slate-900 text-sm">Resmi Mahsuplaşma ve Kasa Kapatma Denetim Kayıtları</p>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Bu tabloda geçmişte kuryelerle yapılan tüm kasa kapatma ve nakit teslim alma işlemleri listelenir. 
                Her işlem için tek tıkla resmi <strong>"Kasa Makbuzu (PDF)"</strong> oluşturabilir, teslim eden kurye ve teslim alan kasa yetkilisi imzalarıyla arşivleyebilirsiniz.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 animate-pulse space-y-4 shadow-xs">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-48" />
                    <div className="h-2.5 bg-slate-100 rounded w-32" />
                  </div>
                  <div className="w-20 h-5 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : filteredSettlements.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center shadow-xs">
              <RotateCcw className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Aradığınız kriterde mahsuplaşma kaydı bulunamadı</p>
              <p className="text-xs text-slate-300 mt-1">Canlı Kurye Kasaları sekmesinden kurye kasasını kapatarak yeni makbuz oluşturabilirsiniz.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Receipt className="w-5 h-5 text-teal-400" />
                  <div>
                    <h3 className="font-black text-sm text-white">Geçmiş Kasa Kapatma & Mahsuplaşma İşlemleri</h3>
                    <p className="text-xs text-slate-400">Resmi makbuzlar, kapatılan tutarlar ve kurye bazlı nakit dökümü ({filteredSettlements.length} Kayıt)</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Makbuz No & Tarih</th>
                      <th className="py-3 px-4">Kurye</th>
                      <th className="py-3 px-4 text-center">Teslim Paket</th>
                      <th className="py-3 px-4 text-right">Toplanan Nakit</th>
                      <th className="py-3 px-4 text-right">Kurye Hakedişi</th>
                      <th className="py-3 px-4 text-right">Kapatılan Net Bakiye</th>
                      <th className="py-3 px-5 text-right">İşlem & Makbuz</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSettlements.map(s => {
                      const amountAbs = Math.abs(s.settledAmount);
                      const isCashIn = s.settledAmount <= 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <span className="font-mono font-bold text-xs text-slate-800 block">
                              #MAK-{s.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-0.5 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {fmtDate(s.settledAt)}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {s.courierFullName.split(' ').map(p => p[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-xs">{s.courierFullName}</span>
                                <span className="text-[11px] text-slate-400 font-mono">{s.courierPhoneNumber}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              <Package className="w-3 h-3 mr-1 text-slate-400" />
                              {s.deliveredPackageCount} paket
                            </span>
                          </td>

                          <td className="py-4 px-4 text-right font-black text-amber-900 text-xs">
                            ₺{fmt(s.cashCollectedTotal)}
                          </td>

                          <td className="py-4 px-4 text-right font-black text-emerald-700 text-xs">
                            ₺{fmt(s.courierEarningsTotal)}
                          </td>

                          <td className="py-4 px-4 text-right">
                            <span className={`inline-flex items-center space-x-1 font-black text-xs px-2.5 py-1 rounded-xl border ${
                              isCashIn
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>₺{fmt(amountAbs)}</span>
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              {isCashIn ? 'Kuryeden Nakit Alındı' : 'Kuryeye Hakediş Ödendi'}
                            </div>
                          </td>

                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => handlePrintSettlementReceipt(s)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                              title="Resmi Kasa Kapatma Makbuzunu PDF Olarak Yazdır"
                            >
                              <Printer className="w-3.5 h-3.5 text-teal-600" />
                              <span>Makbuz (PDF)</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Alt Özet Çubuğu */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Kapatılan İşlem Sayısı</span>
                  <span className="font-black text-slate-900 text-sm">{filteredSettlements.length} İşlem</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Dönem Nakit Tahsilatı</span>
                  <span className="font-black text-amber-700 text-sm">₺{fmt(filteredSettlements.reduce((s, r) => s + r.cashCollectedTotal, 0))}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Dönem Kurye Hakedişi</span>
                  <span className="font-black text-emerald-700 text-sm">₺{fmt(filteredSettlements.reduce((s, r) => s + r.courierEarningsTotal, 0))}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Kapatılan Net Kasa Tutarı</span>
                  <span className="font-black text-teal-700 text-sm">₺{fmt(filteredSettlements.reduce((s, r) => s + Math.abs(r.settledAmount), 0))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: KURYE DETAY VE CANLI SİPARİŞ EKSTRESİ ──────────────── */}
      {selectedCourierForDetail && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-base">
                  {selectedCourierForDetail.firstName[0]}{selectedCourierForDetail.lastName[0]}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-white">
                      {selectedCourierForDetail.firstName} {selectedCourierForDetail.lastName}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedCourierForDetail.isAvailable
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-300 border border-slate-600'
                    }`}>
                      {selectedCourierForDetail.isAvailable ? 'Sahada / Uygun' : 'Çevrimdışı'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {selectedCourierForDetail.phoneNumber} • Canlı Kasa Durum Kartı
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCourierForDetail(null)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KPI Kartları */}
            {(() => {
              const stat = courierStatsMap.get(selectedCourierForDetail.id) || {
                deliveredCount: 0,
                cashCollected: 0,
                earningsTotal: 0,
                deliveredOrders: [],
              };
              const bal = selectedCourierForDetail.currentBalance || 0;

              return (
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                      <span className="text-slate-400 font-bold text-[11px] block">Teslimat Adedi</span>
                      <span className="text-lg font-black text-slate-900 mt-0.5 block">{stat.deliveredCount} Paket</span>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
                      <span className="text-amber-700 font-bold text-[11px] block">Toplanan Nakit</span>
                      <span className="text-lg font-black text-amber-900 mt-0.5 block">₺{fmt(stat.cashCollected)}</span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
                      <span className="text-emerald-700 font-bold text-[11px] block">Kurye Hakedişi</span>
                      <span className="text-lg font-black text-emerald-900 mt-0.5 block">₺{fmt(stat.earningsTotal)}</span>
                    </div>

                    <div className={`rounded-2xl p-3.5 border ${
                      bal < 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}>
                      <span className="font-bold text-[11px] block opacity-75">Kasa Bakiyesi</span>
                      <span className="text-lg font-black mt-0.5 block">₺{fmt(bal)}</span>
                    </div>
                  </div>

                  {/* Sipariş Tablosu */}
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5">
                      Kuryenin Teslim Ettiği Siparişler ({stat.deliveredOrders.length})
                    </h4>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                            <tr>
                              <th className="py-2.5 px-3">Kod / Tarih</th>
                              <th className="py-2.5 px-3">Müşteri</th>
                              <th className="py-2.5 px-3 text-center">Ödeme Şekli</th>
                              <th className="py-2.5 px-3 text-right">Sipariş Tutarı</th>
                              <th className="py-2.5 px-3 text-right">Kurye Hakedişi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {stat.deliveredOrders.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400">
                                  Kuryeye ait teslim edilmiş sipariş kaydı bulunmuyor.
                                </td>
                              </tr>
                            ) : (
                              stat.deliveredOrders.map(o => (
                                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                    {o.orderCode || o.id.slice(0, 8)}
                                    <div className="text-[10px] text-slate-400 font-normal">{fmtDate(o.createdAt)}</div>
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="font-bold text-slate-900 block">{o.recipientName}</span>
                                    <span className="text-[10px] text-slate-400 truncate block max-w-48">{o.deliveryAddress || o.deliveryAddressLine}</span>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      o.paymentMethod === 'Cash' || o.paymentMethod === 1
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : 'bg-sky-50 text-sky-800 border border-sky-200'
                                    }`}>
                                      {o.paymentMethod === 'Cash' || o.paymentMethod === 1 ? 'Kapıda Nakit' : 'Online / Kart'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-black text-slate-900">
                                    ₺{fmt(o.totalOrderAmount || 0)}
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-emerald-700">
                                    ₺{fmt(o.courierEarning || 0)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCourierForDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => {
                  const c = selectedCourierForDetail;
                  setSelectedCourierForDetail(null);
                  setReconcileModalCourier(c);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Kasayı Kapatma İşlemine Geç</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: RESTORAN CARİ EKSTRE & MAHSUPLAŞMA DETAY MODALI ───── */}
      {selectedMerchantForRecon && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 text-violet-400 flex items-center justify-center font-black">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-white">{selectedMerchantForRecon.name}</h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-400/20 text-violet-300 border border-violet-400/30">
                      ₺{fmt(selectedMerchantForRecon.defaultPackageFee || 0)} / paket
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedMerchantForRecon.phoneNumber || 'Telefon girilmemiş'} • {selectedMerchantForRecon.address || 'İskenderun'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedMerchantForRecon(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Sub-Header & Date Filter + Action Buttons */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-1.5 text-xs font-bold">
                <span className="text-slate-500 mr-1">Tarih Aralığı:</span>
                {(['all', 'today', 'week', 'month'] as const).map((filterKey) => {
                  const labels = { all: 'Tüm Zamanlar', today: 'Bugün', week: 'Son 7 Gün', month: 'Bu Ay' };
                  return (
                    <button
                      key={filterKey}
                      onClick={() => setReconDateFilter(filterKey)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        reconDateFilter === filterKey
                          ? 'bg-violet-600 text-white font-black shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {labels[filterKey]}
                    </button>
                  );
                })}
              </div>

              {/* Rapor İndirme Butonları (Excel, PDF Mutabakat, CSV) */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportMerchantExcel}
                  disabled={!merchantSummary || merchantSummary.orders.length === 0}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Biçimlendirilmiş Excel Raporu (.xls)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel İndir (.xls)</span>
                </button>

                <button
                  onClick={handleDownloadMerchantPdf}
                  disabled={!merchantSummary}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-violet-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Resmi Mutabakat Tutanağını PDF Olarak Kaydet / Yazdır"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Mutabakat Formu (PDF)</span>
                </button>

                <button
                  onClick={handleExportMerchantCsv}
                  disabled={!merchantSummary || merchantSummary.orders.length === 0}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Muhasebe Programları İçin CSV Formatı"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {summaryLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                  <p className="text-xs font-bold text-slate-400">Restoran finansal verileri hesaplanıyor...</p>
                </div>
              ) : merchantSummary ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                        <span>Teslim Edilen Paket</span>
                        <Package className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-xl font-black text-slate-900">{merchantSummary.totalDeliveredCount} adet</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">Başarılı siparişler</p>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
                      <div className="flex items-center justify-between text-amber-700 text-xs font-bold mb-1">
                        <span>Kapıda Nakit Tahsilat</span>
                        <Banknote className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-xl font-black text-amber-900">₺{fmt(merchantSummary.totalCashAmount)}</p>
                      <p className="text-[10px] text-amber-600 mt-1 font-medium">Kuryelerin topladığı nakit</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                        <span>Firma Hizmet Bedeli</span>
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-xl font-black text-slate-900">₺{fmt(merchantSummary.totalFirmDeliveryFee)}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        {merchantSummary.totalDeliveredCount} × ₺{fmt(merchantSummary.defaultPackageFee)}
                      </p>
                    </div>

                    <div className={`rounded-2xl p-4 border ${
                      merchantSummary.settlementDirection === 'CourierFirmOwesMerchant'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : merchantSummary.settlementDirection === 'MerchantOwesCourierFirm'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-slate-100 border-slate-200 text-slate-800'
                    }`}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span>Net Mahsuplaşma</span>
                        <Wallet className="w-4 h-4 opacity-75" />
                      </div>
                      <p className="text-xl font-black">
                        {merchantSummary.settlementDirection === 'CourierFirmOwesMerchant' && '+'}
                        {merchantSummary.settlementDirection === 'MerchantOwesCourierFirm' && '-'}
                        ₺{fmt(merchantSummary.netSettlementBalance)}
                      </p>
                      <p className="text-[10px] font-black mt-1 uppercase tracking-tight">
                        {merchantSummary.settlementDirection === 'CourierFirmOwesMerchant' && '🏢 Firma ➔ Restorana Ödeyecek'}
                        {merchantSummary.settlementDirection === 'MerchantOwesCourierFirm' && '🏪 Restoran ➔ Firmaya Ödeyecek'}
                        {merchantSummary.settlementDirection === 'Balanced' && 'Hesap Denk / Sıfır'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 mb-3">
                      <button
                        onClick={() => setActiveDetailTab('orders')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          activeDetailTab === 'orders'
                            ? 'bg-violet-50 text-violet-700 border border-violet-200'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Sipariş Dökümü ({merchantSummary.orders.length})
                      </button>
                      <button
                        onClick={() => setActiveDetailTab('couriers')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          activeDetailTab === 'couriers'
                            ? 'bg-violet-50 text-violet-700 border border-violet-200'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Kurye Dağılımı ({merchantSummary.couriers.length})
                      </button>
                    </div>

                    {activeDetailTab === 'orders' && (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto max-h-72">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                              <tr>
                                <th className="py-2.5 px-3">Kod / Tarih</th>
                                <th className="py-2.5 px-3">Müşteri</th>
                                <th className="py-2.5 px-3">Ödeme Şekli</th>
                                <th className="py-2.5 px-3 text-right">Sipariş Tutarı</th>
                                <th className="py-2.5 px-3 text-right">Firma Payı</th>
                                <th className="py-2.5 px-3 text-right">Net Etki</th>
                                <th className="py-2.5 px-3">Kurye</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {merchantSummary.orders.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-slate-400">
                                    Seçilen dönemde teslim edilmiş sipariş bulunmuyor.
                                  </td>
                                </tr>
                              ) : (
                                merchantSummary.orders.map(o => (
                                  <tr key={o.orderId} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                      {o.orderCode}
                                      <div className="text-[10px] text-slate-400 font-normal">{fmtDate(o.createdAt)}</div>
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="font-bold text-slate-900 block">{o.customerName}</span>
                                      <span className="text-[10px] text-slate-400 truncate block max-w-40">{o.deliveryAddress}</span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        o.paymentMethod === 'Cash'
                                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                          : 'bg-sky-50 text-sky-800 border border-sky-200'
                                      }`}>
                                        {o.paymentMethod === 'Cash' ? 'Kapıda Nakit' : 'Online / Kart'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-black text-slate-900">
                                      ₺{fmt(o.totalOrderAmount)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-slate-600">
                                      ₺{fmt(o.packageFee)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-black">
                                      {o.netCashEffect > 0 ? (
                                        <span className="text-emerald-600">+₺{fmt(o.netCashEffect)}</span>
                                      ) : o.netCashEffect < 0 ? (
                                        <span className="text-amber-600">-₺{fmt(o.netCashEffect)}</span>
                                      ) : (
                                        <span className="text-slate-400">₺0,00</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 text-[11px]">
                                      {o.courierName || '—'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {activeDetailTab === 'couriers' && (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="py-2.5 px-4">Kurye Adı</th>
                              <th className="py-2.5 px-4">Telefon</th>
                              <th className="py-2.5 px-4 text-center">Teslim Ettiği Paket</th>
                              <th className="py-2.5 px-4 text-right">Tahsil Ettiği Nakit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {merchantSummary.couriers.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400">
                                  Kurye teslimat dağılımı bulunamadı.
                                </td>
                              </tr>
                            ) : (
                              merchantSummary.couriers.map(c => (
                                <tr key={c.courierId} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-2.5 px-4 font-bold text-slate-900">{c.fullName}</td>
                                  <td className="py-2.5 px-4 font-mono text-slate-500">{c.phoneNumber}</td>
                                  <td className="py-2.5 px-4 text-center font-bold text-slate-800">{c.deliveredCount} paket</td>
                                  <td className="py-2.5 px-4 text-right font-black text-amber-700">₺{fmt(c.cashCollected)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer / Settlement Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Her mahsuplaşma işlemi sistem loglarına denetim kaydı olarak işlenir.</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadMerchantPdf}
                  disabled={!merchantSummary}
                  className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-black rounded-xl shadow-xs transition-all flex items-center space-x-1.5 active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-violet-600" />
                  <span>Mutabakat Belgesi (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMerchantForRecon(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
                >
                  Kapat
                </button>

                <button
                  type="button"
                  onClick={handleConfirmMerchantSettlement}
                  disabled={isSettlingMerchant}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black rounded-xl shadow-md shadow-violet-500/25 transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {isSettlingMerchant ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mutabakatı Onayla & Cariyi Kapat</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: KASA MAHSUPLAŞMA / SIFIRLAMA ONAY MODALI (KURYE) ──── */}
      {reconcileModalCourier && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Kasa Mahsuplaşması & Kapatma</h3>
                <p className="text-xs text-slate-500">Kurye nakit hesap kapatma onayı</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Kurye:</span>
                <span className="font-bold text-slate-900">{reconcileModalCourier.firstName} {reconcileModalCourier.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Telefon:</span>
                <span className="font-mono text-slate-700">{reconcileModalCourier.phoneNumber}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-bold">Kapanacak Güncel Bakiye:</span>
                <span className={`text-base font-black ${
                  (reconcileModalCourier.currentBalance || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  ₺{fmt(reconcileModalCourier.currentBalance || 0)}
                  <span className="text-[10px] font-bold ml-1">
                    {(reconcileModalCourier.currentBalance || 0) < 0 ? '(Kuryeden Alınacak Nakit)' : '(Kuryeye Ödenecek)'}
                  </span>
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>Bu işlem kuryenin bakiyesini <strong>0.00 ₺</strong> yapacak, denetim kaydı oluşturacak ve resmi bir <strong>Kasa Tahsilat Makbuzu</strong> üretecektir.</p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setReconcileModalCourier(null)}
                disabled={isReconciling}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleReconcileCourier}
                disabled={isReconciling}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-black rounded-xl shadow-md shadow-teal-500/25 transition-all flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {isReconciling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>İşleniyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mahsuplaşmayı Tamamla & Kasayı Kapat</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
