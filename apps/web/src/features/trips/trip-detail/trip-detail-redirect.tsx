import type { Id } from '@groam/backend/data-model';
import type { ReactNode } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripNotFound } from './trip-not-found';
import { WorkingTripRedirect } from './working-trip-redirect';

/**
 * What replaces the trip page when the URL does not name a page of its own: a missing trip, or an
 * idea's working copy (sent to its idea workspace).
 */
export function tripDetailRedirect({
  exists,
  proposals,
  trip
}: {
  exists: boolean | undefined;
  proposals: Array<{ id: Id<'tripProposals'>; workingTripId: Id<'trips'> }> | undefined;
  trip: TripDetail | undefined;
}): ReactNode {
  if (exists === false) return <TripNotFound />;
  if (!trip) return null;
  if (trip.proposal) {
    if (proposals === undefined) return null;
    return <WorkingTripRedirect proposals={proposals} trip={trip} />;
  }
  return null;
}
