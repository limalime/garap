// Create / edit bounty modal (Bounty Management Agent).
// Hosts BountyForm; in edit mode adds Delete + Share and enforces status
// transition rules. Marking a bounty 'Won' locks in its USD value (revenue).

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/src/components/common/ThemedText';

import { BountyForm } from '@/src/components/bounty/BountyForm';
import { useBountyActions } from '@/src/hooks/useBountyActions';
import { useToast } from '@/src/hooks/useToast';
import { convertToUSD } from '@/src/services/crypto';
import type { Bounty } from '@/src/types';
import { colors } from '@/src/utils/colors';
import { canTransition } from '@/src/utils/bountyStatus';
import { formatPrize } from '@/src/utils/formatting';
import type { BountyFormValues } from '@/src/utils/validation';

interface BountyDetailModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  bounty?: Bounty;
  onClose: () => void;
}

export function BountyDetailModal({ visible, mode, bounty, onClose }: BountyDetailModalProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { createBounty, updateBounty, deleteBounty } = useBountyActions();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: BountyFormValues) => {
    // Block invalid status moves (e.g. Won → Submitted) when editing.
    if (mode === 'edit' && bounty && values.status !== bounty.status) {
      if (!canTransition(bounty.status, values.status as Bounty['status'])) {
        toast('error', `Can't move from ${bounty.status} to ${values.status}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Lock in USD value when the bounty is won (feeds the revenue trigger).
      let prizeInUSD: number | undefined;
      if (values.status === 'Won') {
        try {
          prizeInUSD = await convertToUSD(values.prizeAmount, values.prizeUnit as Bounty['prizeUnit']);
        } catch {
          prizeInUSD = bounty?.prizeInUSD;
        }
      }

      const payload = {
        bountyName: values.bountyName,
        platform: values.platform as Bounty['platform'],
        platformCustomName:
          values.platform === 'Other' ? values.platformCustomName || undefined : undefined,
        deadline: values.deadline,
        prizeAmount: values.prizeAmount,
        prizeUnit: values.prizeUnit as Bounty['prizeUnit'],
        status: values.status as Bounty['status'],
        category: values.category as Bounty['category'],
        sourceLink: values.sourceLink || undefined,
        submissionLink: values.submissionLink || undefined,
        notes: values.notes || undefined,
        todos: values.todos,
        ...(prizeInUSD !== undefined ? { prizeInUSD } : {}),
      };

      if (mode === 'create') {
        await createBounty(payload);
        toast('success', 'Bounty created');
      } else if (bounty) {
        await updateBounty(bounty.id, payload);
        toast('success', 'Bounty updated');
      }
      onClose();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!bounty) return;
    Alert.alert('Delete bounty', `Delete “${bounty.bountyName}”? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBounty(bounty.id);
            toast('success', 'Bounty deleted');
            onClose();
          } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Delete failed');
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!bounty) return;
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pb-3">
          <Pressable onPress={onClose} hitSlop={8}>
            <ThemedText className="text-base text-text-secondary">Cancel</ThemedText>
          </Pressable>
          <ThemedText className="text-base font-bold text-text-primary" numberOfLines={1}>
            {mode === 'create' ? 'New Bounty' : 'Edit Bounty'}
          </ThemedText>
          <View className="flex-row items-center gap-4">
            {mode === 'edit' ? (
              <>
                <Pressable onPress={handleShare} hitSlop={8}>
                  <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
                </Pressable>
                <Pressable onPress={handleDelete} hitSlop={8}>
                  <Ionicons name="trash-outline" size={22} color={colors.status.lost} />
                </Pressable>
              </>
            ) : (
              <View className="w-6" />
            )}
          </View>
        </View>

        <View className="flex-1 px-5" style={{ paddingBottom: insets.bottom }}>
          <BountyForm mode={mode} initial={bounty} submitting={submitting} onSubmit={handleSubmit} />
        </View>
      </View>
    </Modal>
  );
}
