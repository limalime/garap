// Network status hook — lightweight online/offline detection without extra
// native dependencies. Uses a periodic HEAD probe so it works in Expo Go.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  checkNow: () => Promise<boolean>;
}

// A small, reliable endpoint for connectivity probes. We avoid the project
// Supabase REST URL because that can return 401 and be misclassified as offline.
const DEFAULT_PROBE_URL = 'https://www.google.com/generate_204';
const ONLINE_INTERVAL_MS = 15_000;
const OFFLINE_INTERVAL_MS = 5_000;
const FETCH_TIMEOUT_MS = 5_000;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method: 'HEAD', signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Track online/offline state using periodic connectivity probes.
 *
 * Returns:
 * - isOnline: best guess of whether the device can reach the internet
 * - isChecking: true while a probe is in flight
 * - checkNow: manually trigger a connectivity check
 *
 * Polling interval shortens when offline so we can detect recovery quickly.
 */
export function useNetworkStatus(probeUrl: string = DEFAULT_PROBE_URL): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const mounted = useRef(true);
  const onlineRef = useRef(isOnline);

  useEffect(() => {
    onlineRef.current = isOnline;
  }, [isOnline]);

  const check = useCallback(async (): Promise<boolean> => {
    if (!mounted.current) return onlineRef.current;
    setIsChecking(true);
    try {
      await fetchWithTimeout(probeUrl, FETCH_TIMEOUT_MS);
      if (mounted.current) setIsOnline(true);
      return true;
    } catch {
      if (mounted.current) setIsOnline(false);
      return false;
    } finally {
      if (mounted.current) setIsChecking(false);
    }
  }, [probeUrl]);

  useEffect(() => {
    mounted.current = true;

    // Initial check and interval polling.
    void check();
    let timer = setInterval(tick, ONLINE_INTERVAL_MS);

    async function tick() {
      const online = await check();
      clearInterval(timer);
      timer = setInterval(tick, online ? ONLINE_INTERVAL_MS : OFFLINE_INTERVAL_MS);
    }

    // Re-check immediately when the app returns to the foreground.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });

    return () => {
      mounted.current = false;
      clearInterval(timer);
      appStateSub.remove();
    };
  }, [probeUrl, check]);

  return { isOnline, isChecking, checkNow: check };
}
