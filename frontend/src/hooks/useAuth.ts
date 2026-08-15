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
        // En un caso real, llamaríamos a la API:
        // const data = await authService.login(credentials);
        // Simularemos un login exitoso
        if (credentials.email && credentials.password) {
          set({
            user: { id: '1', email: credentials.email, name: 'Admin', role: 'admin' },
            accessToken: 'dummy-token',
            refreshToken: 'dummy-refresh',
            isAuthenticated: true,
          });
        }
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
      doRefreshToken: async () => {
        const { refreshToken } = get();
        if (refreshToken) {
          // Simular refresh
          // const data = await authService.refresh(refreshToken);
          set({ accessToken: 'new-dummy-token' });
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
