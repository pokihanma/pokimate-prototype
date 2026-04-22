import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'pokimate_auth_user';

export interface AuthUser {
  user_id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => {
    set({ user });
    if (user) {
      AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      AsyncStorage.removeItem(AUTH_KEY);
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    set({ user: null });
  },

  rehydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_KEY);
      if (raw) {
        set({ user: JSON.parse(raw), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
