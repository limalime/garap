// Offline banner — surfaced inside authenticated layouts when the device is offline.

import { Text, View } from 'react-native';

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  if (isOnline) return null;
  return (
    <View className="items-center bg-status-lost px-4 py-2">
      <Text className="text-xs font-semibold text-text-primary">
        You are offline. Changes will sync when connection is restored.
      </Text>
    </View>
  );
}
