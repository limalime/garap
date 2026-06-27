// Toast host — renders queued toasts from useUIStore (UI State Agent).
// Mount once near the app root.

import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUIStore, type ToastMessage } from '@/src/store/useUIStore';
import { colors } from '@/src/utils/colors';

const ICON: Record<ToastMessage['type'], keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const ICON_COLOR: Record<ToastMessage['type'], string> = {
  success: colors.status.active,
  error: colors.status.lost,
  info: colors.status.submitted,
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  const dismissToast = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    const t = setTimeout(() => dismissToast(toast.id), 3000);
    return () => clearTimeout(t);
  }, [toast.id, dismissToast]);

  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutDown}
      className="mb-2 flex-row items-center gap-3 rounded-pill bg-card px-4 py-3"
    >
      <Ionicons name={ICON[toast.type]} size={20} color={ICON_COLOR[toast.type]} />
      <Text className="flex-1 text-sm text-text-primary">{toast.message}</Text>
    </Animated.View>
  );
}

export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      className="absolute inset-x-0 px-5"
      style={{ bottom: insets.bottom + 90 }}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
}
