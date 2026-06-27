// Toast helper hook (UI State Agent). IDs are derived from a counter so we
// avoid Math.random / Date.now (keeps things deterministic & testable).

import { useCallback } from 'react';

import { useUIStore, type ToastMessage } from '@/src/store/useUIStore';

let counter = 0;

export function useToast() {
  const showToast = useUIStore((s) => s.showToast);

  return useCallback(
    (type: ToastMessage['type'], message: string) => {
      counter += 1;
      showToast({ type, message }, `toast-${counter}`);
    },
    [showToast]
  );
}
