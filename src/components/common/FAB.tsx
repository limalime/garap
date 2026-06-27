// Floating action button (UI State Agent). Bottom-right, scale-on-press.

import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/utils/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FAB({ onPress, icon = 'add' }: FABProps) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.88, { damping: 12, stiffness: 220 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
      }}
      accessibilityRole="button"
      accessibilityLabel="Create new bounty"
      className="absolute h-16 w-16 items-center justify-center rounded-pill bg-primary shadow-lg"
      style={[
        { right: 20, bottom: insets.bottom + 90, shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
        animatedStyle,
      ]}
    >
      <Ionicons name={icon} size={30} color={colors.textPrimary} />
    </AnimatedPressable>
  );
}
