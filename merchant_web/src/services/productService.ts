// src/services/productService.ts
import { isAxiosError } from 'axios';
import { api } from './api';
import type { ServiceResult } from '../types/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  category: string;
  price: number;
  description?: string | null;
  isAvailable: boolean;
  displayOrder: number;
}

export interface CreateProductRequest {
  name: string;
  category: string;
  price: number;
  description?: string;
  isAvailable?: boolean;
  displayOrder?: number;
}

export interface BulkCreateProductsRequest {
  merchantId?: string;
  products: CreateProductRequest[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const productService = {
  /**
   * İşletmenin ürün listesini getirir (kategori ve availability filtresi opsiyonel).
   */
  async getProducts(
    merchantId?: string,
    category?: string,
    onlyAvailable?: boolean,
  ): Promise<ServiceResult<Product[]>> {
    try {
      const params: Record<string, string | boolean> = {};
      if (merchantId) params.merchantId = merchantId;
      if (category) params.category = category;
      if (onlyAvailable !== undefined) params.onlyAvailable = onlyAvailable;

      const response = await api.get<ServiceResult<Product[]>>('/products', { params });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<Product[]>;
      }
      return { isSuccess: false, message: 'Ürünler alınamadı.', statusCode: 500, errors: [] };
    }
  },

  /**
   * Mevcut kategorileri getirir.
   */
  async getCategories(): Promise<ServiceResult<string[]>> {
    try {
      const response = await api.get<ServiceResult<string[]>>('/products/categories');
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<string[]>;
      }
      return { isSuccess: false, message: 'Kategoriler alınamadı.', statusCode: 500, errors: [] };
    }
  },

  /**
   * Tek ürün ekler.
   */
  async createProduct(request: CreateProductRequest): Promise<ServiceResult<Product>> {
    try {
      const response = await api.post<ServiceResult<Product>>('/products', request);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<Product>;
      }
      return { isSuccess: false, message: 'Ürün eklenemedi.', statusCode: 500, errors: [] };
    }
  },

  /**
   * Excel'den gelen ürünleri toplu olarak backend'e kaydeder.
   */
  async bulkCreateProducts(request: BulkCreateProductsRequest): Promise<ServiceResult<void>> {
    try {
      const response = await api.post<ServiceResult<void>>('/products/bulk', request);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<void>;
      }
      return { isSuccess: false, message: 'Toplu ürün yüklenemedi.', statusCode: 500, errors: [] };
    }
  },

  /**
   * Ürün günceller.
   */
  async updateProduct(
    id: string,
    request: Partial<CreateProductRequest> & { isAvailable?: boolean },
  ): Promise<ServiceResult<Product>> {
    try {
      const response = await api.put<ServiceResult<Product>>(`/products/${id}`, request);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<Product>;
      }
      return { isSuccess: false, message: 'Ürün güncellenemedi.', statusCode: 500, errors: [] };
    }
  },

  /**
   * Ürün siler (soft-delete).
   */
  async deleteProduct(id: string): Promise<ServiceResult<void>> {
    try {
      const response = await api.delete<ServiceResult<void>>(`/products/${id}`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        return error.response.data as ServiceResult<void>;
      }
      return { isSuccess: false, message: 'Ürün silinemedi.', statusCode: 500, errors: [] };
    }
  },
};
