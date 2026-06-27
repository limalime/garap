// Top app bar — wordmark + settings icon (UI State Agent).

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/src/components/common/Wordmark';
import { colors } from '@/src/utils/colors';

interface TopBarProps {
  title?: string;
  showSettings?: boolean;
  showBack?: boolean;
}

export function TopBar({ title = 'Garap', showSettings = true, showBack = false }: TopBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between bg-background px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center gap-2">
        {showBack && (
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        )}
        {title === 'Garap' ? <Wordmark height={28} /> : null}
      </View>

      {showSettings && (
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}
