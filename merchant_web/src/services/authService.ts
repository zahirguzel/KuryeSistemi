// src/services/authService.ts

import { isAxiosError } from 'axios';
import { api } from './api';
import type { ServiceResult, AuthTokenDto, LoginRequest } from '../types/auth';

/**
 * Kimlik Doğrulama Servisi
 * .NET 8 Backend /api/auth/login endpoint'i ile iletişim kurar.
 */
export const authService = {
  /**
   * Kullanıcı girişi yapar ve JWT token ile kullanıcı bilgilerini döner.
   */
  async login(credentials: LoginRequest): Promise<ServiceResult<AuthTokenDto>> {
    try {
      const response = await api.post<ServiceResult<AuthTokenDto>>('/auth/login', credentials);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        // Backend'den dönen ServiceResult hata yapısı
        const backendError = error.response.data as ServiceResult<AuthTokenDto>;
        return {
          isSuccess: false,
          message: backendError.message || 'Giriş işlemi başarısız oldu.',
          statusCode: error.response.status,
          errors: backendError.errors || [],
        };
      }

      if (isAxiosError(error) && error.request && !error.response) {
        // Sunucuya ulaşılamadı (Network Hatası / Sunucu Kapalı)
        return {
          isSuccess: false,
          message: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı veya backend servisinin çalıştığını kontrol edin.',
          statusCode: 0,
          errors: ['Ağ bağlantısı hatası (Network Error).'],
        };
      }

      // Beklenmeyen hata
      return {
        isSuccess: false,
        message: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.',
        statusCode: 500,
        errors: [],
      };
    }
  },
};
