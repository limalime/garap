// Generic data hook that combines React Query fetching with optional Supabase
// Realtime subscriptions. Also exports a small optimistic-mutation helper.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/src/services/supabase';

export interface RealtimeConfig {
  /** Supabase realtime channel name. */
  channel: string;
  /** Postgres table to watch. */
  table: string;
  /** Optional filter string, e.g. `user_id=eq.${userId}`. */
  filter?: string;
  /** Optional callback invoked on every realtime event before invalidation. */
  onChange?: (payload: unknown) => void;
}

export interface UseDataOptions<TData> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  enabled?: boolean;
  /** Subscribe to Supabase realtime changes for this query. */
  realtime?: RealtimeConfig;
}

export interface UseDataResult<TData> {
  data: TData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

/**
 * Generic React Query hook with optional Supabase realtime invalidation.
 *
 * Example:
 *   const { data, isLoading, error } = useData({
 *     queryKey: ['bounties', userId],
 *     queryFn: () => getBounties(userId),
 *     enabled: Boolean(userId),
 *     realtime: { channel: `bounties:${userId}`, table: 'bounties', filter: `user_id=eq.${userId}` },
 *   });
 */
export function useData<TData>(options: UseDataOptions<TData>): UseDataResult<TData> {
  const { queryKey, queryFn, enabled = true, realtime } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
  });

  useEffect(() => {
    if (!realtime) return;

    const channel = supabase
      .channel(realtime.channel)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: realtime.table, filter: realtime.filter },
        (payload) => {
          realtime.onChange?.(payload);
          void queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, queryKey, realtime]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}

/**
 * Thin wrapper around React Query's useMutation for optimistic updates.
 *
 * Example:
 *   const { mutateAsync, isPending } = useOptimisticMutation({
 *     mutationFn: patchBounty,
 *     onMutate: async (vars) => {
 *       await queryClient.cancelQueries({ queryKey });
 *       const previous = queryClient.getQueryData(queryKey);
 *       queryClient.setQueryData(queryKey, (old) => ...);
 *       return { previous };
 *     },
 *     onError: (err, vars, context) => {
 *       queryClient.setQueryData(queryKey, context?.previous);
 *     },
 *     onSettled: () => queryClient.invalidateQueries({ queryKey }),
 *   });
 */
export function useOptimisticMutation<TData, TVariables, TContext = unknown>(
  options: UseMutationOptions<TData, Error, TVariables, TContext>
) {
  return useMutation<TData, Error, TVariables, TContext>(options);
}
