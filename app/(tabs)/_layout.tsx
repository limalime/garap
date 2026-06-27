import { Tabs } from 'expo-router';
import { Fragment } from 'react';

import { OfflineBanner } from '@/src/components/common/OfflineBanner';
import { FloatingBottomNav } from '@/src/components/common/FloatingBottomNav';
import { useBounties } from '@/src/hooks/useBounties';
import { useBountySync } from '@/src/hooks/useBountySync';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useNotes } from '@/src/hooks/useNotes';
import { useRevenue } from '@/src/hooks/useRevenue';

export default function TabLayout() {
  // Keep network connectivity state live for the authenticated app; triggers
  // the offline banner and lets sync hooks react to coming back online.
  useNetworkStatus();
  // Load bounties once for the whole authenticated app and keep them in sync
  // (Supabase Realtime + offline-queue flush). All tabs read from the store.
  useBounties();
  useBountySync();
  // Load exchange rates + revenue stats and keep the revenue store live.
  useRevenue();
  // Load notes + keep them live via realtime.
  useNotes();

  return (
    <Fragment>
      <OfflineBanner />
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingBottomNav {...props} />}
      >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="projects" options={{ title: 'Projects' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      </Tabs>
    </Fragment>
  );
}
