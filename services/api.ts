import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
// Lazy import to avoid circular dependency — resolved at call site
let _getAuthLogout: (() => Promise<void>) | null = null;
export const setAuthLogoutFn = (fn: () => Promise<void>) => {
  _getAuthLogout = fn;
};

// Auto-detect the dev machine's IP from Expo's hostUri (works with any WiFi)
// Falls back to localhost for production builds
const getBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0]; // strip the Expo port, keep only IP
    return `http://${host}:5000/api`;
  }
  return 'http://localhost:5000/api'; // fallback
};

const BASE_URL = getBaseUrl();

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
      if (__DEV__) console.log('[API] Cache empty, reading SecureStore...');
      token = await SecureStore.getItemAsync('token');
      if (__DEV__) console.log('[API] SecureStore returned:', token ? 'YES' : 'NONE');
      if (token) currentToken = token;
    }
    if (token) {
      if (__DEV__) console.log(`[API] Attaching token to ${config.url}`);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      if (__DEV__) console.log(`[API] ⚠️ NO TOKEN ATTACHED FOR ${config.url}`);
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
      // Trigger full logout via authStore so UI redirects to login
      if (_getAuthLogout) {
        await _getAuthLogout();
      } else {
        // Fallback: at least clear persisted token
        await SecureStore.deleteItemAsync('token');
      }
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
  updatePushToken: (push_token: string) => api.put('/auth/push-token', { push_token }),
  changePassword: (newPassword: string) => api.post('/auth/change-password', { newPassword }),
};

// ─── Users ──────────────────────────────────────────────
export const usersAPI = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: number) => api.get(`/users/${id}`),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  resetPassword: (id: number, data: any) => api.post(`/users/${id}/reset-password`, data),
  createTenant: (data: any | FormData) => {
    const isFormData = data instanceof FormData;
    return api.post('/users', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
  },
  uploadProfileImage: (id: number, formData: FormData) => 
    api.post(`/users/${id}/upload-profile`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deactivate: (id: number) => api.patch(`/users/${id}/deactivate`),
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
      timeout: 60000,
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
      timeout: 60000,
    }),
  update: (id: number, formData: FormData) =>
    api.put(`/contracts/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  cancelRequest: (id: number, data: any) => api.post(`/contracts/${id}/request-termination`, data),
  getCancellationRequests: () => api.get('/contracts/cancellations'),
  updateCancellationStatus: (id: number, status: string) => {
    if (status === 'APPROVED') {
      return api.post(`/contracts/${id}/terminate`);
    } else {
      return api.post(`/contracts/${id}/reject-termination`);
    }
  },
};

// ─── Maintenance ────────────────────────────────────────
export const maintenanceAPI = {
  getAll: (params?: any) => api.get('/maintenance', { params }),
  getById: (id: number) => api.get(`/maintenance/${id}`),
  create: (formData: FormData) =>
    api.post('/maintenance', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  update: (id: number, formData: FormData) =>
    api.put(`/maintenance/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  delete: (id: number) => api.delete(`/maintenance/${id}`),
  assignStaff: (id: number, data: any) => api.post(`/maintenance/${id}/assign`, data),
  updateStatus: (id: number, data: FormData | any) =>
    api.put(`/maintenance/${id}/status`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      timeout: 60000,
    }),
};

// ─── Settings ───────────────────────────────────────────
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getUtilityRates: () => api.get('/settings/utility-rates'),
  updateUtilityRates: (data: any) => api.put('/settings/utility-rates', data),
  update: (settings: any) => api.put('/settings', { settings }),
};


// ─── Shop Types ───────────────────────────────────────
export const shopTypesAPI = {
  getAll: () => api.get('/shop-types'),
};

// ─── Food Courts ──────────────────────────────────────
export const foodCourtsAPI = {
  getAll: () => api.get('/food-courts'),
};

export default api;
