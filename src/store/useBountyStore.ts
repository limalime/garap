// Bounty Management Agent — local bounty cache, filter/search state, and
// selection (Zustand). The store is the UI source of truth; hooks keep it in
// sync with Supabase (fetch, realtime, optimistic mutations).
//
// Only the filter preference is persisted (to AsyncStorage); bounty rows stay in
// memory and are refetched on launch.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Bounty, BountyCategory, BountyStatus } from '@/src/types';

const BOUNTY_FILTER_STORAGE_KEY = 'garap.bounty-filter.v1';

export type StatusFilter = BountyStatus | 'All';
export type CategoryFilter = BountyCategory | 'All';

export interface BountyFilter {
  status: StatusFilter;
  category: CategoryFilter;
}

interface BountyState {
  bounties: Bounty[];
  loading: boolean;
  error: string | null;
  selectedBounty: Bounty | null;
  filter: BountyFilter;
  searchQuery: string;

  setBounties: (bounties: Bounty[]) => void;
  addBounty: (bounty: Bounty) => void;
  updateBounty: (id: string, patch: Partial<Bounty>) => void;
  deleteBounty: (id: string) => void;
  /** Insert-or-update with last-write-wins (used by realtime + server confirms). */
  upsertBounty: (bounty: Bounty) => void;
  setSelectedBounty: (bounty: Bounty | null) => void;
  setFilter: (filter: Partial<BountyFilter>) => void;
  setSearch: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBountyStore = create<BountyState>()(
  persist(
    (set) => ({
      bounties: [],
      loading: false,
      error: null,
      selectedBounty: null,
      filter: { status: 'All', category: 'All' },
      searchQuery: '',

  setBounties: (bounties) => set({ bounties }),

  addBounty: (bounty) =>
    set((state) =>
      state.bounties.some((b) => b.id === bounty.id)
        ? state
        : { bounties: [bounty, ...state.bounties] }
    ),

  updateBounty: (id, patch) =>
    set((state) => ({
      bounties: state.bounties.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      selectedBounty:
        state.selectedBounty?.id === id
          ? { ...state.selectedBounty, ...patch }
          : state.selectedBounty,
    })),

  deleteBounty: (id) =>
    set((state) => ({
      bounties: state.bounties.filter((b) => b.id !== id),
      selectedBounty: state.selectedBounty?.id === id ? null : state.selectedBounty,
    })),

  upsertBounty: (bounty) =>
    set((state) => {
      // Soft-deleted rows arriving via realtime are removed from the cache.
      if (bounty.deletedAt) {
        return { bounties: state.bounties.filter((b) => b.id !== bounty.id) };
      }
      const idx = state.bounties.findIndex((b) => b.id === bounty.id);
      if (idx === -1) return { bounties: [bounty, ...state.bounties] };

      // Last-write-wins: ignore stale events (older updatedAt than what we hold).
      const existing = state.bounties[idx];
      if (new Date(bounty.updatedAt).getTime() < new Date(existing.updatedAt).getTime()) {
        return state;
      }
      const next = state.bounties.slice();
      next[idx] = bounty;
      return { bounties: next };
    }),

  setSelectedBounty: (selectedBounty) => set({ selectedBounty }),
  setFilter: (filter) => set((state) => ({ filter: { ...state.filter, ...filter } })),
  setSearch: (searchQuery) => set({ searchQuery }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
    }),
    {
      name: BOUNTY_FILTER_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState, version) => {
        // v1 added explicit version tracking; the filter shape is unchanged.
        if (version === 0) {
          return persistedState as BountyState;
        }
        return persistedState as BountyState;
      },
      // Persist only the filter preference; rows + transient flags stay in memory.
      partialize: (state) => ({ filter: state.filter }),
    }
  )
);

// --------------------------------------------------------------------------
// Selectors (computed views). Use with useBountyStore(selectX) or call directly.
// --------------------------------------------------------------------------
const ACTIVE_STATUSES: BountyStatus[] = ['Active', 'Submitted', 'Pending'];

/** Search & Filter Agent — visible list given filter + search state. */
export function selectFilteredBounties(state: BountyState): Bounty[] {
  const q = state.searchQuery.trim().toLowerCase();
  const { status, category } = state.filter;
  return state.bounties.filter((b) => {
    if (status !== 'All' && b.status !== status) return false;
    if (category !== 'All' && b.category !== category) return false;
    if (q) {
      const haystack = `${b.bountyName} ${b.notes ?? ''} ${b.submissionLink ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function selectActiveBounties(state: BountyState): Bounty[] {
  return state.bounties.filter((b) => ACTIVE_STATUSES.includes(b.status));
}

export function selectWonBounties(state: BountyState): Bounty[] {
  return state.bounties.filter((b) => b.status === 'Won');
}
