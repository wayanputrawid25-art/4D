'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authClient, type User } from './client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        const response = await authClient.login(email, password);
        
        if (response.success && response.data?.user) {
          set({ 
            user: response.data.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
          return { success: true };
        }
        
        set({ isLoading: false });
        return { 
          success: false, 
          error: response.error?.message || 'Login failed' 
        };
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        
        const response = await authClient.register(email, password, name);
        
        if (response.success && response.data?.user) {
          set({ 
            user: response.data.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
          return { success: true };
        }
        
        set({ isLoading: false });
        return { 
          success: false, 
          error: response.error?.message || 'Registration failed' 
        };
      },

      logout: async () => {
        await authClient.logout();
        set({ 
          user: null, 
          isAuthenticated: false 
        });
      },

      checkAuth: async () => {
        if (!authClient.isAuthenticated()) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        const response = await authClient.getCurrentUser();
        
        if (response.success && response.data?.user) {
          set({ 
            user: response.data.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } else {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      clearError: () => {},
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
