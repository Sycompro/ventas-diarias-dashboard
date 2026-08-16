import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  doRefreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: async (credentials) => {
        try {
          const data = await authService.login(credentials);
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
          });
        } catch (err: any) {
          throw new Error(err.response?.data?.message || 'Error de inicio de sesión. Revisa tus credenciales.');
        }
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
      doRefreshToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          throw new Error('No refresh token available');
        }
        try {
          const data = await authService.refresh(refreshToken);
          if (data && data.accessToken) {
            set({ accessToken: data.accessToken, isAuthenticated: true });
          } else {
            get().logout();
            throw new Error('Could not refresh access token');
          }
        } catch (err) {
          get().logout();
          throw err;
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
