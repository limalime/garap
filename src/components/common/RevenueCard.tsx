// Revenue overview card (Analytics Agent). Violet gradient, animated USD total,
// and a win-rate circular progress with a "See breakdown" link.

import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { AnimatedNumber } from './AnimatedNumber';
import { CircularProgress } from './CircularProgress';

interface RevenueCardProps {
  totalUSD: number;
  winRate: number; // 0..100
  onSeeBreakdown?: () => void;
}

export function RevenueCard({ totalUSD, winRate, onSeeBreakdown }: RevenueCardProps) {
  return (
    <LinearGradient
      colors={['#6B46C1', '#3B2A78']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="overflow-hidden rounded-card p-5"
      style={{ borderRadius: 24 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wide text-white/70">Total Revenue</Text>
          <AnimatedNumber
            value={totalUSD}
            className="mt-1 p-0 text-4xl font-bold text-white"
            style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '700' }}
          />
          {onSeeBreakdown ? (
            <Pressable onPress={onSeeBreakdown} hitSlop={8} className="mt-2 self-start">
              <Text className="text-xs font-semibold text-white/90">See breakdown ›</Text>
            </Pressable>
          ) : null}
        </View>

        <CircularProgress
          percent={winRate}
          size={84}
          color="#FFFFFF"
          trackColor="rgba(255,255,255,0.25)"
          label="win rate"
        />
      </View>
    </LinearGradient>
  );
}
