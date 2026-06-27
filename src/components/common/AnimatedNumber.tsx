// Animated number ticker (UI State Agent). Drives a read-only TextInput's text
// from a Reanimated shared value so the count-up runs entirely on the UI thread.

import { useEffect } from 'react';
import { TextInput, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Worklet-safe currency formatter (Intl isn't available on the UI thread).
function formatUSDWorklet(value: number): string {
  'worklet';
  const rounded = Math.round(value * 100) / 100;
  const fixed = rounded.toFixed(2);
  const dot = fixed.indexOf('.');
  let intPart = fixed.slice(0, dot);
  const decPart = fixed.slice(dot + 1);
  let sign = '';
  if (intPart.charAt(0) === '-') {
    sign = '-';
    intPart = intPart.slice(1);
  }
  let grouped = '';
  for (let i = 0; i < intPart.length; i += 1) {
    if (i > 0 && (intPart.length - i) % 3 === 0) grouped += ',';
    grouped += intPart.charAt(i);
  }
  return `${sign}$${grouped}.${decPart}`;
}

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  style?: TextStyle | TextStyle[];
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 800,
  style,
  className,
}: AnimatedNumberProps) {
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(value, { duration });
  }, [value, duration, animated]);

  const animatedProps = useAnimatedProps(() => {
    const text = formatUSDWorklet(animated.value);
    return { text, defaultValue: text } as unknown as { text: string; defaultValue: string };
  });

  return (
    <AnimatedTextInput
      className={className}
      style={style}
      editable={false}
      underlineColorAndroid="transparent"
      value={formatUSDWorklet(value)}
      animatedProps={animatedProps}
      pointerEvents="none"
    />
  );
}
