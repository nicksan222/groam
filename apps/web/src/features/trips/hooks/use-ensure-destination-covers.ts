import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';

export function useEnsureDestinationCovers(tripId: Id<'trips'>, trip: TripDetail | undefined) {
  const ensure = useMutation(api.routes.trips.destinations.covers.ensure.run);
  const needsEnsure =
    trip?.destinations.some((destination) => destination.coverStatus === null) ?? false;

  useEffect(() => {
    if (!needsEnsure) return;
    void ensure({ tripId });
  }, [ensure, needsEnsure, tripId]);
}
