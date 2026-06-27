// Bounty domain model — mirrors PROJECT_SUMMARY.md "Core Data Model".
//
// Note on dates: the spec interface types deadline/createdAt/updatedAt as `Date`,
// but Garap uses ISO 8601 strings throughout (Supabase rows, the AsyncStorage
// offline queue, persisted Zustand state, and all formatting utils). Strings are
// JSON-safe end to end; `Date` objects silently become strings when serialized,
// producing runtime type lies. Convert with `new Date(bounty.deadline)` at the
// edges (e.g. date pickers) when a Date instance is genuinely needed.

export type Platform =
  | 'X'
  | 'Medium'
  | 'GitHub'
  | 'Devpost'
  | 'Dribbble'
  | 'Behance'
  | 'Telegram'
  | 'Other';

export type PrizeUnit = 'USDC' | 'ETH' | 'BTC' | 'USD' | 'IDR' | 'SOL' | 'USDT';

export type BountyStatus =
  | 'Active'
  | 'Submitted'
  | 'Won'
  | 'Lost'
  | 'Pending'
  | 'Archived';

export type BountyCategory =
  | 'Hackathon'
  | 'Airdrop'
  | 'Design'
  | 'Development'
  | 'Writing'
  | 'Trading'
  | 'Other';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export interface Bounty {
  id: string;
  userId: string;
  bountyName: string;
  platform: Platform;
  /** Free-text platform name when platform is 'Other'. */
  platformCustomName?: string;
  deadline: string; // ISO8601
  prizeAmount: number;
  prizeUnit: PrizeUnit;
  prizeInUSD: number; // calculated from crypto API
  status: BountyStatus;
  category: BountyCategory;
  /** Original announcement / source URL. */
  sourceLink?: string;
  submissionLink?: string;
  notes?: string;
  todos: Todo[];
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  deletedAt?: string | null; // soft delete
}

/** Shape accepted when creating a bounty (server fills id/timestamps; prizeInUSD optional). */
export type NewBounty = Omit<Bounty, 'id' | 'createdAt' | 'updatedAt' | 'prizeInUSD' | 'deletedAt'> & {
  prizeInUSD?: number;
};

export const PLATFORMS: Platform[] = [
  'X',
  'Medium',
  'GitHub',
  'Devpost',
  'Dribbble',
  'Behance',
  'Telegram',
  'Other',
];

export const PRIZE_UNITS: PrizeUnit[] = [
  'USDC',
  'ETH',
  'BTC',
  'USD',
  'IDR',
  'SOL',
  'USDT',
];

export const BOUNTY_STATUSES: BountyStatus[] = [
  'Active',
  'Submitted',
  'Won',
  'Lost',
  'Pending',
  'Archived',
];

export const BOUNTY_CATEGORIES: BountyCategory[] = [
  'Hackathon',
  'Airdrop',
  'Design',
  'Development',
  'Writing',
  'Trading',
  'Other',
];
