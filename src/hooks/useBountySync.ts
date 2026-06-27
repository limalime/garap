// Data Sync Agent — keeps the bounty store live with Supabase Realtime and
// drains the offline queue when the app starts or returns to the foreground.
// Mount once in an authenticated layout (see app/(tabs)/_layout.tsx).

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { bountiesQueryKey } from '@/src/hooks/useBounties';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { type BountyRow, mapBountyRow } from '@/src/services/bounty';
import { supabase } from '@/src/services/supabase';
import { flushBountyQueue } from '@/src/services/sync';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useBountyStore } from '@/src/store/useBountyStore';

export function useBountySync() {
  const userId = useAuthStore((s) => s.user?.id);
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const wasOnlineRef = useRef(isOnline);

  useEffect(() => {
    if (!userId) return;

    const upsertBounty = useBountyStore.getState().upsertBounty;
    const removeBounty = useBountyStore.getState().deleteBounty;

    // Drain anything queued while offline, then let RQ refetch the truth.
    const flush = async () => {
      const applied = await flushBountyQueue();
      if (applied > 0) {
        queryClient.invalidateQueries({ queryKey: bountiesQueryKey(userId) });
      }
    };
    void flush();

    // Realtime: stream this user's bounty changes into the store (LWW upsert).
    const channel = supabase
      .channel(`bounties:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bounties', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<BountyRow>;
            if (old?.id) removeBounty(old.id);
            return;
          }
          // INSERT / UPDATE — soft-deletes (deleted_at set) are handled inside upsert.
          upsertBounty(mapBountyRow(payload.new as BountyRow));
        }
      )
      .subscribe();

    // Re-drain the queue whenever the app comes back to the foreground.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flush();
    });

    return () => {
      supabase.removeChannel(channel);
      appStateSub.remove();
    };
  }, [userId, queryClient]);

  // When connectivity is restored, immediately try to flush queued ops without
  // tearing down the realtime subscription.
  useEffect(() => {
    if (!userId) return;
    if (isOnline && wasOnlineRef.current === false) {
      void flushBountyQueue().then((applied) => {
        if (applied > 0) {
          queryClient.invalidateQueries({ queryKey: bountiesQueryKey(userId) });
        }
      });
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, userId, queryClient]);
}
