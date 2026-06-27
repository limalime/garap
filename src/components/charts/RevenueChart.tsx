// Revenue line chart (Analytics Agent) — victory-native v41 (Skia-based).

import { View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

import { colors } from '@/src/utils/colors';

export interface RevenuePoint {
  /** Day index or timestamp (x axis). */
  day: number;
  /** USD revenue for that day (y axis). */
  usd: number;
  // victory-native's CartesianChart requires rows to satisfy Record<string, unknown>.
  [key: string]: number;
}

interface RevenueChartProps {
  data: RevenuePoint[];
  height?: number;
}

export function RevenueChart({ data, height = 200 }: RevenueChartProps) {
  return (
    <View style={{ height }}>
      <CartesianChart data={data} xKey="day" yKeys={['usd']}>
        {({ points }) => (
          <Line points={points.usd} color={colors.primaryLight} strokeWidth={3} />
        )}
      </CartesianChart>
    </View>
  );
}
