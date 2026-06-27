// Bounty edit route screen — wraps the existing BountyDetailModal in edit mode.
// Presented as a modal via Expo Router (app/bounty/edit/[id].tsx).

import { useLocalSearchParams, useRouter } from 'expo-router';

import { BountyDetailModal } from '@/src/components/bounty/BountyDetailModal';
import { useBountyStore } from '@/src/store/useBountyStore';

export function BountyEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const bounty = useBountyStore((s) => s.bounties.find((b) => b.id === id));

  // The modal component handles its own not-found state by rendering an empty
  // edit form when no bounty is passed; we keep the route mounted.
  return (
    <BountyDetailModal
      visible
      mode="edit"
      bounty={bounty}
      onClose={() => router.back()}
    />
  );
}
