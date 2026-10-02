// src/types/auth.ts

/**
 * Backend ServiceResult<T> Standart Yanıt Yapısı
 */
export interface ServiceResult<T = unknown> {
  isSuccess: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
  errors?: string[];
}

/**
 * Backend AuthTokenDto Yanıt Modeli
 */
export interface AuthTokenDto {
  token: string;
  merchantId: string;
  merchantName: string;
  email: string;
  expiresAt: string;
  courierId?: string | null;
  userId?: string;
  roles?: string[];
}

/**
 * Kullanıcı Giriş İstek Modeli
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Frontend Oturum Kullanıcı Modeli
 */
export interface AuthUser {
  id: string;
  merchantId: string;
  name: string;
  email: string;
  roles?: string[];
}
