import type { Id } from '@groam/backend/data-model';
import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { sharedTripSection, type TripSection } from '@/features/trips/trip-sections';
import { TripNotFound } from './trip-not-found';
import { WorkingTripRedirect } from './working-trip-redirect';

/**
 * What replaces the trip page when the URL does not name a page of its own: a missing trip, an
 * idea's working copy (sent to its idea workspace), or the planning-only itinerary page of a
 * shared trip (sent to the Overview tab, keeping `?day=N`).
 */
export function tripDetailRedirect({
  addDestinationOpen,
  day,
  exists,
  proposals,
  section,
  trip,
  tripReference
}: {
  addDestinationOpen: boolean;
  day?: number;
  exists: boolean | undefined;
  proposals: Array<{ id: Id<'tripProposals'>; workingTripId: Id<'trips'> }> | undefined;
  section: TripSection;
  trip: TripDetail | undefined;
  tripReference: string;
}): ReactNode {
  if (exists === false) return <TripNotFound />;
  if (!trip) return null;
  if (trip.proposal) {
    if (proposals === undefined) return null;
    return (
      <WorkingTripRedirect
        addDestinationOpen={addDestinationOpen}
        proposals={proposals}
        section={section}
        trip={trip}
      />
    );
  }
  if (sharedTripSection(section) === section) return null;
  return (
    <Navigate
      params={{ section: sharedTripSection(section), tripId: tripReference }}
      replace
      search={day ? { day } : {}}
      to="/trips/$tripId/$section"
    />
  );
}
