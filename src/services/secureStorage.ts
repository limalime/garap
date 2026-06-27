// Secure session storage for Supabase Auth.
// Tokens are kept in the device Keychain/Keystore (encrypted at rest) via
// expo-secure-store. SecureStore caps each value at ~2KB, so values are split
// into chunks. On web (no SecureStore) we fall back to AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// SecureStore allows up to 2048 bytes per value; stay safely under it.
const CHUNK_SIZE = 1800;
const CHUNK_COUNT_SUFFIX = '__chunks';

// SecureStore keys must match [A-Za-z0-9._-]. Supabase keys are URL-safe-ish but
// can contain other characters, so sanitize defensively.
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

const secureStoreAdapter: AsyncStorageLike = {
  async getItem(key) {
    const base = safeKey(key);
    try {
      const countRaw = await SecureStore.getItemAsync(`${base}${CHUNK_COUNT_SUFFIX}`);
      if (countRaw == null) return null;
      const count = Number(countRaw);
      if (!Number.isInteger(count) || count <= 0) return null;

      const parts: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const part = await SecureStore.getItemAsync(`${base}.${i}`);
        if (part == null) return null; // corrupt/partial write — treat as missing
        parts.push(part);
      }
      return parts.join('');
    } catch (err) {
      console.warn('[secureStorage] getItem failed:', err);
      return null;
    }
  },

  async setItem(key, value) {
    const base = safeKey(key);
    try {
      // Remove any previous (possibly longer) chunk set first.
      await removeChunks(base);

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      for (let i = 0; i < chunks.length; i += 1) {
        await SecureStore.setItemAsync(`${base}.${i}`, chunks[i]);
      }
      await SecureStore.setItemAsync(`${base}${CHUNK_COUNT_SUFFIX}`, String(chunks.length));
    } catch (err) {
      console.warn('[secureStorage] setItem failed:', err);
    }
  },

  async removeItem(key) {
    try {
      await removeChunks(safeKey(key));
    } catch (err) {
      console.warn('[secureStorage] removeItem failed:', err);
    }
  },
};

async function removeChunks(base: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(`${base}${CHUNK_COUNT_SUFFIX}`);
  const count = countRaw ? Number(countRaw) : 0;
  for (let i = 0; i < count; i += 1) {
    await SecureStore.deleteItemAsync(`${base}.${i}`);
  }
  await SecureStore.deleteItemAsync(`${base}${CHUNK_COUNT_SUFFIX}`);
}

// SecureStore is unavailable on web; AsyncStorage already satisfies the interface.
export const sessionStorage: AsyncStorageLike =
  Platform.OS === 'web' ? AsyncStorage : secureStoreAdapter;
