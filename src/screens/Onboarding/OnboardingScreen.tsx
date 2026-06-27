// Onboarding — swipeable intro slides with Lottie animations, page indicators,
// Skip, and Get Started. Marks onboarding complete and routes to Login.

import { useRouter } from 'expo-router';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUIStore } from '@/src/store/useUIStore';

interface Slide {
  key: string;
  title: string;
  body: string;
  animation: AnimationObject | string;
}

const SLIDES: Slide[] = [
  {
    key: 'track',
    title: 'Track every bounty',
    body: 'Hackathons, airdrops, design contests — organize them all in one place.',
    animation: require('@/src/assets/animations/write.json'),
  },
  {
    key: 'revenue',
    title: 'Know your earnings',
    body: 'Auto-convert crypto prizes to USD and watch your revenue grow in real time.',
    animation: require('@/src/assets/animations/money.json'),
  },
  {
    key: 'deadline',
    title: 'Never miss a deadline',
    body: 'Smart reminders synced to your calendar so you always submit on time.',
    animation: require('@/src/assets/animations/deadline.json'),
  },
];

export function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const setOnboardingComplete = useUIStore((s) => s.setOnboardingComplete);

  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = () => {
    setOnboardingComplete(true);
    router.replace('/login');
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      {/* Skip */}
      <Pressable className="z-10 mr-6 self-end py-2" onPress={finish} hitSlop={8}>
        <Text className="text-sm font-semibold text-text-secondary">Skip</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width }} className="flex-1 items-center justify-center px-8">
            <LottieView
              source={item.animation}
              autoPlay
              loop
              style={{ width: width * 0.7, height: width * 0.7 }}
            />
            <Animated.View entering={FadeIn.duration(400)} className="mt-8 items-center">
              <Text className="text-center text-3xl font-bold text-text-primary">
                {item.title}
              </Text>
              <Text className="mt-4 text-center text-base leading-6 text-text-secondary">
                {item.body}
              </Text>
            </Animated.View>
          </View>
        )}
      />

      {/* Page indicators */}
      <View className="mb-6 flex-row justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <View
            key={slide.key}
            className="h-2 rounded-pill"
            style={{
              width: i === index ? 24 : 8,
              backgroundColor: i === index ? '#A78BFA' : '#2A2A40',
            }}
          />
        ))}
      </View>

      {/* CTA */}
      <Pressable
        className="mx-6 items-center rounded-pill bg-primary py-4 active:opacity-80"
        onPress={next}
      >
        <Text className="text-base font-bold text-text-primary">
          {isLast ? 'Get Started' : 'Next'}
        </Text>
      </Pressable>
    </View>
  );
}
