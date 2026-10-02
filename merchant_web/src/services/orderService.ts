// src/services/orderService.ts

import { isAxiosError } from 'axios';
import { api } from './api';
import type { ServiceResult } from '../types/auth';
import type { Order, OrderStatus, PaymentMethod } from '../types';

export interface CreateOrderRequest {
  pickupAddressLine?: string;
  pickupDistrict?: string;
  pickupCity?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  deliveryAddressLine: string;
  deliveryDistrict?: string;
  deliveryCity?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNeighborhood?: string;
  source?: string;
  orderCode?: string;
  recipientName: string;
  recipientPhone: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  totalOrderAmount: number;
}

/** Sunucu taraflı sayfalı sipariş yanıtı (GET /api/orders/paged). */
export interface OrderPage {
  items: Order[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  /** Durum adı → adet (durum filtresi hariç diğer filtrelerle hesaplanır). */
  statusCounts: Record<string, number>;
  deliveredToday: number;
}

export interface OrderPageQuery {
  merchantId?: string;
  /** Durum adları (Pending, Assigned, ...). Boşsa tüm durumlar. */
  statuses?: string[];
  search?: string;
  sortDesc?: boolean;
  page?: number;
  size?: number;
}

/**
 * Sipariş Servisi (.NET 8 Backend /api/orders)
 */
export const orderService = {
  /**
   * Filtreleme, arama ve sayfalama sunucuda yapılır; tenant kapsamı da sunucuda uygulanır.
   */
  async getOrdersPaged(query: OrderPageQuery): Promise<ServiceResult<OrderPage>> {
    try {
      const response = await api.get<ServiceResult<OrderPage>>('/orders/paged', {
        params: {
          merchantId: query.merchantId || undefined,
          status: query.statuses?.length ? query.statuses : undefined,
          search: query.search?.trim() || undefined,
          sortDesc: query.sortDesc ?? true,
          page: query.page ?? 1,
          size: query.size ?? 25,
        },
        // ASP.NET dizi parametrelerini tekrarlı anahtar (status=A&status=B) olarak bekler
        paramsSerializer: { indexes: null },
      });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<OrderPage>;
      }
      return { isSuccess: false, message: 'Siparişler alınamadı.', statusCode: 500, errors: [] };
    }
  },

  /**
   * Tüm siparişleri veya filtrelenmiş siparişleri getirir.
   */
  async getAllOrders(merchantId?: string, status?: number): Promise<ServiceResult<Order[]>> {
    try {
      const params: Record<string, string | number> = {};
      if (merchantId) params.merchantId = merchantId;
      if (status !== undefined) params.status = status;

      const response = await api.get<ServiceResult<Order[]>>('/orders', { params });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<Order[]>;
      }
      return {
        isSuccess: false,
        message: 'Siparişler alınamadı.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * Siparişe kurye atar.
   */
  async assignCourier(orderId: string, courierId: string): Promise<ServiceResult<Order>> {
    try {
      const response = await api.put<ServiceResult<Order>>(`/orders/${orderId}/assign`, { courierId });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<Order>;
      }
      return {
        isSuccess: false,
        message: 'Kurye ataması başarısız oldu.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * İşletmenin bugüne ait (aktif veya bugün sonuçlanmış) siparişlerini getirir (Kanban tablosu için).
   */
  async getTodayOrders(): Promise<ServiceResult<Order[]>> {
    try {
      const response = await api.get<ServiceResult<Order[]>>('/orders/merchant/today');
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<Order[]>;
      }
      return {
        isSuccess: false,
        message: 'Günün siparişleri alınamadı.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * Hızlı Sipariş (POS) oluşturur.
   */
  async createOrder(request: CreateOrderRequest): Promise<ServiceResult<Order>> {
    try {
      const paymentMethodMapping: Record<string, number> = {
        Online: 0,
        Cash: 1,
        CreditCardOnDelivery: 2,
      };

      const payload = {
        ...request,
        paymentMethod: typeof request.paymentMethod === 'string'
          ? (paymentMethodMapping[request.paymentMethod] ?? 0)
          : request.paymentMethod,
      };

      const response = await api.post<ServiceResult<Order>>('/orders', payload);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<Order>;
      }
      return {
        isSuccess: false,
        message: 'Sipariş oluşturulamadı.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * Sipariş durumunu günceller.
   */
  async updateStatus(orderId: string, newStatus: OrderStatus | string | number): Promise<ServiceResult<Order>> {
    try {
      const numberToName: Record<number, string> = {
        0: 'Pending',
        1: 'Preparing',
        2: 'Ready',
        3: 'Assigned',
        4: 'PickedUp',
        5: 'Delivered',
        6: 'Cancelled',
      };

      let statusName: string;
      if (typeof newStatus === 'number') {
        statusName = numberToName[newStatus] ?? 'Pending';
      } else if (typeof newStatus === 'string') {
        const lower = newStatus.toLowerCase().trim();
        if (lower === 'pending' || lower === '0') statusName = 'Pending';
        else if (lower === 'preparing' || lower === 'created' || lower === '1') statusName = 'Preparing';
        else if (lower === 'ready' || lower === '2') statusName = 'Ready';
        else if (lower === 'assigned' || lower === '3') statusName = 'Assigned';
        else if (lower === 'pickedup' || lower === 'picked_up' || lower === '4') statusName = 'PickedUp';
        else if (lower === 'delivered' || lower === '5') statusName = 'Delivered';
        else if (lower === 'cancelled' || lower === 'canceled' || lower === '6') statusName = 'Cancelled';
        else statusName = newStatus;
      } else {
        statusName = 'Pending';
      }

      const response = await api.put<ServiceResult<Order>>(`/orders/${orderId}/status`, { newStatus: statusName });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<Order>;
      }
      return {
        isSuccess: false,
        message: 'Sipariş durumu güncellenemedi.',
        statusCode: 500,
        errors: [],
      };
    }
  },
};
