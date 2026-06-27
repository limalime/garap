// Bounty Management Agent — optimistic CRUD with offline fallback.
// Each action updates the Zustand store immediately, then calls Supabase. On a
// transient (offline) failure the op is queued and the optimistic state is kept;
// on a permanent failure the change is rolled back and the error rethrown.

import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useCallback } from 'react';

import { bountiesQueryKey } from '@/src/hooks/useBounties';
import {
  createBounty as createBountyApi,
  deleteBounty as deleteBountyApi,
  updateBounty as updateBountyApi,
  updateBountyStatus as updateBountyStatusApi,
} from '@/src/services/bounty';
import { convertToUSD } from '@/src/services/crypto';
import { enqueue, isTransientError } from '@/src/services/sync';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useBountyStore } from '@/src/store/useBountyStore';
import type { Bounty, BountyStatus, NewBounty } from '@/src/types';

export type CreateBountyInput = Omit<NewBounty, 'userId'>;

export function useBountyActions() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: bountiesQueryKey(userId) }),
    [queryClient, userId]
  );

  const createBounty = useCallback(
    async (input: CreateBountyInput): Promise<Bounty> => {
      if (!userId) throw new Error('You must be signed in to create a bounty.');

      const store = useBountyStore.getState();
      const now = new Date().toISOString();
      const tempId = Crypto.randomUUID();
      const data: NewBounty = { ...input, userId };

      // Optimistic insert.
      const optimistic: Bounty = {
        id: tempId,
        userId,
        prizeInUSD: input.prizeInUSD ?? 0,
        createdAt: now,
        updatedAt: now,
        ...input,
      };
      store.addBounty(optimistic);

      try {
        const saved = await createBountyApi(data);
        store.deleteBounty(tempId); // swap temp for the server row
        store.upsertBounty(saved);
        void invalidate();
        return saved;
      } catch (err) {
        if (isTransientError(err)) {
          await enqueue({ type: 'create', entity: 'bounty', ts: now, tempId, payload: data });
          return optimistic; // keep optimistic row; queue will reconcile
        }
        store.deleteBounty(tempId); // rollback
        throw err;
      }
    },
    [userId, invalidate]
  );

  const updateBounty = useCallback(
    async (id: string, patch: Partial<Bounty>): Promise<void> => {
      const store = useBountyStore.getState();
      const prev = store.bounties.find((b) => b.id === id);
      const now = new Date().toISOString();

      store.updateBounty(id, { ...patch, updatedAt: now });

      try {
        const saved = await updateBountyApi(id, patch);
        store.upsertBounty(saved);
        void invalidate();
      } catch (err) {
        if (isTransientError(err)) {
          await enqueue({ type: 'update', entity: 'bounty', ts: now, id, payload: patch });
          return;
        }
        if (prev) store.updateBounty(id, prev); // rollback
        throw err;
      }
    },
    [invalidate]
  );

  const updateStatus = useCallback(
    async (id: string, status: BountyStatus): Promise<void> => {
      const store = useBountyStore.getState();
      const prev = store.bounties.find((b) => b.id === id);
      const now = new Date().toISOString();

      // Automatic revenue calculation: when a bounty is won, lock in its USD
      // value at the current exchange rate. The DB trigger then folds prizeInUSD
      // into user_revenue + revenue_history + win_rate.
      let prizeInUSD: number | undefined;
      if (status === 'Won' && prev) {
        try {
          prizeInUSD = await convertToUSD(prev.prizeAmount, prev.prizeUnit);
        } catch {
          prizeInUSD = prev.prizeInUSD; // keep existing if rate lookup fails
        }
      }

      const patch: Partial<Bounty> =
        prizeInUSD !== undefined ? { status, prizeInUSD } : { status };
      store.updateBounty(id, { ...patch, updatedAt: now });

      try {
        const saved =
          prizeInUSD !== undefined
            ? await updateBountyApi(id, patch)
            : await updateBountyStatusApi(id, status);
        store.upsertBounty(saved);
        void invalidate();
      } catch (err) {
        if (isTransientError(err)) {
          // Queue the full patch so the won USD value survives offline replay.
          await enqueue(
            prizeInUSD !== undefined
              ? { type: 'update', entity: 'bounty', ts: now, id, payload: patch }
              : { type: 'status', entity: 'bounty', ts: now, id, status }
          );
          return;
        }
        if (prev) store.updateBounty(id, prev); // rollback
        throw err;
      }
    },
    [invalidate]
  );

  const deleteBounty = useCallback(
    async (id: string): Promise<void> => {
      const store = useBountyStore.getState();
      const prev = store.bounties.find((b) => b.id === id);
      const now = new Date().toISOString();

      store.deleteBounty(id); // optimistic removal

      try {
        await deleteBountyApi(id);
        void invalidate();
      } catch (err) {
        if (isTransientError(err)) {
          await enqueue({ type: 'delete', entity: 'bounty', ts: now, id });
          return;
        }
        if (prev) store.addBounty(prev); // rollback
        throw err;
      }
    },
    [invalidate]
  );

  return { createBounty, updateBounty, updateStatus, deleteBounty };
}
