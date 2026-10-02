// src/services/merchantService.ts

import { isAxiosError } from 'axios';
import { api } from './api';
import type { ServiceResult } from '../types/auth';
import { DispatchMode, ReconciliationPeriod } from '../types';

export interface UpdateMerchantSettingsRequest {
  name?: string;
  phoneNumber?: string;
  address?: string;
  isOpen?: boolean;
  latitude?: number;
  longitude?: number;
  workingHours?: string;
  dispatchMode?: DispatchMode;
  defaultPackageFee?: number;
  reconciliationPeriod?: ReconciliationPeriod;
  hexagonSizeMeters?: number;
  maxCourierDistanceKm?: number;
  maxOrdersPerTour?: number;
  orderBatchingTimeMinutes?: number;
  crossRestaurantDistanceMeters?: number;
}

export interface MerchantDto {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  isActive: boolean;
  isOpen: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  defaultPackageFee: number;
  dispatchMode: DispatchMode;
  reconciliationPeriod: ReconciliationPeriod;
  hexagonSizeMeters?: number;
  maxCourierDistanceKm?: number;
  maxOrdersPerTour?: number;
  orderBatchingTimeMinutes?: number;
  crossRestaurantDistanceMeters?: number;
}

export interface CreateMerchantRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  address?: string;
  defaultPackageFee?: number;
  dispatchMode?: DispatchMode;
  reconciliationPeriod?: ReconciliationPeriod;
  latitude?: number;
  longitude?: number;
}

/**
 * İşletme Servisi (.NET 8 Backend /api/merchants)
 */
export const merchantService = {
  /**
   * Tüm işletmeleri getirir (Kurye Firması Paneli için).
   */
  async getAllMerchants(): Promise<ServiceResult<MerchantDto[]>> {
    try {
      const response = await api.get<ServiceResult<MerchantDto[]>>('/merchants');
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<MerchantDto[]>;
      }
      return {
        isSuccess: false,
        message: 'İşletmeler sunucudan alınamadı.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * Yeni işletme / restoran kaydı oluşturur.
   */
  async createMerchant(request: CreateMerchantRequest): Promise<ServiceResult<MerchantDto>> {
    try {
      const response = await api.post<ServiceResult<MerchantDto>>('/merchants', request);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<MerchantDto>;
      }
      return {
        isSuccess: false,
        message: 'İşletme kaydı oluşturulurken hata meydana geldi.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * İşletmeyi siler / pasife alır.
   */
  async deleteMerchant(merchantId: string): Promise<ServiceResult<boolean>> {
    try {
      const response = await api.delete<ServiceResult<boolean>>(`/merchants/${merchantId}`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<boolean>;
      }
      return {
        isSuccess: false,
        message: 'İşletme silinirken hata oluştu.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * İşletmenin profil ve ayar bilgilerini getirir.
   */
  async getSettings(merchantId: string): Promise<ServiceResult<MerchantDto>> {
    try {
      const response = await api.get<ServiceResult<MerchantDto>>(`/merchants/${merchantId}`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<MerchantDto>;
      }
      return {
        isSuccess: false,
        message: 'İşletme ayarları sunucudan alınamadı.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * İşletme ayarlarını (GPS konumu, açık/kapalı durumu, adres vb.) günceller.
   */
  async updateSettings(
    merchantId: string,
    request: UpdateMerchantSettingsRequest
  ): Promise<ServiceResult<MerchantDto>> {
    try {
      const response = await api.put<ServiceResult<MerchantDto>>(
        `/merchants/${merchantId}/settings`,
        request
      );
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<MerchantDto>;
      }
      return {
        isSuccess: false,
        message: 'Ayarlar güncellenirken sunucu hatası oluştu.',
        statusCode: 500,
        errors: [],
      };
    }
  },

  /**
   * Kurye gün sonu nakit kasa mahsuplaşmasını yapar ve bakiyeyi sıfırlar.
   */
  async reconcileCourier(courierId: string): Promise<ServiceResult<{
    courierId: string;
    courierFullName: string;
    settledAmount: number;
    newBalance: number;
    reconciledAt: string;
    message: string;
  }>> {
    try {
      const response = await api.post<ServiceResult<{
        courierId: string;
        courierFullName: string;
        settledAmount: number;
        newBalance: number;
        reconciledAt: string;
        message: string;
      }>>(`/reconciliation/couriers/${courierId}`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data;
      }
      return {
        isSuccess: false,
        message: 'Kasa mahsuplaşması sırasında sunucu hatası oluştu.',
        statusCode: 500,
        errors: [],
      };
    }
  },
};
