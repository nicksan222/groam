import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';
import { useTripSidebarActionsStore } from '@/lib/stores/trip-ui-stores';

export function useTripSidebarActions() {
  const archiveMutation = useMutation(api.routes.trips.archive.run);
  const favoriteMutation = useMutation(api.routes.trips.preferences.favorite.run);
  const pendingTripId = useTripSidebarActionsStore((state) => state.pendingTripId);
  const setPendingTripId = useTripSidebarActionsStore((state) => state.setPendingTripId);

  const runTripAction = useCallback(
    async (tripId: Id<'trips'>, action: () => Promise<unknown>, fallback: string) => {
      setPendingTripId(tripId);
      try {
        await action();
      } catch (error: unknown) {
        toast.error(errorMessage(error, fallback));
      } finally {
        setPendingTripId(null);
      }
    },
    [setPendingTripId]
  );

  const archiveTrip = useCallback(
    (tripId: Id<'trips'>) =>
      runTripAction(tripId, () => archiveMutation({ tripId }), 'Unable to archive trip'),
    [archiveMutation, runTripAction]
  );

  const toggleFavorite = useCallback(
    (tripId: Id<'trips'>, favorite: boolean) =>
      runTripAction(
        tripId,
        () => favoriteMutation({ favorite: !favorite, tripId }),
        favorite ? 'Unable to unfavourite trip' : 'Unable to favourite trip'
      ),
    [favoriteMutation, runTripAction]
  );

  return {
    archiveTrip,
    pendingTripId,
    toggleFavorite
  };
}
