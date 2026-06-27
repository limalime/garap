// Settings building blocks — Section wrapper + Row (UI State Agent).

import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/src/utils/colors';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="ml-1 text-xs uppercase tracking-wide text-text-secondary">{title}</Text>
      <View className="overflow-hidden rounded-card bg-card">{children}</View>
    </View>
  );
}

interface RowProps {
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  last?: boolean;
}

export function Row({ label, sublabel, right, onPress, icon, destructive, last }: RowProps) {
  const color = destructive ? colors.status.lost : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center justify-between px-4 py-4 active:opacity-70 ${
        last ? '' : 'border-b border-white/5'
      }`}
    >
      <View className="flex-1 flex-row items-center gap-3">
        {icon ? <Ionicons name={icon} size={18} color={destructive ? colors.status.lost : colors.textSecondary} /> : null}
        <View className="flex-1">
          <Text className="text-base" style={{ color }}>
            {label}
          </Text>
          {sublabel ? <Text className="mt-0.5 text-xs text-text-secondary">{sublabel}</Text> : null}
        </View>
      </View>
      {right}
    </Pressable>
  );
}
