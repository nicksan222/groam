import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useQuery } from 'convex/react';

/** Lightweight trip lookup without cover-ensure side effects. */
export function useTripRecord(tripId: Id<'trips'> | undefined) {
  return useQuery(api.routes.trips.find.run, tripId ? { tripId } : 'skip');
}
