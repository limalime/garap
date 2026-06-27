// Quick stats row (Analytics Agent) — horizontal-scrolling metric cards.

import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';

import { colors } from '@/src/utils/colors';

export interface QuickStat {
  key: string;
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
}

function StatCard({ stat }: { stat: QuickStat }) {
  const tint = stat.tint ?? colors.primaryLight;
  return (
    <View className="mr-3 w-36 rounded-card bg-card p-4">
      <View
        className="mb-3 h-9 w-9 items-center justify-center rounded-pill"
        style={{ backgroundColor: `${tint}22` }}
      >
        <Ionicons name={stat.icon} size={18} color={tint} />
      </View>
      <Text className="text-2xl font-bold text-text-primary" numberOfLines={1}>
        {stat.value}
      </Text>
      <Text className="mt-0.5 text-xs text-text-secondary" numberOfLines={1}>
        {stat.label}
      </Text>
    </View>
  );
}

export function QuickStats({ stats }: { stats: QuickStat[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="px-5"
    >
      {stats.map((stat) => (
        <StatCard key={stat.key} stat={stat} />
      ))}
    </ScrollView>
  );
}
