// Projects (Bounty List) — search, combinable filters, swipeable cards, create/
// edit modal, and status changes with transition validation (Bounty + Search).

import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { BountyCard } from '@/src/components/bounty/BountyCard';
import { BountyDetailModal } from '@/src/components/bounty/BountyDetailModal';
import { SelectField } from '@/src/components/common/SelectField';
import { TopBar } from '@/src/components/common/TopBar';
import { FAB } from '@/src/components/common/FAB';
import { useBountyActions } from '@/src/hooks/useBountyActions';
import { useToast } from '@/src/hooks/useToast';
import {
  selectFilteredBounties,
  useBountyStore,
  type CategoryFilter,
  type StatusFilter,
} from '@/src/store/useBountyStore';
import {
  BOUNTY_CATEGORIES,
  BOUNTY_STATUSES,
  type Bounty,
  type BountyStatus,
} from '@/src/types';
import { colors } from '@/src/utils/colors';
import { nextStatuses } from '@/src/utils/bountyStatus';

const STATUS_OPTIONS: StatusFilter[] = ['All', ...BOUNTY_STATUSES];
const CATEGORY_OPTIONS: CategoryFilter[] = ['All', ...BOUNTY_CATEGORIES];

export function ProjectsScreen() {
  const toast = useToast();
  const { updateStatus, deleteBounty } = useBountyActions();

  const searchQuery = useBountyStore((s) => s.searchQuery);
  const setSearch = useBountyStore((s) => s.setSearch);
  const filter = useBountyStore((s) => s.filter);
  const setFilter = useBountyStore((s) => s.setFilter);
  const state = useBountyStore();
  const totalCount = state.bounties.length;

  const filtered = useMemo(() => selectFilteredBounties(state), [state]);

  // UI state
  const [openFilter, setOpenFilter] = useState<'status' | 'category' | null>(null);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; bounty?: Bounty } | null>(null);
  const [statusTarget, setStatusTarget] = useState<Bounty | null>(null);

  const activeFilterCount =
    (filter.status !== 'All' ? 1 : 0) +
    (filter.category !== 'All' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const clearFilters = () => {
    setFilter({ status: 'All', category: 'All' });
    setSearch('');
  };

  const handleDelete = (bounty: Bounty) => {
    Alert.alert('Delete bounty', `Delete “${bounty.bountyName}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBounty(bounty.id);
            toast('success', 'Bounty deleted');
          } catch {
            toast('error', 'Delete failed');
          }
        },
      },
    ]);
  };

  const handleArchive = async (bounty: Bounty) => {
    try {
      await updateStatus(bounty.id, 'Archived');
      toast('success', 'Bounty archived');
    } catch {
      toast('error', 'Archive failed');
    }
  };

  const applyStatus = (bounty: Bounty, status: BountyStatus) => {
    Alert.alert('Change status', `Set “${bounty.bountyName}” to ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await updateStatus(bounty.id, status);
            toast('success', status === 'Won' ? 'Marked Won — revenue updated 🎉' : `Status: ${status}`);
          } catch {
            toast('error', 'Status change failed');
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <TopBar title="Projects" showSettings={false} />

      {/* Search */}
      <View className="mx-5 mb-2 flex-row items-center gap-2 rounded-pill bg-card px-4 py-3">
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearch}
          placeholder="Search by name or notes"
          placeholderTextColor={colors.textSecondary}
          className="flex-1 text-text-primary"
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Filter bar */}
      <View className="mx-5 mb-3 flex-row items-center gap-2">
        <View className="flex-1">
          <SelectField
            value={filter.status}
            options={STATUS_OPTIONS}
            onChange={(v) => setFilter({ status: v })}
            visible={openFilter === 'status'}
            onOpen={() => setOpenFilter('status')}
            onClose={() => setOpenFilter(null)}
          />
        </View>
        <View className="flex-1">
          <SelectField
            value={filter.category}
            options={CATEGORY_OPTIONS}
            onChange={(v) => setFilter({ category: v })}
            visible={openFilter === 'category'}
            onOpen={() => setOpenFilter('category')}
            onClose={() => setOpenFilter(null)}
          />
        </View>
        {activeFilterCount > 0 ? (
          <Pressable
            onPress={clearFilters}
            className="mb-3 h-12 flex-row items-center gap-1 rounded-pill bg-card px-3"
          >
            <Ionicons name="close" size={16} color={colors.status.lost} />
            <Text className="text-xs font-semibold text-status-lost">{activeFilterCount}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BountyCard
            bounty={item}
            onPress={(b) => setModal({ mode: 'edit', bounty: b })}
            onEdit={(b) => setModal({ mode: 'edit', bounty: b })}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onStatusChange={(b) => setStatusTarget(b)}
          />
        )}
        contentContainerClassName="gap-3 px-5 pb-32"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-16 items-center px-8">
            <LottieView
              source={require('@/src/assets/animations/onboarding-track.json')}
              autoPlay
              loop
              style={{ width: 140, height: 140 }}
            />
            <Text className="mt-2 text-base font-bold text-text-primary">
              {totalCount === 0 ? 'No bounties yet' : 'No bounties match your filters'}
            </Text>
            <Text className="mt-1 text-center text-sm text-text-secondary">
              {totalCount === 0
                ? 'Create your first bounty to start tracking.'
                : 'Try adjusting or clearing your filters.'}
            </Text>
            {totalCount === 0 ? (
              <Pressable
                onPress={() => setModal({ mode: 'create' })}
                className="mt-4 rounded-pill bg-primary px-6 py-3"
              >
                <Text className="font-bold text-text-primary">Create your first bounty</Text>
              </Pressable>
            ) : (
              <Pressable onPress={clearFilters} className="mt-4 rounded-pill bg-card px-6 py-3">
                <Text className="font-bold text-primary-light">Clear filters</Text>
              </Pressable>
            )}
          </View>
        }
      />

      <FAB onPress={() => setModal({ mode: 'create' })} />

      {/* Create / edit modal */}
      {modal ? (
        <BountyDetailModal
          visible
          mode={modal.mode}
          bounty={modal.bounty}
          onClose={() => setModal(null)}
        />
      ) : null}

      {/* Status-change sheet (valid transitions only) */}
      {statusTarget ? (
        <SelectField
          value={statusTarget.status}
          options={nextStatuses(statusTarget.status)}
          onChange={(status) => {
            const target = statusTarget;
            setStatusTarget(null);
            if (target && status !== target.status) applyStatus(target, status as BountyStatus);
          }}
          visible
          onOpen={() => {}}
          onClose={() => setStatusTarget(null)}
        />
      ) : null}
    </View>
  );
}
