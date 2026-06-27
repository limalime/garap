// Navigation error boundary — catches render errors inside the navigation tree
// and shows a recoverable fallback UI instead of a red-screen.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Component } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/src/utils/colors';

interface Props {
  children: ReactNode;
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
}

interface State {
  error: Error | null;
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <Ionicons name="warning-outline" size={56} color={colors.status.lost} />
      <Text className="mt-5 text-center text-xl font-bold text-text-primary">
        Something went wrong
      </Text>
      <Text className="mt-2 text-center text-sm text-text-secondary" numberOfLines={3}>
        {error.message || 'An unexpected navigation error occurred.'}
      </Text>
      <View className="mt-8 w-full gap-3">
        <Pressable
          onPress={reset}
          className="h-14 items-center justify-center rounded-pill bg-primary active:opacity-80"
        >
          <Text className="text-base font-bold text-text-primary">Try again</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          className="h-14 items-center justify-center rounded-pill border border-white/10 bg-card active:opacity-80"
        >
          <Text className="text-base font-semibold text-text-primary">Go home</Text>
        </Pressable>
      </View>
    </View>
  );
}

export class NavigationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    // In a production app this would be reported to an error-tracking service.
    console.error('[NavigationErrorBoundary]', error, errorInfo.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset });
    }

    return <DefaultFallback error={error} reset={this.reset} />;
  }
}
