import '../global.css';
import 'react-native-url-polyfill/auto';

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ToastHost } from '@/src/components/common/Toast';
import { AuthGate } from '@/src/components/common/AuthGate';
import { NavigationErrorBoundary } from '@/src/components/common/NavigationErrorBoundary';
import { useUIStore } from '@/src/store/useUIStore';
import { colors } from '@/src/utils/colors';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Single React Query client for the whole app (Data Sync & Revenue agents).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 2 },
  },
});

export default function RootLayout() {
  const hydrate = useUIStore((s) => s.hydrate);

  // Load the provided Cal Sans font family before rendering screens so text
  // doesn't flash from system font to custom font.
  const [fontsLoaded] = useFonts({
    'CalSansUI-UIRegular': require('@/src/assets/fonts/CalSansUI-UIRegular.otf'),
    'CalSansUI-UIMedium': require('@/src/assets/fonts/CalSansUI-UIMedium.otf'),
    'CalSansUI-UIBold': require('@/src/assets/fonts/CalSansUI-UIBold.otf'),
    'CalSansUI-TextRegular': require('@/src/assets/fonts/CalSansUI-TextRegular.otf'),
    'CalSansUI-TextMedium': require('@/src/assets/fonts/CalSansUI-TextMedium.otf'),
    'CalSansUI-TextBold': require('@/src/assets/fonts/CalSansUI-TextBold.otf'),
  });

  // Garap is dark/violet only — hydrate persisted prefs on startup.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Shared bounty links (garap://bounty/:id) are routed automatically by Expo
  // Router's file-based mapping. OAuth callbacks land on app/auth-callback.tsx,
  // which exchanges the PKCE code and redirects into the app.

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={DarkTheme}>
          <AuthGate>
            <NavigationErrorBoundary>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F0F1E' }}}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="login" />
              <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="bounty/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="bounty/edit/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack>
          </NavigationErrorBoundary>
          </AuthGate>
          <ToastHost />
          <StatusBar style="light" />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
