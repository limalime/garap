// Revenue Calculation Agent — client revenue state (Zustand), persisted to
// AsyncStorage for instant cold-start display. The server (DB trigger) remains
// the source of truth; hooks refresh this store from it.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  BountyCategory,
  ExchangeRates,
  RevenueHistoryEntry,
  RevenueStats,
} from '@/src/types';
import { BOUNTY_CATEGORIES } from '@/src/types';

function zeroByCategory(): Record<BountyCategory, number> {
  return BOUNTY_CATEGORIES.reduce((acc, c) => {
    acc[c] = 0;
    return acc;
  }, {} as Record<BountyCategory, number>);
}

interface RevenueState {
  totalRevenueUSD: number;
  revenueByCategory: Record<BountyCategory, number>;
  winRate: number; // percentage 0..100
  exchangeRates: ExchangeRates | null;
  history: RevenueHistoryEntry[];
  loading: boolean;
  lastUpdated: string | null;

  setRevenue: (stats: RevenueStats) => void;
  addToRevenue: (amountUSD: number, category: BountyCategory) => void;
  setExchangeRates: (rates: ExchangeRates) => void;
  calculateStats: () => void;
  setLoading: (loading: boolean) => void;
}

export const useRevenueStore = create<RevenueState>()(
  persist(
    (set, get) => ({
      totalRevenueUSD: 0,
      revenueByCategory: zeroByCategory(),
      winRate: 0,
      exchangeRates: null,
      history: [],
      loading: false,
      lastUpdated: null,

      setRevenue: (stats) =>
        set({
          totalRevenueUSD: stats.totalRevenueUSD,
          revenueByCategory: stats.revenueByCategory,
          winRate: stats.winRate,
          history: stats.history,
          lastUpdated: stats.lastUpdated,
        }),

      // Optimistic local bump (e.g. immediately after marking a bounty Won). The
      // next server refresh reconciles to the authoritative totals.
      addToRevenue: (amountUSD, category) =>
        set((state) => {
          const revenueByCategory = { ...state.revenueByCategory };
          revenueByCategory[category] = (revenueByCategory[category] ?? 0) + amountUSD;
          return {
            revenueByCategory,
            totalRevenueUSD: state.totalRevenueUSD + amountUSD,
            lastUpdated: new Date().toISOString(),
          };
        }),

      setExchangeRates: (exchangeRates) => set({ exchangeRates }),

      // Recompute the total from the per-category map (keeps them consistent
      // after optimistic edits).
      calculateStats: () =>
        set((state) => ({
          totalRevenueUSD: Object.values(state.revenueByCategory).reduce((a, b) => a + b, 0),
        })),

      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'garap.revenue.v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState, version) => {
        // Merge defaults so new fields don't break old cached revenue state.
        const prefs = (persistedState ?? {}) as Partial<RevenueState>;
        const base: RevenueState = {
          totalRevenueUSD: 0,
          revenueByCategory: zeroByCategory(),
          winRate: 0,
          exchangeRates: null,
          history: [],
          loading: false,
          lastUpdated: null,
          setRevenue: () => {},
          addToRevenue: () => {},
          setExchangeRates: () => {},
          calculateStats: () => {},
          setLoading: () => {},
        };

        if (version === 0) {
          // Initial persisted shape matches current slice; just backfill defaults.
        }

        return {
          ...base,
          totalRevenueUSD: prefs.totalRevenueUSD ?? base.totalRevenueUSD,
          revenueByCategory: {
            ...base.revenueByCategory,
            ...(prefs.revenueByCategory ?? {}),
          },
          winRate: prefs.winRate ?? base.winRate,
          history: prefs.history ?? base.history,
          exchangeRates: prefs.exchangeRates ?? base.exchangeRates,
          lastUpdated: prefs.lastUpdated ?? base.lastUpdated,
        };
      },
      partialize: (state) => ({
        totalRevenueUSD: state.totalRevenueUSD,
        revenueByCategory: state.revenueByCategory,
        winRate: state.winRate,
        history: state.history,
        exchangeRates: state.exchangeRates,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);
