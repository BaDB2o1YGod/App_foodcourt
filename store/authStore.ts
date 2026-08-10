import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI, setApiToken } from '../services/api';

export type Role = 'ADMIN' | 'TENANT' | 'MAINTENANCE' | 'EXECUTIVE';

export interface User {
  user_id: number;
  username: string;
  role: Role;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  must_change_password?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    setApiToken(token);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    setApiToken(null);
    await SecureStore.deleteItemAsync('token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  initAuth: async () => {
    console.log('[AuthStore] initAuth called');
    try {
      const token = await SecureStore.getItemAsync('token');
      console.log('[AuthStore] SECURE STORE TOKEN:', token ? 'EXISTS' : 'NULL');
      if (token) {
        try {
          setApiToken(token);
          console.log('[AuthStore] Fetching profile...');
          const response = await authAPI.getProfile();
          const user = response.data.data;
          console.log('[AuthStore] Profile success:', user.username);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (e) {
          console.log('[AuthStore] Profile fetch failed (401), clearing token');
          // Token invalid or expired, clear it silently
          setApiToken(null);
          await SecureStore.deleteItemAsync('token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch {
      setApiToken(null);
      await SecureStore.deleteItemAsync('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
