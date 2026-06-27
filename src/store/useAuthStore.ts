// Authentication Agent — client-side auth state (Zustand), persisted to
// AsyncStorage. Tokens themselves live in the Supabase secure session store; we
// persist only the lightweight user profile here so the UI can render instantly
// on cold start before the session is re-validated.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UserProfile } from '@/src/types';

const AUTH_STORAGE_KEY = 'garap.auth.v1';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  // True until the initial session check completes (gates route guards).
  initializing: boolean;

  setUser: (user: UserProfile | null) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitializing: (initializing: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      initializing: true,

      setUser: (user) => set({ user, isAuthenticated: Boolean(user), error: null }),
      updateProfile: (patch) =>
        set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setInitializing: (initializing) => set({ initializing }),
      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
        // Clear all garap-prefixed persisted stores on logout for privacy/cache hygiene.
        void AsyncStorage.multiRemove([
          AUTH_STORAGE_KEY,
          'garap.bounty-filter.v1',
          'garap.revenue.v1',
          // UI preferences are intentionally retained (language/theme).
        ]);
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState, version) => {
        // v1 added explicit version tracking and keeps the same shape as v0.
        if (version === 0) {
          return persistedState as AuthState;
        }
        return persistedState as AuthState;
      },
      // Persist only the cached profile; transient flags are recomputed at runtime.
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
