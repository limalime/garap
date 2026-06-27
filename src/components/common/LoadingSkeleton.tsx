// Shimmer skeleton placeholder (UI State Agent — loading states).

import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface LoadingSkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  className?: string;
}

export function LoadingSkeleton({
  width = '100%',
  height = 16,
  radius = 8,
  className,
}: LoadingSkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={className}
      style={[
        { width, height, borderRadius: radius, backgroundColor: '#2A2A40' },
        animatedStyle,
      ]}
    />
  );
}

/** Convenience: a stack of card-shaped skeletons. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-3 px-5">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton key={i} height={88} radius={24} />
      ))}
    </View>
  );
}
