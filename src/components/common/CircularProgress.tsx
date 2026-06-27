// Animated circular progress ring (Analytics Agent — win-rate viz).
// react-native-svg ring with a Reanimated stroke-dashoffset sweep.

import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/src/utils/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  /** 0..100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}

export function CircularProgress({
  percent,
  size = 72,
  strokeWidth = 8,
  color = colors.primaryLight,
  trackColor = '#2A2A40',
  label,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, percent)) / 100;
    progress.value = withTiming(clamped, { duration: 800 });
  }, [percent, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Start the sweep at 12 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="text-base font-bold text-text-primary">{Math.round(percent)}%</Text>
        {label ? <Text className="text-[10px] text-text-secondary">{label}</Text> : null}
      </View>
    </View>
  );
}
