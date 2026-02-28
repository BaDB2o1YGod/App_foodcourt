import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://192.168.1.126:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Memory cache for token so we don't await SecureStore on every single API request
let currentToken: string | null = null;

export const setApiToken = (token: string | null) => {
  currentToken = token;
};

// Request interceptor — attach JWT token
api.interceptors.request.use(
  async (config) => {
    let token = currentToken;
    if (!token) {
      console.log('[API] Cache empty, reading SecureStore...');
      token = await SecureStore.getItemAsync('token');
      console.log('[API] SecureStore returned:', token ? 'YES' : 'NONE');
      if (token) currentToken = token;
    }
    if (token) {
      console.log(`[API] Attaching token to ${config.url}`);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log(`[API] ⚠️ NO TOKEN ATTACHED FOR ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      setApiToken(null);
      await SecureStore.deleteItemAsync('token');
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────────────────
export const authAPI = {
  login: (credentials: { login: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: any) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/me', data),
};

// ─── Users ──────────────────────────────────────────────
export const usersAPI = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: number) => api.get(`/users/${id}`),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  resetPassword: (id: number, data: any) => api.post(`/users/${id}/reset-password`, data),
};

// ─── Stalls ─────────────────────────────────────────────
export const stallsAPI = {
  getAll: (params?: any) => api.get('/stalls', { params }),
  getById: (id: number) => api.get(`/stalls/${id}`),
  create: (data: any) => api.post('/stalls', data),
  update: (id: number, data: any) => api.put(`/stalls/${id}`, data),
  delete: (id: number) => api.delete(`/stalls/${id}`),
  getDashboard: () => api.get('/stalls/dashboard'),
  getMeterReadings: (id: number) => api.get(`/stalls/${id}/meters`),
  recordMeterReading: (id: number, data: any) => api.post(`/stalls/${id}/meters`, data),
};

// ─── Bills ──────────────────────────────────────────────
export const billsAPI = {
  getAll: (params?: any) => api.get('/bills', { params }),
  getById: (id: number) => api.get(`/bills/${id}`),
  create: (data: any) => api.post('/bills', data),
  update: (id: number, data: any) => api.put(`/bills/${id}`, data),
  uploadPayment: (id: number, formData: FormData) =>
    api.post(`/bills/${id}/payment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  verifyPayment: (paymentId: number, data: any) =>
    api.post(`/bills/payment/${paymentId}/verify`, data),
  getHistory: () => api.get('/bills/history'),
  calculate: (data: any) => api.post('/bills/calculate', data),
  getDueBills: () => api.get('/bills/due-soon'),
};

// ─── Contracts ──────────────────────────────────────────
export const contractsAPI = {
  getAll: (params?: any) => api.get('/contracts', { params }),
  getById: (id: number) => api.get(`/contracts/${id}`),
  create: (formData: FormData) =>
    api.post('/contracts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, formData: FormData) =>
    api.put(`/contracts/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  terminate: (id: number) => api.post(`/contracts/${id}/terminate`),
};

// ─── Maintenance ────────────────────────────────────────
export const maintenanceAPI = {
  getAll: (params?: any) => api.get('/maintenance', { params }),
  getById: (id: number) => api.get(`/maintenance/${id}`),
  create: (formData: FormData) =>
    api.post('/maintenance', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, formData: FormData) =>
    api.put(`/maintenance/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/maintenance/${id}`),
  assignStaff: (id: number, data: any) => api.post(`/maintenance/${id}/assign`, data),
  updateStatus: (id: number, data: any) => api.put(`/maintenance/${id}/status`, data),
};

// ─── Settings ───────────────────────────────────────────
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getUtilityRates: () => api.get('/settings/utility-rates'),
  updateUtilityRates: (data: any) => api.put('/settings/utility-rates', data),
  update: (settings: any) => api.put('/settings', { settings }),
};

// ─── Dishware ───────────────────────────────────────────
export const dishwareAPI = {
  getAll: (params?: any) => api.get('/dishware', { params }),
  create: (data: any) => api.post('/dishware', data),
  delete: (id: number) => api.delete(`/dishware/${id}`),
  getSummary: (params?: any) => api.get('/dishware/summary', { params }),
  approve: (id: number) => api.patch(`/dishware/${id}/approve`),
  reject: (id: number, data: any) => api.patch(`/dishware/${id}/reject`, data),
};

export const dishwareTypeAPI = {
  getAll: (params?: any) => api.get('/dishware-types', { params }),
  create: (data: any) => api.post('/dishware-types', data),
  update: (id: number, data: any) => api.patch(`/dishware-types/${id}`, data),
  delete: (id: number) => api.delete(`/dishware-types/${id}`),
};

export default api;
