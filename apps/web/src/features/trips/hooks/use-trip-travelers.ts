import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, useQuery } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';

export function useTripTravelers(tripId: Id<'trips'> | undefined) {
  const travelers = useQuery(api.routes.trips.travelers.list.run, tripId ? { tripId } : 'skip');
  const setMutation = useMutation(api.routes.trips.travelers.set.run);

  const setStatus = useCallback(
    async (status: 'going' | 'maybe' | 'not_going', userId?: string) => {
      if (!tripId) return false;
      try {
        await setMutation({ status, tripId, ...(userId ? { userId } : {}) });
        return true;
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to update traveler'));
        return false;
      }
    },
    [setMutation, tripId]
  );

  const goingCount = travelers?.filter((traveler) => traveler.status === 'going').length ?? 0;

  return {
    goingCount,
    isLoading: travelers === undefined,
    setStatus,
    travelers: travelers ?? []
  };
}
