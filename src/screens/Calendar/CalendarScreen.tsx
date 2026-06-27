// Calendar screen — month grid with color-coded deadline indicators, an agenda
// view, day details with quick status change + device-calendar sync, and iCal
// export (Calendar & Notification Agent).

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/src/components/common/ThemedText';
import { SelectField } from '@/src/components/common/SelectField';
import { StatusBadge } from '@/src/components/common/StatusBadge';
import { TopBar } from '@/src/components/common/TopBar';
import { useBountyActions } from '@/src/hooks/useBountyActions';
import { useToast } from '@/src/hooks/useToast';
import {
  exportICal,
  getSyncedBountyIds,
  getTimelineDeadlines,
  removeBountyFromCalendar,
  syncBountyToCalendar,
} from '@/src/services/calendar';
import { useBountyStore } from '@/src/store/useBountyStore';
import type { Bounty, BountyStatus } from '@/src/types';
import { colors } from '@/src/utils/colors';
import { nextStatuses } from '@/src/utils/bountyStatus';
import { deadlineCountdown, formatPrize } from '@/src/utils/formatting';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type ViewMode = 'month' | 'agenda';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Urgency color for a deadline relative to now.
function urgencyColor(deadlineISO: string): string {
  const diff = new Date(deadlineISO).getTime() - Date.now();
  if (diff < 0) return colors.status.lost; // overdue (red)
  if (diff < 24 * 3600_000) return '#F97316'; // <24h (orange)
  if (diff < 7 * 24 * 3600_000) return colors.status.won; // this week (yellow)
  return colors.status.submitted; // future (blue)
}

export function CalendarScreen() {
  const toast = useToast();
  const { updateStatus } = useBountyActions();
  const allBounties = useBountyStore((s) => s.bounties);

  const [view, setView] = useState<ViewMode>('month');
  const [search, setSearch] = useState('');
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(dayKey(now));
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const [statusTarget, setStatusTarget] = useState<Bounty | null>(null);

  useEffect(() => {
    getSyncedBountyIds().then((ids) => setSyncedIds(new Set(ids)));
  }, []);

  const bounties = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allBounties.filter(
      (b) => b.status !== 'Archived' && (!q || b.bountyName.toLowerCase().includes(q))
    );
  }, [allBounties, search]);

  // Group deadlines by day for the current month.
  const byDay = useMemo(() => {
    const map = new Map<string, Bounty[]>();
    for (const b of bounties) {
      const d = new Date(b.deadline);
      const key = dayKey(d);
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return map;
  }, [bounties]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectedBounties = selectedKey ? byDay.get(selectedKey) ?? [] : [];
  const agenda = useMemo(() => getTimelineDeadlines(bounties, 30), [bounties]);

  const toggleSync = async (bounty: Bounty) => {
    try {
      if (syncedIds.has(bounty.id)) {
        await removeBountyFromCalendar(bounty.id);
        setSyncedIds((s) => {
          const next = new Set(s);
          next.delete(bounty.id);
          return next;
        });
        toast('success', 'Removed from calendar');
      } else {
        await syncBountyToCalendar(bounty);
        setSyncedIds((s) => new Set(s).add(bounty.id));
        toast('success', 'Synced + reminders set');
      }
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Calendar sync failed');
    }
  };

  const changeStatus = (bounty: Bounty, status: BountyStatus) => {
    Alert.alert('Change status', `Set “${bounty.bountyName}” to ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await updateStatus(bounty.id, status);
            toast('success', `Status: ${status}`);
          } catch {
            toast('error', 'Status change failed');
          }
        },
      },
    ]);
  };

  const exportCalendar = async () => {
    try {
      await Share.share({ message: exportICal(bounties) });
    } catch {
      // dismissed
    }
  };

  const BountyRow = ({ bounty }: { bounty: Bounty }) => (
    <View className="mb-2 flex-row items-center justify-between rounded-card bg-card p-3">
      <View className="flex-1 pr-2">
        <ThemedText className="text-sm font-bold text-text-primary" numberOfLines={1}>
          {bounty.bountyName}
        </ThemedText>
        <ThemedText className="text-xs text-text-secondary">
          {bounty.platform === 'Other' && bounty.platformCustomName
            ? bounty.platformCustomName
            : bounty.platform}{' '}
          · {formatPrize(bounty.prizeAmount, bounty.prizeUnit)} ·{' '}
          {deadlineCountdown(bounty.deadline)}
        </ThemedText>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => toggleSync(bounty)} hitSlop={6}>
          <Ionicons
            name={syncedIds.has(bounty.id) ? 'calendar' : 'calendar-outline'}
            size={20}
            color={syncedIds.has(bounty.id) ? colors.primaryLight : colors.textSecondary}
          />
        </Pressable>
        <Pressable onPress={() => setStatusTarget(bounty)} hitSlop={6}>
          <StatusBadge status={bounty.status} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <TopBar title="Calendar" showSettings={false} />

      {/* Controls */}
      <View className="mx-5 mb-2 flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center gap-2 rounded-pill bg-card px-4 py-2.5">
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search deadlines"
            placeholderTextColor={colors.textSecondary}
            className="flex-1 text-text-primary"
          />
        </View>
        <Pressable onPress={exportCalendar} hitSlop={8} className="h-11 w-11 items-center justify-center rounded-pill bg-card">
          <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* View toggle */}
      <View className="mx-5 mb-3 flex-row rounded-pill bg-card p-1">
        {(['month', 'agenda'] as ViewMode[]).map((m) => {
          const active = m === view;
          return (
            <Pressable
              key={m}
              onPress={() => setView(m)}
              className="flex-1 items-center rounded-pill py-2"
              style={{ backgroundColor: active ? colors.primary : 'transparent' }}
            >
              <ThemedText
                className="text-xs font-bold capitalize"
                style={{ color: active ? colors.textPrimary : colors.textSecondary }}
              >
                {m}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerClassName="px-5 pb-32" showsVerticalScrollIndicator={false}>
        {view === 'month' ? (
          <>
            {/* Month header */}
            <View className="mb-2 flex-row items-center justify-between">
              <Pressable onPress={prevMonth} hitSlop={10} className="p-2">
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </Pressable>
              <ThemedText className="text-base font-bold text-text-primary">
                {MONTHS[viewMonth]} {viewYear}
              </ThemedText>
              <Pressable onPress={nextMonth} hitSlop={10} className="p-2">
                <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View className="flex-row">
              {WEEKDAYS.map((w, i) => (
                <View key={i} className="flex-1 items-center py-1">
                  <ThemedText className="text-xs text-text-secondary">{w}</ThemedText>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {cells.map((day, i) => {
                if (day === null)
                  return <View key={`b${i}`} style={{ width: `${100 / 7}%` }} className="h-12" />;
                const cellDate = new Date(viewYear, viewMonth, day);
                const key = dayKey(cellDate);
                const dayBounties = byDay.get(key) ?? [];
                const isSelected = key === selectedKey;
                const dotColor = dayBounties.length
                  ? urgencyColor(
                      dayBounties.sort(
                        (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
                      )[0].deadline
                    )
                  : undefined;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedKey(key)}
                    style={{ width: `${100 / 7}%` }}
                    className="h-12 items-center justify-center"
                  >
                    <View
                      className="h-9 w-9 items-center justify-center rounded-pill"
                      style={{ backgroundColor: isSelected ? colors.primary : 'transparent' }}
                    >
                      <ThemedText
                        style={{ color: isSelected ? colors.textPrimary : colors.textPrimary }}
                        className="text-sm"
                      >
                        {day}
                      </ThemedText>
                    </View>
                    {dotColor ? (
                      <View
                        className="absolute bottom-1 h-1.5 w-1.5 rounded-pill"
                        style={{ backgroundColor: dotColor }}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Day details */}
            <View className="mt-4">
              <ThemedText className="mb-2 text-sm font-bold text-text-primary">
                {selectedBounties.length
                  ? `${selectedBounties.length} due${selectedKey ? '' : ''}`
                  : 'No deadlines this day'}
              </ThemedText>
              {selectedBounties.map((b) => (
                <BountyRow key={b.id} bounty={b} />
              ))}
            </View>
          </>
        ) : (
          <>
            <ThemedText className="mb-2 text-sm font-bold text-text-primary">Next 30 days</ThemedText>
            {agenda.length === 0 ? (
              <View className="mt-16 items-center">
                <Ionicons name="calendar-clear-outline" size={36} color={colors.textSecondary} />
                <ThemedText className="mt-2 text-sm text-text-secondary">No upcoming deadlines</ThemedText>
              </View>
            ) : (
              agenda.map((b) => <BountyRow key={b.id} bounty={b} />)
            )}
          </>
        )}
      </ScrollView>

      {/* Status change sheet */}
      {statusTarget ? (
        <SelectField
          value={statusTarget.status}
          options={nextStatuses(statusTarget.status)}
          onChange={(status) => {
            const target = statusTarget;
            setStatusTarget(null);
            if (target && status !== target.status) changeStatus(target, status as BountyStatus);
          }}
          visible
          onOpen={() => {}}
          onClose={() => setStatusTarget(null)}
        />
      ) : null}
    </View>
  );
}
