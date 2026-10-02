import { api } from './api';

export interface CompanyUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string | number;
  isActive: boolean;
  lastLoginAt?: string;
  permissions: {
    viewReports: boolean;
    manageFinance: boolean;
    manageCouriers: boolean;
    manageOrders: boolean;
    manageMerchants: boolean;
    editSettings: boolean;
  };
}

export interface MyCompanyDto {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  creditBalance: number;
  creditWarningThreshold: number;
  isActive: boolean;
  blockOnZeroCredit: boolean;
  logoUrl?: string;
}

export interface CreditTransactionDto {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  notes?: string;
  orderId?: string;
  createdAt: string;
}

export interface CreateCompanyUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role?: string | number;
  canViewReports?: boolean;
  canManageFinance?: boolean;
  canManageCouriers?: boolean;
  canManageOrders?: boolean;
  canManageMerchants?: boolean;
  canEditCompanySettings?: boolean;
}

export interface UpdatePermissionsRequest {
  canViewReports?: boolean | null;
  canManageFinance?: boolean | null;
  canManageCouriers?: boolean | null;
  canManageOrders?: boolean | null;
  canManageMerchants?: boolean | null;
  canEditCompanySettings?: boolean | null;
}

export const companyService = {
  async getMyCompany(): Promise<MyCompanyDto | null> {
    try {
      const res = await api.get('/company/me');
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  async getUsers(): Promise<CompanyUserDto[]> {
    try {
      const res = await api.get('/company/users');
      return res.data?.data ?? [];
    } catch {
      return [];
    }
  },

  async createUser(data: CreateCompanyUserRequest): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await api.post('/company/users', data);
      return { success: res.data?.isSuccess ?? true, message: res.data?.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message ?? 'Kullanıcı oluşturulamadı.' };
    }
  },

  async updatePermissions(userId: string, data: UpdatePermissionsRequest): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await api.put(`/company/users/${userId}/permissions`, data);
      return { success: res.data?.isSuccess ?? true, message: res.data?.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message ?? 'İzinler güncellenemedi.' };
    }
  },

  async toggleUserActive(userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await api.patch(`/company/users/${userId}/toggle-active`);
      return { success: res.data?.isSuccess ?? true, message: res.data?.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message ?? 'Durum değiştirilemedi.' };
    }
  },

  async getCreditHistory(page = 1, size = 50): Promise<{ total: number; items: CreditTransactionDto[] }> {
    try {
      const res = await api.get(`/company/credits?page=${page}&size=${size}`);
      const data = res.data?.data;
      return { total: data?.total ?? 0, items: data?.items ?? [] };
    } catch {
      return { total: 0, items: [] };
    }
  },
};
