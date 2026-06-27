// Dashboard (Home) — revenue overview, chart, quick stats, recent projects, FAB.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/src/components/common/ThemedText';

import { RevenueChart, type RevenuePoint } from '@/src/components/charts/RevenueChart';
import { BountyCard } from '@/src/components/common/BountyCard';
import { FAB } from '@/src/components/common/FAB';
import { QuickStats, type QuickStat } from '@/src/components/common/QuickStats';
import { RevenueCard } from '@/src/components/common/RevenueCard';
import { TopBar } from '@/src/components/common/TopBar';
import { bountiesQueryKey } from '@/src/hooks/useBounties';
import { revenueQueryKey } from '@/src/hooks/useRevenue';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useBountyStore } from '@/src/store/useBountyStore';
import { useRevenueStore } from '@/src/store/useRevenueStore';
import type { Bounty, RevenueHistoryEntry } from '@/src/types';
import { colors } from '@/src/utils/colors';
import { deadlineCountdown } from '@/src/utils/formatting';

type Range = 7 | 30;

// Bucket won-revenue history into the last `days` days for the chart.
function bucketHistory(history: RevenueHistoryEntry[], days: Range): RevenuePoint[] {
  const buckets = Array.from({ length: days }, (_, i) => ({ day: i, usd: 0 }));
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  for (const entry of history) {
    const d = new Date(entry.date);
    const daysAgo = Math.floor((startOfToday.getTime() - d.getTime()) / 86_400_000);
    if (daysAgo >= 0 && daysAgo < days) {
      buckets[days - 1 - daysAgo].usd += entry.amount;
    }
  }
  return buckets;
}

// Fallback: if the server-side revenue_history log is empty (e.g. trigger not
// applied), derive trend points directly from Won bounties so the chart still
// shows when revenue was earned.
function historyFromBounties(bounties: Bounty[]): RevenueHistoryEntry[] {
  return bounties
    .filter((b) => b.status === 'Won' && b.prizeInUSD > 0)
    .map((b) => ({
      date: b.updatedAt,
      amount: b.prizeInUSD,
      bountyId: b.id,
      category: b.category,
    }));
}

function RangeToggle({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <View className="flex-row rounded-pill bg-background p-1">
      {([7, 30] as Range[]).map((r) => {
        const active = r === range;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            className="rounded-pill px-3 py-1"
            style={{ backgroundColor: active ? colors.primary : 'transparent' }}
          >
            <ThemedText
              className="text-xs font-bold"
              style={{ color: active ? colors.textPrimary : colors.textSecondary }}
            >
              {r}d
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const bounties = useBountyStore((s) => s.bounties);
  const totalRevenueUSD = useRevenueStore((s) => s.totalRevenueUSD);
  const winRate = useRevenueStore((s) => s.winRate);
  const history = useRevenueStore((s) => s.history);

  const [range, setRange] = useState<Range>(7);

  // Refetch live data whenever the dashboard regains focus.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: bountiesQueryKey(userId) });
      queryClient.invalidateQueries({ queryKey: revenueQueryKey(userId) });
    }, [queryClient, userId])
  );

  // Derived stats.
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const active = bounties.filter((b) => b.status === 'Active').length;
  const pending = bounties.filter((b) => b.status === 'Submitted').length;
  const wonThisMonth = bounties.filter((b) => {
    if (b.status !== 'Won') return false;
    const d = new Date(b.updatedAt);
    return `${d.getFullYear()}-${d.getMonth()}` === monthKey;
  }).length;

  const nextDeadline = bounties
    .filter((b) => ['Active', 'Submitted', 'Pending'].includes(b.status))
    .map((b) => b.deadline)
    .filter((d) => new Date(d).getTime() > now.getTime())
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  const localRevenue = bounties
    .filter((b) => b.status === 'Won')
    .reduce((sum, b) => sum + (b.prizeInUSD ?? 0), 0);
  const totalRevenue = totalRevenueUSD || localRevenue;

  // Use server revenue history when available; fall back to Won bounties for
  // trend data if the trigger-maintained log is empty.
  const effectiveHistory = history.length > 0 ? history : historyFromBounties(bounties);
  const chartData = bucketHistory(effectiveHistory, range);
  const hasChartData = chartData.some((p) => p.usd > 0);
  const recent = bounties.slice(0, 4);

  const stats: QuickStat[] = [
    { key: 'active', label: 'Active Bounties', value: String(active), icon: 'flash', tint: colors.status.active },
    { key: 'won', label: 'Won This Month', value: String(wonThisMonth), icon: 'trophy', tint: colors.status.won },
    { key: 'pending', label: 'Pending Submissions', value: String(pending), icon: 'paper-plane', tint: colors.status.submitted },
    {
      key: 'deadline',
      label: 'Next Deadline',
      value: nextDeadline ? deadlineCountdown(nextDeadline) : '—',
      icon: 'alarm',
      tint: colors.status.lost,
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <TopBar title="Garap" />
      <ScrollView
        contentContainerClassName="gap-4 pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue overview */}
        <Animated.View entering={FadeInDown.duration(400)} className="px-5">
          <RevenueCard
            totalUSD={totalRevenue}
            winRate={winRate}
            onSeeBreakdown={() => router.push('/projects')}
          />
        </Animated.View>

        {/* Chart */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} className="mx-5 rounded-card bg-card p-5">
          <View className="mb-3 flex-row items-center justify-between">
            <ThemedText className="text-sm font-bold text-text-primary">Revenue trend</ThemedText>
            <RangeToggle range={range} onChange={setRange} />
          </View>
          {hasChartData ? (
            <RevenueChart data={chartData} />
          ) : (
            <View className="h-[200] items-center justify-center rounded-card bg-background">
              <Ionicons name="trending-up-outline" size={32} color={colors.textSecondary} />
              <ThemedText className="mt-2 text-sm text-text-secondary">
                No revenue trend data yet
              </ThemedText>
            </View>
          )}
        </Animated.View>

        {/* Quick stats */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <QuickStats stats={stats} />
        </Animated.View>

        {/* Recent projects */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)} className="gap-3 px-5">
          <View className="flex-row items-center justify-between">
            <ThemedText className="text-lg font-bold text-text-primary">Recent Projects</ThemedText>
            <Pressable onPress={() => router.push('/projects')} hitSlop={8}>
              <ThemedText className="text-sm font-semibold text-primary-light">View All</ThemedText>
            </Pressable>
          </View>

          {recent.length === 0 ? (
            <View className="items-center rounded-card bg-card p-8">
              <Ionicons name="rocket-outline" size={32} color={colors.textSecondary} />
              <ThemedText className="mt-2 text-sm text-text-secondary">No bounties yet</ThemedText>
            </View>
          ) : (
            recent.map((b) => (
              <BountyCard key={b.id} bounty={b} onPress={() => router.push('/projects')} />
            ))
          )}
        </Animated.View>
      </ScrollView>

      <FAB onPress={() => router.push('/projects')} />
    </View>
  );
}
