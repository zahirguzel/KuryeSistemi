// src/services/courierService.ts
//
// İşletmeye ait kuryeleri REST API'den çeker.
// Başlangıç verisi olarak courierStore'u doldurur.

import { api } from './api';
import type { ServiceResult } from '../types/auth';
import type { CourierState } from '../types/courier';

// Backend CourierDto → Frontend CourierState dönüşüm tip guard
interface BackendCourierDto {
  id: string;
  merchantId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  vehicleType: string;
  licensePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  isAvailable: boolean;
  currentBalance?: number;
  createdAt: string;
  isOnline?: boolean;
  IsOnline?: boolean;
  currentLatitude?: number | null;
  CurrentLatitude?: number | null;
  currentLongitude?: number | null;
  CurrentLongitude?: number | null;
  lastLocationUpdate?: string | null;
  LastLocationUpdate?: string | null;
}

function mapToCourierState(dto: BackendCourierDto): CourierState {
  const lat = dto.currentLatitude ?? dto.CurrentLatitude ?? null;
  const lng = dto.currentLongitude ?? dto.CurrentLongitude ?? null;
  const isOnline = Boolean(dto.isOnline ?? dto.IsOnline ?? (lat !== null && lng !== null));
  const rawDate = dto.lastLocationUpdate ?? dto.LastLocationUpdate;

  return {
    id: dto.id,
    merchantId: dto.merchantId,
    firstName: dto.firstName,
    lastName: dto.lastName,
    phoneNumber: dto.phoneNumber,
    email: dto.email,
    vehicleType: dto.vehicleType,
    licensePlate: dto.licensePlate,
    vehicleBrand: dto.vehicleBrand,
    vehicleModel: dto.vehicleModel,
    isAvailable: dto.isAvailable,
    currentBalance: dto.currentBalance,
    lat,
    lng,
    speed: 0,
    lastUpdate: rawDate ? new Date(rawDate) : null,
    isOnline,
  };
}

export const courierService = {
  /**
   * Tüm kuryeleri çeker (Kurye Firması Paneli için).
   * GET /api/couriers
   */
  async getAllCouriers(): Promise<ServiceResult<CourierState[]>> {
    try {
      const response = await api.get<ServiceResult<BackendCourierDto[]>>('/couriers');
      const result = response.data;

      if (result.isSuccess && result.data) {
        return {
          isSuccess: true,
          data: result.data.map(mapToCourierState),
          message: result.message,
          statusCode: result.statusCode,
        };
      }

      return {
        isSuccess: false,
        message: result.message ?? 'Kurye listesi alınamadı.',
        statusCode: result.statusCode,
        errors: result.errors ?? [],
      };
    } catch {
      return {
        isSuccess: false,
        message: 'Sunucuya bağlanırken hata oluştu.',
        statusCode: 0,
        errors: [],
      };
    }
  },

  /**
   * İşletmeye ait kuryeleri Backend'den çeker.
   * GET /api/couriers?merchantId={merchantId}
   */
  async getCouriersByMerchant(
    merchantId: string
  ): Promise<ServiceResult<CourierState[]>> {
    try {
      const response = await api.get<ServiceResult<BackendCourierDto[]>>(
        '/couriers',
        { params: { merchantId } }
      );

      const result = response.data;

      if (result.isSuccess && result.data) {
        return {
          isSuccess: true,
          data: result.data.map(mapToCourierState),
          message: result.message,
          statusCode: result.statusCode,
        };
      }

      return {
        isSuccess: false,
        message: result.message ?? 'Kurye listesi alınamadı.',
        statusCode: result.statusCode,
        errors: result.errors ?? [],
      };
    } catch {
      return {
        isSuccess: false,
        message: 'Sunucuya bağlanırken hata oluştu.',
        statusCode: 0,
        errors: [],
      };
    }
  },

  /**
   * Yeni bir kurye kaydı oluşturur.
   * POST /api/couriers
   */
  async createCourier(courierData: {
    merchantId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    vehicleType?: number;
    licensePlate?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
  }): Promise<ServiceResult<CourierState>> {
    try {
      const response = await api.post<ServiceResult<BackendCourierDto>>('/couriers', courierData);
      const result = response.data;
      if (result.isSuccess && result.data) {
        return {
          isSuccess: true,
          data: mapToCourierState(result.data),
          message: result.message,
          statusCode: result.statusCode,
        };
      }
      return {
        isSuccess: false,
        message: result.message ?? 'Kurye oluşturulamadı.',
        statusCode: result.statusCode,
        errors: result.errors ?? [],
      };
    } catch {
      return {
        isSuccess: false,
        message: 'Sunucuya bağlanırken hata oluştu.',
        statusCode: 0,
        errors: [],
      };
    }
  },

  /**
   * Kurye bilgilerini günceller.
   * PUT /api/couriers/{id}
   */
  async updateCourier(
    id: string,
    courierData: Partial<{
      merchantId: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      email: string;
      vehicleType: number;
      licensePlate: string;
      vehicleBrand: string;
      vehicleModel: string;
      isAvailable: boolean;
    }>
  ): Promise<ServiceResult<CourierState>> {
    try {
      const response = await api.put<ServiceResult<BackendCourierDto>>(`/couriers/${id}`, courierData);
      const result = response.data;
      if (result.isSuccess && result.data) {
        return {
          isSuccess: true,
          data: mapToCourierState(result.data),
          message: result.message,
          statusCode: result.statusCode,
        };
      }
      return {
        isSuccess: false,
        message: result.message ?? 'Kurye güncellenemedi.',
        statusCode: result.statusCode,
        errors: result.errors ?? [],
      };
    } catch {
      return {
        isSuccess: false,
        message: 'Sunucuya bağlanırken hata oluştu.',
        statusCode: 0,
        errors: [],
      };
    }
  },

  /**
   * Kuryeyi siler.
   * DELETE /api/couriers/{id}
   */
  async deleteCourier(id: string): Promise<ServiceResult<boolean>> {
    try {
      const response = await api.delete<ServiceResult<boolean>>(`/couriers/${id}`);
      return response.data;
    } catch {
      return {
        isSuccess: false,
        message: 'Sunucuya bağlanırken hata oluştu.',
        statusCode: 0,
        errors: [],
      };
    }
  },
};
