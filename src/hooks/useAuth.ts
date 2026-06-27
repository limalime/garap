// Auth hook — exposes the persisted auth state and bootstraps the session on mount.
// Callers should invoke this inside the authenticated root layout or any screen
// that needs the current user.

import { useAuthBootstrap } from '@/src/hooks/useAuthBootstrap';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { UserProfile } from '@/src/types';

export interface UseAuthResult {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  initializing: boolean;
  logout: () => void;
}

/**
 * Subscribe to the persisted auth store and run the initial session bootstrap.
 * The persisted profile is loaded from AsyncStorage; useAuthBootstrap validates
 * the Supabase session, refreshes the token, and keeps the store in sync with
 * auth state changes.
 */
export function useAuth(): UseAuthResult {
  useAuthBootstrap();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const initializing = useAuthStore((s) => s.initializing);
  const logout = useAuthStore((s) => s.logout);

  return { user, isAuthenticated, loading, error, initializing, logout };
}
