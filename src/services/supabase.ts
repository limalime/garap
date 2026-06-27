// Supabase client configured for React Native.
// Sessions are persisted to the device Keychain/Keystore via the secure storage
// adapter (web falls back to AsyncStorage). Data Sync & Storage Agent +
// Authentication Agent depend on this.

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/src/types/database';

import { sessionStorage } from './secureStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Non-fatal during scaffolding: warn so missing .env is obvious in dev.
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your project credentials.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    // URL-based session detection is web-only; disabled for native.
    detectSessionInUrl: false,
    // PKCE is required for the OAuth deep-link code-exchange flow.
    flowType: 'pkce',
  },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
