// Data hook bridging React Query <-> the bounty service & Zustand store.
// Fetches the current user's bounties and mirrors data + loading/error into the
// store so any screen can read a single source of truth.

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getBounties } from '@/src/services/bounty';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useBountyStore } from '@/src/store/useBountyStore';

export const bountiesQueryKey = (userId?: string) => ['bounties', userId] as const;

/** Fetch the current user's bounties and mirror them into the Zustand store. */
export function useBounties() {
  const userId = useAuthStore((s) => s.user?.id);
  const setBounties = useBountyStore((s) => s.setBounties);
  const setLoading = useBountyStore((s) => s.setLoading);
  const setError = useBountyStore((s) => s.setError);

  const query = useQuery({
    queryKey: bountiesQueryKey(userId),
    queryFn: () => getBounties(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (query.data) setBounties(query.data);
  }, [query.data, setBounties]);

  useEffect(() => {
    setLoading(query.isFetching);
  }, [query.isFetching, setLoading]);

  useEffect(() => {
    setError(query.error ? (query.error as Error).message : null);
  }, [query.error, setError]);

  return query;
}
