// Data Sync & Storage Agent — offline-first queue with eventual consistency.
// Mutations that fail while offline are persisted to AsyncStorage and replayed
// when connectivity returns. Conflict policy is last-write-wins, ordered by the
// timestamp captured when the op was enqueued.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Bounty, BountyStatus, NewBounty } from '@/src/types';

import {
  createBounty,
  deleteBounty,
  getBounties,
  updateBounty,
  updateBountyStatus,
} from './bounty';

const QUEUE_KEY = 'garap.sync.queue.v1';

export type SyncOp =
  | { type: 'create'; entity: 'bounty'; ts: string; tempId: string; payload: NewBounty }
  | { type: 'update'; entity: 'bounty'; ts: string; id: string; payload: Partial<Bounty> }
  | { type: 'status'; entity: 'bounty'; ts: string; id: string; status: BountyStatus }
  | { type: 'delete'; entity: 'bounty'; ts: string; id: string };

export async function enqueue(op: SyncOp): Promise<void> {
  const queue = await getQueue();
  queue.push(op);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<SyncOp[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SyncOp[];
  } catch {
    return [];
  }
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function queueLength(): Promise<number> {
  return (await getQueue()).length;
}

/** Apply a single bounty op to the backend. */
async function applyBountyOp(op: SyncOp): Promise<void> {
  switch (op.type) {
    case 'create':
      await createBounty(op.payload);
      break;
    case 'update':
      await updateBounty(op.id, op.payload);
      break;
    case 'status':
      await updateBountyStatus(op.id, op.status);
      break;
    case 'delete':
      await deleteBounty(op.id);
      break;
  }
}

// Distinguish "offline / transient" failures (keep in queue) from "permanent"
// failures like validation/constraint errors (drop, else the queue wedges).
export function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('failed to') ||
    msg.includes('connection')
  );
}

/** Alias for enqueue — matches the spec naming. */
export async function queueOfflineOperation(op: SyncOp): Promise<void> {
  return enqueue(op);
}

/** Alias for flushBountyQueue — matches the spec naming. */
export async function processSyncQueue(): Promise<number> {
  return flushBountyQueue();
}

/** Push a single bounty to Supabase (create or update). */
export async function syncBountyToSupabase(bounty: Bounty | NewBounty): Promise<void> {
  if ('id' in bounty && bounty.id) {
    await updateBounty(bounty.id, bounty);
  } else {
    await createBounty(bounty as NewBounty);
  }
}

/** Pull the current user's bounties from Supabase. */
export async function syncBountiesFromSupabase(userId: string): Promise<Bounty[]> {
  return getBounties(userId);
}

/**
 * Last-write-wins conflict resolver for bounty rows.
 * Prefer the remote row unless the local row has a more recent updatedAt.
 */
export function handleSyncConflicts(local: Bounty, remote: Bounty): Bounty {
  const localTs = new Date(local.updatedAt).getTime();
  const remoteTs = new Date(remote.updatedAt).getTime();
  return localTs >= remoteTs ? local : remote;
}

/**
 * Replay queued ops in order. Transient failures stay queued (retried next
 * flush); permanent failures are dropped so one bad op can't block the rest.
 * Returns the number of ops successfully applied.
 */
export async function flushBountyQueue(): Promise<number> {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  const remaining: SyncOp[] = [];
  let applied = 0;

  for (const op of queue) {
    try {
      await applyBountyOp(op);
      applied += 1;
    } catch (err) {
      if (isTransientError(err)) {
        remaining.push(op); // still offline — retry later
      } else {
        console.warn('[sync] Dropping op after permanent failure:', op, err);
      }
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return applied;
}
