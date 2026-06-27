// Bounty list card — name, platform, deadline, prize, status (Bounty Agent).

import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/src/components/common/ThemedText';
import type { Bounty } from '@/src/types';
import { colors } from '@/src/utils/colors';
import { deadlineCountdown, formatPrize } from '@/src/utils/formatting';

import { StatusBadge } from './StatusBadge';

interface BountyCardProps {
  bounty: Bounty;
  onPress?: (bounty: Bounty) => void;
}

export function BountyCard({ bounty, onPress }: BountyCardProps) {
  const countdown = deadlineCountdown(bounty.deadline);
  const isOverdue = countdown === 'Overdue';

  return (
    <Pressable
      onPress={() => onPress?.(bounty)}
      className="rounded-card bg-card p-4 active:opacity-80"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <ThemedText className="text-base font-bold text-text-primary" numberOfLines={1}>
            {bounty.bountyName}
          </ThemedText>
          <ThemedText className="mt-0.5 text-xs text-text-secondary">
            {bounty.platform === 'Other' && bounty.platformCustomName
              ? bounty.platformCustomName
              : bounty.platform}
          </ThemedText>
        </View>
        <StatusBadge status={bounty.status} />
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Ionicons
            name="time-outline"
            size={14}
            color={isOverdue ? colors.status.lost : colors.textSecondary}
          />
          <ThemedText
            className="text-xs font-semibold"
            style={{ color: isOverdue ? colors.status.lost : colors.textSecondary }}
          >
            {countdown}
          </ThemedText>
        </View>
        <ThemedText className="text-sm font-bold text-primary-light">
          {formatPrize(bounty.prizeAmount, bounty.prizeUnit)}
        </ThemedText>
      </View>
    </Pressable>
  );
}
