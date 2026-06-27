// Core domain types for Garap — mirror PROJECT_SUMMARY.md "Core Data Model".

import type { BountyCategory } from './bounty';

// Bounty domain model lives in ./bounty; re-export so `@/src/types` stays the
// single import surface.
export type {
  Platform,
  PrizeUnit,
  BountyStatus,
  BountyCategory,
  Todo,
  Bounty,
  NewBounty,
} from './bounty';
export {
  PLATFORMS,
  PRIZE_UNITS,
  BOUNTY_STATUSES,
  BOUNTY_CATEGORIES,
} from './bounty';

export interface RevenueHistoryEntry {
  date: string; // ISO8601
  amount: number;
  bountyId: string;
  category: BountyCategory;
}

export interface WinRate {
  total: number;
  percentage: number;
  byCategory: Partial<Record<BountyCategory, number>>;
}

export interface UserRevenue {
  userId: string;
  totalRevenueUSD: number;
  revenueByCategory: Record<BountyCategory, number>;
  revenueHistory: RevenueHistoryEntry[];
  winRate: WinRate;
  lastUpdated: string; // ISO8601
}

/** Flattened revenue snapshot used by the revenue store + dashboard. */
export interface RevenueStats {
  totalRevenueUSD: number;
  revenueByCategory: Record<BountyCategory, number>;
  winRate: number; // percentage 0..100
  history: RevenueHistoryEntry[];
  wonCount: number;
  lastUpdated: string; // ISO8601
}

/** USD value of one unit of each supported prize currency. */
export type ExchangeRates = Record<import('./bounty').PrizeUnit, number>;

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface CalendarEvent {
  title: string; // Bounty name
  startDate: string; // ISO — deadline
  endDate: string; // ISO
  description: string; // Platform, prize, status
  alarms: number[]; // minutes before, e.g. [1440, 60]
  location?: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  body: string;
  tags: string[];
  linkedBountyId?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
