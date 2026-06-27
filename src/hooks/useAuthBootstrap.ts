// Session lifecycle for the Authentication Agent.
// - Loads the persisted session on cold start and validates the user.
// - Subscribes to Supabase auth-state changes and mirrors them into the store.
// - Drives token auto-refresh based on app foreground/background (AppState).
// - Completes OAuth/magic-link flows that resume the app via a deep link.

import type { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';

import { exchangeUrlForSession, getUserProfile, onAuthStateChange } from '@/src/services/auth';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { UserProfile } from '@/src/types';

// Build a UserProfile from the session's user (used before the DB row is fetched).
function profileFromSession(session: Session): UserProfile {
  const u = session.user;
  return {
    id: u.id,
    email: u.email ?? '',
    displayName: (u.user_metadata?.display_name as string | undefined) ?? undefined,
    avatarUrl: (u.user_metadata?.avatar_url as string | undefined) ?? undefined,
    createdAt: u.created_at,
  };
}

export function useAuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    let mounted = true;

    // Reconcile a session into the store: set the basic profile immediately, then
    // enrich from the public.users row (display name / avatar) in the background.
    async function applySession(session: Session | null) {
      if (!mounted) return;
      if (!session) {
        setUser(null);
        return;
      }
      setUser(profileFromSession(session));
      try {
        const profile = await getUserProfile(session.user.id);
        if (mounted && profile) setUser(profile);
      } catch {
        // Non-fatal: keep the session-derived profile.
      }
    }

    // 1. Initial load.
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        await applySession(data.session);
      } finally {
        if (mounted) setInitializing(false);
      }
    })();

    // 2. Subscribe to auth changes (sign in/out, token refresh, user updates).
    const subscription = onAuthStateChange((session) => {
      void applySession(session);
    });

    // 3. Foreground/background token auto-refresh.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();

    // 4. Complete OAuth flows that resumed the app via deep link.
    async function handleUrl(url: string | null) {
      if (!url || (!url.includes('code=') && !url.includes('error'))) return;
      try {
        await exchangeUrlForSession(url);
      } catch (err) {
        console.warn('[auth] Deep-link session exchange failed:', err);
      }
    }
    Linking.getInitialURL().then(handleUrl);
    const linkSub = Linking.addEventListener('url', ({ url }) => void handleUrl(url));

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appStateSub.remove();
      linkSub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [setUser, setInitializing]);
}
