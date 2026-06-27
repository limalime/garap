// Floating glassmorphism bottom navbar — a custom tabBar for expo-router Tabs.
// Pass to <Tabs tabBar={(props) => <FloatingBottomNav {...props} />}>.

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/utils/colors';

// Route name -> Ionicons glyph. Keep in sync with app/(tabs) routes.
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  projects: 'briefcase',
  notes: 'document-text',
  calendar: 'calendar',
};

export function FloatingBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute inset-x-0 items-center"
      style={{ bottom: insets.bottom + 12 }}
      pointerEvents="box-none"
    >
      <BlurView
        intensity={40}
        tint="dark"
        className="flex-row overflow-hidden rounded-pill border border-white/10 px-2 py-2"
        style={{ backgroundColor: 'rgba(26,26,46,0.6)' }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const isFocused = state.index === index;
          const icon = ICONS[route.name] ?? 'ellipse';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              className="flex-row items-center gap-1.5 rounded-pill px-4 py-2"
              style={{ backgroundColor: isFocused ? colors.primary : 'transparent' }}
            >
              <Ionicons
                name={isFocused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
                size={20}
                color={isFocused ? colors.textPrimary : colors.textSecondary}
              />
              {isFocused && (
                <Text className="text-xs font-bold text-text-primary">{label}</Text>
              )}
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}
