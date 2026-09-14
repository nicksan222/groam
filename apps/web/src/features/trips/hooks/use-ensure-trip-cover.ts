import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';

export function useEnsureTripCover(tripId: Id<'trips'>, trip: TripDetail | undefined) {
  const ensure = useMutation(api.routes.trips.covers.ensure.run);
  const needsEnsure =
    trip !== undefined && trip.coverStatus === null && trip.destinations.length > 0;

  useEffect(() => {
    if (!needsEnsure) return;
    void ensure({ tripId });
  }, [ensure, needsEnsure, tripId]);
}
