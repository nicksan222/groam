import type { Id } from '@groam/backend/data-model';
import { useDiscussions } from './use-discussions';

/** The group chats linked to a trip; pass `undefined` to skip the subscription. */
export function useTripDiscussions(tripId: Id<'trips'> | undefined) {
  const { discussions, isLoading } = useDiscussions(tripId ? undefined : 'skip');
  return {
    discussions: discussions.filter((discussion) => discussion.tripId === tripId),
    isLoading: tripId !== undefined && isLoading
  };
}
