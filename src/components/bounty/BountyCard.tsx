// Bounty list card with swipe actions (Bounty + Search agents).
// Swipe left to reveal Edit / Archive / Delete; tap to open the detail modal.

import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { StatusBadge } from '@/src/components/common/StatusBadge';
import type { Bounty } from '@/src/types';
import { colors } from '@/src/utils/colors';
import { deadlineCountdown, formatPrize } from '@/src/utils/formatting';

interface BountyCardProps {
  bounty: Bounty;
  onPress?: (bounty: Bounty) => void;
  onEdit?: (bounty: Bounty) => void;
  onDelete?: (bounty: Bounty) => void;
  onArchive?: (bounty: Bounty) => void;
  onStatusChange?: (bounty: Bounty) => void;
}

function Action({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-full w-[72px] items-center justify-center gap-1"
      style={{ backgroundColor: color }}
    >
      <Ionicons name={icon} size={20} color="#FFFFFF" />
      <Text className="text-[10px] font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

export function BountyCard({
  bounty,
  onPress,
  onEdit,
  onDelete,
  onArchive,
  onStatusChange,
}: BountyCardProps) {
  const countdown = deadlineCountdown(bounty.deadline);
  const isOverdue = countdown === 'Overdue';

  const rightActions = () => (
    <View className="flex-row overflow-hidden rounded-r-card">
      {onEdit ? (
        <Action icon="create-outline" label="Edit" color={colors.status.submitted} onPress={() => onEdit(bounty)} />
      ) : null}
      {onArchive ? (
        <Action icon="archive-outline" label="Archive" color={colors.status.pending} onPress={() => onArchive(bounty)} />
      ) : null}
      {onDelete ? (
        <Action icon="trash-outline" label="Delete" color={colors.status.lost} onPress={() => onDelete(bounty)} />
      ) : null}
    </View>
  );

  return (
    <ReanimatedSwipeable
      renderRightActions={onEdit || onDelete || onArchive ? rightActions : undefined}
      overshootRight={false}
      friction={2}
    >
      <Pressable
        onPress={() => onPress?.(bounty)}
        className="rounded-card bg-card p-4 active:opacity-80"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-bold text-text-primary" numberOfLines={1}>
              {bounty.bountyName}
            </Text>
            <View className="mt-1 flex-row items-center gap-2">
              <View className="rounded-pill bg-white/5 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-text-secondary">{bounty.platform}</Text>
              </View>
              <View className="rounded-pill bg-primary/15 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-primary-light">{bounty.category}</Text>
              </View>
            </View>
          </View>
          <Pressable onPress={() => onStatusChange?.(bounty)} hitSlop={6}>
            <StatusBadge status={bounty.status} />
          </Pressable>
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Ionicons
              name="time-outline"
              size={14}
              color={isOverdue ? colors.status.lost : colors.textSecondary}
            />
            <Text
              className="text-xs font-semibold"
              style={{ color: isOverdue ? colors.status.lost : colors.textSecondary }}
            >
              {countdown}
            </Text>
          </View>
          <Text className="text-sm font-bold text-primary-light">
            {formatPrize(bounty.prizeAmount, bounty.prizeUnit)}
          </Text>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
