import { create } from 'zustand';
import { fetchCurrentUserSession } from '../services/api';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'SUPER_ADMIN' | 'SHOP_OWNER';
  storeId?: string | null;
}

export interface StoreProfile {
  id: string;
  name: string;
  tagline?: string;
  logoUrl?: string;
  gstin?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

interface AuthState {
  token: string | null;
  user: UserSession | null;
  store: StoreProfile | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  authView: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
  
  setAuth: (token: string, user: UserSession, store?: StoreProfile) => void;
  logout: () => void;
  setAuthView: (view: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD') => void;
  initSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('dukaanpro_token') : null,
  user: typeof localStorage !== 'undefined' && localStorage.getItem('dukaanpro_user')
    ? JSON.parse(localStorage.getItem('dukaanpro_user')!)
    : null,
  store: typeof localStorage !== 'undefined' && localStorage.getItem('dukaanpro_store')
    ? JSON.parse(localStorage.getItem('dukaanpro_store')!)
    : null,
  isAuthenticated: typeof localStorage !== 'undefined' ? !!localStorage.getItem('dukaanpro_token') : false,
  isInitializing: true,
  authView: 'LOGIN',

  setAuth: (token, user, store) => {
    localStorage.setItem('dukaanpro_token', token);
    localStorage.setItem('dukaanpro_user', JSON.stringify(user));
    if (store) {
      localStorage.setItem('dukaanpro_store', JSON.stringify(store));
    }
    set({
      token,
      user,
      store: store || null,
      isAuthenticated: true,
      isInitializing: false
    });
  },

  logout: () => {
    localStorage.removeItem('dukaanpro_token');
    localStorage.removeItem('dukaanpro_user');
    localStorage.removeItem('dukaanpro_store');
    set({
      token: null,
      user: null,
      store: null,
      isAuthenticated: false,
      isInitializing: false,
      authView: 'LOGIN'
    });
  },

  setAuthView: (authView) => set({ authView }),

  initSession: async () => {
    const token = localStorage.getItem('dukaanpro_token');
    if (!token) {
      set({ isInitializing: false, isAuthenticated: false });
      return;
    }

    try {
      const res = await fetchCurrentUserSession();
      if (res && res.success && res.user) {
        set({
          user: res.user,
          store: res.store || null,
          isAuthenticated: true,
          isInitializing: false
        });
      } else {
        // Token expired or invalid
        localStorage.removeItem('dukaanpro_token');
        localStorage.removeItem('dukaanpro_user');
        localStorage.removeItem('dukaanpro_store');
        set({ token: null, user: null, store: null, isAuthenticated: false, isInitializing: false });
      }
    } catch (err) {
      set({ isInitializing: false });
    }
  }
}));
