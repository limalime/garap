// Revenue Calculation Agent — loads exchange rates + the user's revenue stats,
// mirrors them into the revenue store, and keeps the store live via a Supabase
// Realtime subscription on user_revenue. Mount once in an authenticated layout.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getExchangeRates, getRevenueStats } from '@/src/services/crypto';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useRevenueStore } from '@/src/store/useRevenueStore';

export const revenueQueryKey = (userId?: string) => ['revenue', userId] as const;
export const exchangeRatesQueryKey = ['exchangeRates'] as const;

export function useRevenue() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const setRevenue = useRevenueStore((s) => s.setRevenue);
  const setExchangeRates = useRevenueStore((s) => s.setExchangeRates);
  const setLoading = useRevenueStore((s) => s.setLoading);

  // Exchange rates (15-min cache lives in the service; RQ refetches periodically).
  const ratesQuery = useQuery({
    queryKey: exchangeRatesQueryKey,
    queryFn: () => getExchangeRates(),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  // Revenue aggregate for this user.
  const revenueQuery = useQuery({
    queryKey: revenueQueryKey(userId),
    queryFn: () => getRevenueStats(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (ratesQuery.data) setExchangeRates(ratesQuery.data);
  }, [ratesQuery.data, setExchangeRates]);

  useEffect(() => {
    if (revenueQuery.data) setRevenue(revenueQuery.data);
  }, [revenueQuery.data, setRevenue]);

  useEffect(() => {
    setLoading(revenueQuery.isFetching);
  }, [revenueQuery.isFetching, setLoading]);

  // Realtime: when the trigger updates user_revenue, refetch the breakdown.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`user_revenue:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_revenue', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: revenueQueryKey(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return { ratesQuery, revenueQuery };
}
