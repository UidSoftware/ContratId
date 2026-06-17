import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, accessToken, refreshToken });
      },
      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    { name: 'contratid-auth' }
  )
);
