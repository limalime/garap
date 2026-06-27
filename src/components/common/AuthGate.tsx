// Route guard for the Authentication Agent. Runs the auth session bootstrap and
// redirects based on auth + onboarding state. The navigator (children) stays
// mounted at all times; redirects are imperative and a splash overlay covers the
// brief window before the initial session check resolves.

import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthBootstrap } from '@/src/hooks/useAuthBootstrap';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useUIStore } from '@/src/store/useUIStore';
import { colors } from '@/src/utils/colors';

// Top-level route segments reachable while signed out.
const PUBLIC_SEGMENTS = ['onboarding', 'login'];

export function AuthGate({ children }: { children: React.ReactNode }) {
  useAuthBootstrap();

  const initializing = useAuthStore((s) => s.initializing);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingComplete = useUIStore((s) => s.onboardingComplete);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inPublic = PUBLIC_SEGMENTS.includes(segments[0] as string);

    if (!isAuthenticated && !inPublic) {
      router.replace(onboardingComplete ? '/login' : '/onboarding');
    } else if (isAuthenticated && inPublic) {
      router.replace('/(tabs)');
    }
  }, [initializing, isAuthenticated, onboardingComplete, segments, router]);

  return (
    <View className="flex-1">
      {children}
      {initializing && (
        <View className="absolute inset-0 items-center justify-center bg-background">
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      )}
    </View>
  );
}
