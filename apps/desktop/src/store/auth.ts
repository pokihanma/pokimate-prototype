import { create } from 'zustand';
import type { SessionInfo } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';

const TOKEN_KEY = 'pokimate_session_token';
const DEVICE_NAME = 'PokiMate-Desktop';

interface AuthState {
  user: SessionInfo | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: SessionInfo | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (username: string, password: string) => Promise<SessionInfo>;
  logout: () => Promise<void>;
  impersonate: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  setUser: (user) => set({ user }),

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
      else window.sessionStorage.removeItem(TOKEN_KEY);
    }
    set({ token });
  },

  setLoading: (isLoading) => set({ isLoading }),

  // Flat params match auth_login(username, password, device_name) in Rust.
  // rename_all = "snake_case" is set on the Rust command so JS passes snake_case keys.
  login: async (username, password) => {
    const result = await invokeWithToast<SessionInfo>('auth_login', {
      username,
      password,
      device_name: DEVICE_NAME,
    });
    set({ user: result, token: result.session_id });
    get().setToken(result.session_id);
    return result;
  },

  logout: async () => {
    const { token } = get();
    if (token) {
      await invokeWithToast('auth_logout', { session_id: token });
    }
    set({ user: null, token: null });
    get().setToken(null);
  },

  // Placeholder — full implementation in Phase 7 Admin panel.
  impersonate: () => {},

  hydrate: async () => {
    set({ isLoading: true });
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ user: null, token: null, isLoading: false });
      return;
    }
    try {
      const session = await invokeWithToast<SessionInfo | null>('auth_get_session', {
        session_id: token,
      });
      if (session) {
        set({ user: session, token: session.session_id });
      } else {
        set({ user: null, token: null });
        get().setToken(null);
      }
    } catch {
      // Tauri not available or session expired — clear and show login
      set({ user: null, token: null });
      get().setToken(null);
    } finally {
      set({ isLoading: false });
    }
  },
}));

export function useIsAdmin() {
  return useAuthStore((s) => s.user?.role === 'admin');
}
