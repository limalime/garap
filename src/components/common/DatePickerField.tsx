// Cross-platform date picker (UI State Agent) — a custom month-grid calendar in
// a modal. No native module, so it compiles and behaves identically everywhere.
// Selecting a day yields an ISO string at end-of-day local time (deadlines).

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { colors } from '@/src/utils/colors';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DatePickerFieldProps {
  label?: string;
  value?: string; // ISO
  onChange: (iso: string) => void;
  error?: string;
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

export function DatePickerField({
  label,
  value,
  onChange,
  error,
  visible,
  onOpen,
  onClose,
}: DatePickerFieldProps) {
  const selected = value ? new Date(value) : undefined;
  const initial = selected ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = startOfDay(new Date());

  // Build a grid of cells (null = blank padding).
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

  const pick = (day: number) => {
    const d = new Date(viewYear, viewMonth, day, 23, 59, 59, 0);
    onChange(d.toISOString());
    onClose();
  };

  const display = selected
    ? `${MONTHS[selected.getMonth()].slice(0, 3)} ${selected.getDate()}, ${selected.getFullYear()}`
    : 'Select deadline';

  return (
    <View className="mb-3">
      {label ? (
        <Text className="mb-1 ml-1 text-xs font-semibold text-text-secondary">{label}</Text>
      ) : null}

      <Pressable
        onPress={onOpen}
        className="flex-row items-center justify-between rounded-pill bg-card px-5 py-4"
      >
        <Text className={selected ? 'text-base text-text-primary' : 'text-base text-text-secondary'}>
          {display}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
      </Pressable>
      {error ? <Text className="ml-4 mt-1 text-xs text-status-lost">{error}</Text> : null}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable className="flex-1 items-center justify-center bg-black/60 px-6" onPress={onClose}>
          <Pressable className="w-full rounded-card bg-card p-4" onPress={() => {}}>
            {/* Month header */}
            <View className="mb-3 flex-row items-center justify-between">
              <Pressable onPress={prevMonth} hitSlop={10} className="p-2">
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </Pressable>
              <Text className="text-base font-bold text-text-primary">
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={nextMonth} hitSlop={10} className="p-2">
                <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Weekday labels */}
            <View className="flex-row">
              {WEEKDAYS.map((w, i) => (
                <View key={i} className="flex-1 items-center py-1">
                  <Text className="text-xs text-text-secondary">{w}</Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            <View className="flex-row flex-wrap">
              {cells.map((day, i) => {
                if (day === null) return <View key={`b${i}`} style={{ width: `${100 / 7}%` }} className="py-1" />;
                const cellTime = startOfDay(new Date(viewYear, viewMonth, day));
                const isPast = cellTime < today;
                const isSelected =
                  selected &&
                  selected.getFullYear() === viewYear &&
                  selected.getMonth() === viewMonth &&
                  selected.getDate() === day;
                const isToday = cellTime === today;
                return (
                  <View key={day} style={{ width: `${100 / 7}%` }} className="items-center py-1">
                    <Pressable
                      disabled={isPast}
                      onPress={() => pick(day)}
                      className="h-9 w-9 items-center justify-center rounded-pill"
                      style={{ backgroundColor: isSelected ? colors.primary : 'transparent' }}
                    >
                      <Text
                        style={{
                          color: isPast
                            ? '#4B5563'
                            : isSelected
                              ? colors.textPrimary
                              : isToday
                                ? colors.primaryLight
                                : colors.textPrimary,
                          fontWeight: isToday || isSelected ? '700' : '400',
                        }}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
