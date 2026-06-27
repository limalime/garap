// OAuth redirect-through screen.
//
// Expo Router file-based routing means a deep link to garap://auth-callback lands
// here. We read the PKCE code from the URL params, exchange it for a Supabase
// session, and route the user into the app or back to login on failure.

import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useToast } from '@/src/hooks/useToast';
import { exchangeUrlForSession } from '@/src/services/auth';
import { colors } from '@/src/utils/colors';

function paramsToRecord(
  params: ReturnType<typeof useLocalSearchParams>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      if (value.length > 0) result[key] = value[0];
    } else if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams();

  useEffect(() => {
    async function completeOAuth() {
      // Reconstruct the deep link URL so exchangeUrlForSession can parse the
      // code / error_description query params the same way it would for a
      // manually intercepted URL.
      const queryParams = paramsToRecord(params);
      const url = Linking.createURL('auth-callback', { queryParams });

      // If no code is present, this is not a PKCE callback we can complete here.
      if (!queryParams.code) {
        router.replace('/login');
        return;
      }

      try {
        await exchangeUrlForSession(url);
        router.replace('/(tabs)');
      } catch (err) {
        toast(
          'error',
          err instanceof Error ? err.message : 'Sign in failed. Please try again.'
        );
        router.replace('/login');
      }
    }

    void completeOAuth();
  }, [params, router, toast]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
