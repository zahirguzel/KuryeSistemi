// src/services/financeService.ts
//
// Kasa Mahsuplaşma ve Finansal Denetim Servisi

import { isAxiosError } from 'axios';
import { api } from './api';
import type { ServiceResult } from '../types/auth';
import type { CashSettlement } from '../types';

export interface CourierReconciliationResult {
  courierId: string;
  courierFullName: string;
  settledAmount: number;
  newBalance: number;
  reconciledAt: string;
  message: string;
}

export const financeService = {
  /**
   * Kurye ile kasa mahsuplaşmasını yapar ve bakiyesini sıfırlayıp CashSettlement kaydı oluşturur.
   * POST /api/reconciliation/couriers/{courierId}
   */
  async reconcileCourier(courierId: string): Promise<ServiceResult<CourierReconciliationResult>> {
    try {
      const response = await api.post<ServiceResult<CourierReconciliationResult>>(
        `/reconciliation/couriers/${courierId}`
      );
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<CourierReconciliationResult>;
      }
      return {
        isSuccess: false,
        message: 'Kasa mahsuplaşması tamamlanamadı.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * Giriş yapan işletmenin geçmiş kasa mahsuplaşma (audit log) kayıtlarını getirir.
   * GET /api/reconciliation/settlements
   */
  async getSettlementHistory(): Promise<ServiceResult<CashSettlement[]>> {
    try {
      const response = await api.get<ServiceResult<CashSettlement[]>>(
        '/reconciliation/settlements'
      );
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<CashSettlement[]>;
      }
      return {
        isSuccess: false,
        message: 'Geçmiş mahsuplaşma kayıtları alınamadı.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * İşletmenin (Restoran) kurye firmasıyla olan net mahsuplaşma özetini ve paket dökümünü döner.
   * Zero-Logic mimarisi: Tüm hesaplamalar backend sunucusunda optimize şekilde yapılır.
   * GET /api/reconciliation/merchant/summary
   */
  async getMerchantFinanceSummary(params?: {
    merchantId?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
  }): Promise<ServiceResult<import('../types').MerchantFinanceSummary>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.merchantId) queryParams.append('merchantId', params.merchantId);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.paymentMethod && params.paymentMethod !== 'all') {
        queryParams.append('paymentMethod', params.paymentMethod);
      }

      const queryString = queryParams.toString();
      const url = `/reconciliation/merchant/summary${queryString ? `?${queryString}` : ''}`;

      const response = await api.get<ServiceResult<import('../types').MerchantFinanceSummary>>(url);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<import('../types').MerchantFinanceSummary>;
      }
      return {
        isSuccess: false,
        message: 'Finansal mahsuplaşma özeti alınamadı.',
        statusCode: 500,
        errors: [],
      };
    }
  },
};

