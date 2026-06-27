// Bounty detail route screen — read-only overview with actions.
// Presented as a modal via Expo Router (app/bounty/[id].tsx).

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/src/components/common/ThemedText';

import { useBountyActions } from '@/src/hooks/useBountyActions';
import { useToast } from '@/src/hooks/useToast';
import { useBountyStore } from '@/src/store/useBountyStore';
import { nextStatuses } from '@/src/utils/bountyStatus';
import { colors, statusColor } from '@/src/utils/colors';
import { deadlineCountdown, formatPrize, formatShortDate } from '@/src/utils/formatting';

export function BountyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { updateStatus, deleteBounty } = useBountyActions();
  const bounty = useBountyStore((s) => s.bounties.find((b) => b.id === id));

  const statusOptions = useMemo(() => (bounty ? nextStatuses(bounty.status) : []), [bounty]);

  if (!bounty) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <ThemedText className="mt-4 text-center text-base text-text-secondary">Bounty not found.</ThemedText>
        <Pressable onPress={router.back} className="mt-6 rounded-pill bg-primary px-6 py-3">
          <ThemedText className="text-base font-bold text-text-primary">Go back</ThemedText>
        </Pressable>
      </View>
    );
  }

  const handleShare = async () => {
    const platformLabel =
      bounty.platform === 'Other' && bounty.platformCustomName
        ? bounty.platformCustomName
        : bounty.platform;
    const lines = [
      `🏆 ${bounty.bountyName}`,
      `Platform: ${platformLabel} · Category: ${bounty.category}`,
      `Prize: ${formatPrize(bounty.prizeAmount, bounty.prizeUnit)}`,
      `Status: ${bounty.status}`,
      bounty.sourceLink ? `Source: ${bounty.sourceLink}` : '',
      bounty.submissionLink ? `Submission: ${bounty.submissionLink}` : '',
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // user dismissed the share sheet
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete bounty', `Delete “${bounty.bountyName}”? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBounty(bounty.id);
            toast('success', 'Bounty deleted');
            router.back();
          } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Delete failed');
          }
        },
      },
    ]);
  };

  const handleStatusChange = async (status: string) => {
    if (status === bounty.status) return;
    try {
      await updateStatus(bounty.id, status as typeof bounty.status);
      toast('success', `Status updated to ${status}`);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-3">
        <Pressable onPress={router.back} hitSlop={8}>
          <ThemedText className="text-base text-text-secondary">Close</ThemedText>
        </Pressable>
        <ThemedText className="text-base font-bold text-text-primary" numberOfLines={1}>
          Bounty Details
        </ThemedText>
        <View className="flex-row items-center gap-4">
          <Pressable onPress={handleShare} hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={colors.status.lost} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        style={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title + status badge */}
        <View className="mb-4 rounded-card bg-card p-5">
          <View className="mb-2 flex-row items-center gap-2">
            <View
              className="rounded-pill px-2.5 py-1"
              style={{ backgroundColor: statusColor(bounty.status) + '22' }}
            >
              <ThemedText className="text-xs font-bold" style={{ color: statusColor(bounty.status) }}>
                {bounty.status}
              </ThemedText>
            </View>
            <ThemedText className="text-xs text-text-secondary">
              {bounty.platform === 'Other' && bounty.platformCustomName
                ? bounty.platformCustomName
                : bounty.platform}
            </ThemedText>
          </View>
          <ThemedText className="text-2xl font-bold text-text-primary">{bounty.bountyName}</ThemedText>
          <ThemedText className="mt-1 text-sm text-text-secondary">{bounty.category}</ThemedText>
        </View>

        {/* Prize + deadline */}
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-card bg-card p-4">
            <ThemedText className="mb-1 text-xs text-text-secondary">Prize</ThemedText>
            <ThemedText className="text-lg font-bold text-text-primary">
              {formatPrize(bounty.prizeAmount, bounty.prizeUnit)}
            </ThemedText>
            {bounty.prizeInUSD ? (
              <ThemedText className="mt-0.5 text-xs text-text-secondary">
                ≈ {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(bounty.prizeInUSD)}
              </ThemedText>
            ) : null}
          </View>
          <View className="flex-1 rounded-card bg-card p-4">
            <ThemedText className="mb-1 text-xs text-text-secondary">Deadline</ThemedText>
            <ThemedText className="text-lg font-bold text-text-primary">
              {formatShortDate(bounty.deadline)}
            </ThemedText>
            <ThemedText className="mt-0.5 text-xs text-text-secondary">
              {deadlineCountdown(bounty.deadline)}
            </ThemedText>
          </View>
        </View>

        {/* Status changer */}
        <View className="mb-4 rounded-card bg-card p-4">
          <ThemedText className="mb-2 text-xs text-text-secondary">Move status to</ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {statusOptions.map((status) => (
              <Pressable
                key={status}
                onPress={() => handleStatusChange(status)}
                className="rounded-pill px-4 py-2"
                style={{ backgroundColor: statusColor(status) + '22' }}
              >
                <ThemedText className="text-sm font-semibold" style={{ color: statusColor(status) }}>
                  {status}
                </ThemedText>
              </Pressable>
            ))}
            {statusOptions.length === 0 ? (
              <ThemedText className="text-sm text-text-secondary">No status changes available.</ThemedText>
            ) : null}
          </View>
        </View>

        {/* Source link */}
        {bounty.sourceLink ? (
          <View className="mb-4 rounded-card bg-card p-4">
            <ThemedText className="mb-1 text-xs text-text-secondary">Source link</ThemedText>
            <ThemedText className="text-sm text-primary-light" numberOfLines={2}>
              {bounty.sourceLink}
            </ThemedText>
          </View>
        ) : null}

        {/* Submission link */}
        {bounty.submissionLink ? (
          <View className="mb-4 rounded-card bg-card p-4">
            <ThemedText className="mb-1 text-xs text-text-secondary">Submission link</ThemedText>
            <ThemedText className="text-sm text-primary-light" numberOfLines={2}>
              {bounty.submissionLink}
            </ThemedText>
          </View>
        ) : null}

        {/* Notes */}
        {bounty.notes ? (
          <View className="mb-4 rounded-card bg-card p-4">
            <ThemedText className="mb-1 text-xs text-text-secondary">Notes</ThemedText>
            <ThemedText className="text-sm leading-5 text-text-primary">{bounty.notes}</ThemedText>
          </View>
        ) : null}

        {/* Checklist */}
        {bounty.todos.length > 0 ? (
          <View className="mb-4 rounded-card bg-card p-4">
            <ThemedText className="mb-2 text-xs text-text-secondary">Checklist</ThemedText>
            {bounty.todos.map((todo) => (
              <View key={todo.id} className="mb-1.5 flex-row items-center gap-2">
                <Ionicons
                  name={todo.completed ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={todo.completed ? colors.status.active : colors.textSecondary}
                />
                <ThemedText
                  className={`flex-1 text-sm ${todo.completed ? 'text-text-secondary line-through' : 'text-text-primary'}`}
                >
                  {todo.text}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        {/* Edit button */}
        <Pressable
          onPress={() => router.push({ pathname: '/bounty/edit/[id]', params: { id: bounty.id } })}
          className="mb-6 h-14 items-center justify-center rounded-pill bg-primary active:opacity-80"
        >
          <ThemedText className="text-base font-bold text-text-primary">Edit Bounty</ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}
