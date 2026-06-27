// Color-coded status pill (Bounty / Search agents).

import { Text, View } from 'react-native';

import type { BountyStatus } from '@/src/types';
import { statusColor } from '@/src/utils/colors';

export function StatusBadge({ status }: { status: BountyStatus }) {
  const color = statusColor(status);
  return (
    <View
      className="self-start rounded-pill px-3 py-1"
      style={{ backgroundColor: `${color}22` }}
    >
      <Text className="text-xs font-bold" style={{ color }}>
        {status}
      </Text>
    </View>
  );
}
