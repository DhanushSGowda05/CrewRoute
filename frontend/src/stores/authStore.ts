import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { CONSTANTS } from '../config';

// ✅ NO service imports here — removes the circular dependency

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  getFreshToken: (() => Promise<string | null>) | null;

  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setGetFreshToken: (fn: () => Promise<string | null>) => void;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  loadAuthData: () => Promise<void>;
  // ✅ syncUserWithBackend removed — moved to _layout.tsx InitialLayout
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  getFreshToken: null,

  setUser: (user) => set({ user, isAuthenticated: true }),

  setToken: (token) => set({ token }),

  setGetFreshToken: (fn) => set({ getFreshToken: fn }),

  login: (user, token) => set({ user, token, isAuthenticated: true }),

  logout: async () => {
    await AsyncStorage.removeItem(CONSTANTS.CACHE_KEYS.USER);
    set({ user: null, token: null, isAuthenticated: false, getFreshToken: null });
  },

  loadAuthData: async () => {
    try {
      const savedUser = await AsyncStorage.getItem(CONSTANTS.CACHE_KEYS.USER);
      if (savedUser) {
        const user = JSON.parse(savedUser);
        set({ user, isAuthenticated: false, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Load auth error:', error);
      set({ isLoading: false });
    }
  },
}));