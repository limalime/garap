// Authentication Agent — Supabase Auth wrappers.
// Email/password, OAuth (Google/GitHub) via deep link, password reset, and
// profile management. The OAuth flow uses PKCE: we open the provider in a system
// browser and exchange the returned `code` for a session.

import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';

import type { UserProfile } from '@/src/types';
import type { Database } from '@/src/types/database';

import { supabase } from './supabase';

type UsersUpdate = Database['public']['Tables']['users']['Update'];

// Ensures the auth browser popup is dismissed correctly after redirect (no-op on
// native, required on web).
WebBrowser.maybeCompleteAuthSession();

// Deep link Supabase redirects back to. Matches the "garap" scheme in app.json.
// expo-auth-session resolves this to garap:// (standalone) or the Expo Go proxy
// URL during development.
const redirectTo = makeRedirectUri({ scheme: 'garap', path: 'auth-callback' });

// --------------------------------------------------------------------------
// Email / password
// --------------------------------------------------------------------------
export async function signUpEmail(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { display_name: displayName } : undefined,
      emailRedirectTo: redirectTo,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// --------------------------------------------------------------------------
// OAuth (Google / GitHub) — PKCE deep-link flow
// --------------------------------------------------------------------------
async function signInWithProvider(provider: 'google' | 'github'): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Could not start OAuth flow.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Sign in was cancelled.');
  }
  if (result.type !== 'success' || !result.url) {
    throw new Error('OAuth sign in failed.');
  }

  return exchangeUrlForSession(result.url);
}

/**
 * Complete a PKCE flow from a redirect URL (handles both the `?code=` query form
 * and provider errors). Exported so a deep-link listener can finish a flow that
 * resumed the app from the background.
 */
export async function exchangeUrlForSession(url: string): Promise<Session> {
  const parsed = new URL(url);
  const errorDescription = parsed.searchParams.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  const code = parsed.searchParams.get('code');
  if (!code) throw new Error('No authorization code returned.');

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  if (!data.session) throw new Error('Failed to establish a session.');
  return data.session;
}

export function signInGoogle() {
  return signInWithProvider('google');
}

export function signInGitHub() {
  return signInWithProvider('github');
}

// --------------------------------------------------------------------------
// Password reset
// --------------------------------------------------------------------------
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

// --------------------------------------------------------------------------
// Session / sign out
// --------------------------------------------------------------------------
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** The currently authenticated user, validated against the server. */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription;
}

// --------------------------------------------------------------------------
// Profile
// --------------------------------------------------------------------------
/**
 * Update the user's display name and/or profile picture. Writes to both auth
 * user_metadata (so it travels with the JWT) and the public.users row used by
 * the rest of the app.
 */
export async function updateUserProfile(
  displayName?: string,
  profilePicture?: string
): Promise<UserProfile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw userError ?? new Error('Not authenticated.');

  // Only include defined fields so callers can update one without clobbering the other.
  const metadata: Record<string, string> = {};
  if (displayName !== undefined) metadata.display_name = displayName;
  if (profilePicture !== undefined) metadata.avatar_url = profilePicture;

  if (Object.keys(metadata).length > 0) {
    const { error } = await supabase.auth.updateUser({ data: metadata });
    if (error) throw error;
  }

  const profilePatch: UsersUpdate = {};
  if (displayName !== undefined) profilePatch.display_name = displayName;
  if (profilePicture !== undefined) profilePatch.profile_picture_url = profilePicture;

  const { data, error } = await supabase
    .from('users')
    .update(profilePatch)
    .eq('id', user.id)
    .select()
    .single();
  if (error) throw error;

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name ?? undefined,
    avatarUrl: data.profile_picture_url ?? undefined,
    createdAt: data.created_at,
  };
}

/** Fetch the public.users profile row for a user id. */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name ?? undefined,
    avatarUrl: data.profile_picture_url ?? undefined,
    createdAt: data.created_at,
  };
}
