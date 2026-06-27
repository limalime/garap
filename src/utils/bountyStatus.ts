// Bounty status transition rules (Bounty Management Agent).
// Prevents nonsensical moves (e.g. Won → Submitted).

import type { BountyStatus } from '@/src/types';

const TRANSITIONS: Record<BountyStatus, BountyStatus[]> = {
  Active: ['Submitted', 'Pending', 'Won', 'Lost', 'Archived'],
  Submitted: ['Won', 'Lost', 'Pending', 'Archived'],
  Pending: ['Active', 'Submitted', 'Archived'],
  Won: ['Archived'],
  Lost: ['Active', 'Archived'],
  Archived: ['Active'],
};

/** Whether a bounty may move from `from` to `to` (a no-op move is always valid). */
export function canTransition(from: BountyStatus, to: BountyStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

/** Statuses a bounty can move to from its current status (excludes itself). */
export function nextStatuses(from: BountyStatus): BountyStatus[] {
  return TRANSITIONS[from];
}
