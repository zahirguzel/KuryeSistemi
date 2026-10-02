export type OrderStatus = 'Created' | 'Pending' | 'Preparing' | 'Ready' | 'Assigned' | 'PickedUp' | 'Delivered' | 'Cancelled' | number;

export type PaymentMethod = 'Online' | 'Cash' | 'CreditCardOnDelivery' | number;

/**
 * Paket Dağıtım Stratejisi
 */
export const DispatchMode = {
  Pool: 1,      // 📡 Havuz Sistemi: Sipariş tüm boş kuryelere düşer, ilk kabul eden alır.
  Manual: 2,    // 🎯 Manuel Atama: Siparişler panele düşer, yönetici kuryeyi kendi seçer.
  SmartAuto: 3, // 🤖 Akıllı GPS: Restorana en yakın boş kuryeye otomatik atar.
} as const;
export type DispatchMode = typeof DispatchMode[keyof typeof DispatchMode];

/**
 * Mahsuplaşma Periyodu (Kurye firması ile hesaplaşma sıklığı)
 */
export const ReconciliationPeriod = {
  Daily: 1,   // Günlük
  Weekly: 2,  // Haftalık
  Monthly: 3, // Aylık
} as const;
export type ReconciliationPeriod = typeof ReconciliationPeriod[keyof typeof ReconciliationPeriod];

export interface Merchant {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  defaultPackageFee: number;
  courierCutFee?: number;
  dispatchMode?: DispatchMode;
  reconciliationPeriod?: ReconciliationPeriod;
  isOpen?: boolean;
  latitude?: number;
  longitude?: number;
  workingHours?: string;
  hexagonSizeMeters?: number;
  maxCourierDistanceKm?: number;
  maxOrdersPerTour?: number;
  orderBatchingTimeMinutes?: number;
  crossRestaurantDistanceMeters?: number;
}

export interface Courier {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isAvailable: boolean;
  currentBalance: number;
  latitude?: number;
  longitude?: number;
  lastLocationUpdate?: string;
}

export interface Order {
  id: string;
  orderCode?: string;
  merchantId?: string;
  merchantName?: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress?: string;
  deliveryAddressLine?: string;
  deliveryDistrict?: string;
  deliveryCity?: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalOrderAmount: number;
  courierEarning: number;
  courierId?: string;
  courierName?: string;
  notes?: string;
  source?: string;
  deliveryNeighborhood?: string;
  estimatedDistanceKm?: number;
  estimatedDeliveryMinutes?: number;
  assignedAt?: string;
  createdAt: string;
  deliveredAt?: string;
  pickedUpAt?: string;
}

export interface CashSettlement {
  id: string;
  merchantId: string;
  courierId: string;
  courierFullName: string;
  courierPhoneNumber: string;
  settledAmount: number;
  cashCollectedTotal: number;
  courierEarningsTotal: number;
  deliveredPackageCount: number;
  settledAt: string;
  notes?: string;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  data: T;
  message?: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export interface CourierDeliveryBreakdown {
  courierId: string;
  fullName: string;
  phoneNumber: string;
  plateNumber: string;
  deliveredCount: number;
  cashCollected: number;
}

export interface MerchantFinanceOrder {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhoneNumber: string;
  deliveryAddress: string;
  paymentMethod: string;
  totalOrderAmount: number;
  packageFee: number;
  netCashEffect: number;
  courierId?: string;
  courierName?: string;
  plateNumber?: string;
  createdAt: string;
  deliveredAt?: string;
  deliveryDurationMinutes?: number;
  deliveryDurationFormatted?: string;
}

export interface MerchantFinanceSummary {
  merchantId: string;
  merchantName: string;
  defaultPackageFee: number;
  totalDeliveredCount: number;
  totalCashAmount: number;
  totalOnlineAmount: number;
  totalCardAmount: number;
  totalDirectRevenue: number;
  totalFirmDeliveryFee: number;
  netSettlementBalance: number;
  settlementDirection: 'CourierFirmOwesMerchant' | 'MerchantOwesCourierFirm' | 'Balanced' | string;
  averageDeliveryDurationMinutes: number;
  couriers: CourierDeliveryBreakdown[];
  orders: MerchantFinanceOrder[];
}

export * from './auth';
export * from './courier';


