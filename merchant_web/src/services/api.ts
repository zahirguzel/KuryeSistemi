// src/services/api.ts

import axios from 'axios';
import { ENV } from '../config/env';
import { useAuthStore } from '../stores/authStore';

export const api = axios.create({
  baseURL: `${ENV.API_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Her isteğe güncel Bearer JWT token'ı enjekte et
api.interceptors.request.use(
  (config) => {
    // Zustand store'dan veya localStorage'dan token'ı al
    const token = useAuthStore.getState().token || localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 Unauthorized durumunda güvenli logout ve yönlendirme
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Yalnızca JWT doğrulama reddi (gövdesiz 401) oturum bitti sayılır; iş kuralı 401'leri (ServiceResult gövdeli) çıkış yaptırmaz
    const data = error.response?.data;
    const isAuthChallenge = data === undefined || data === null || data === '' ||
      (typeof data === 'object' && Object.keys(data).length === 0);
    if (error.response && error.response.status === 401 && isAuthChallenge) {
      console.warn('[API Interceptor] 401 Yetkisiz Erişim tespit edildi. Oturum kapatılıyor...');
      
      // Zustand store'daki logout aksiyonunu tetikle
      useAuthStore.getState().logout();

      // Zombi oturumları engellemek için Login sayfasına yönlendir
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
