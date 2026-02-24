import { create } from 'zustand';
import type { Account } from '@atlasmail/shared';

interface AuthState {
  account: Account | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAccount: (account: Account | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  account: null,
  isAuthenticated: false,
  isLoading: true,
  setAccount: (account) => set({ account, isAuthenticated: !!account, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    localStorage.removeItem('atlasmail_token');
    localStorage.removeItem('atlasmail_refresh_token');
    set({ account: null, isAuthenticated: false });
  },
}));
