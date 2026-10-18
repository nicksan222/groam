import type { Id } from '@groam/backend/data-model';
import { Navigate } from '@tanstack/react-router';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripNotFound } from '@/features/trips/trip-detail/trip-not-found';
import type { TripSection } from '@/features/trips/trip-sections';

export function WorkingTripRedirect({
  addDestinationOpen,
  proposals,
  section,
  trip
}: {
  addDestinationOpen: boolean;
  proposals: Array<{ id: Id<'tripProposals'>; workingTripId: Id<'trips'> }> | undefined;
  section: TripSection;
  trip: TripDetail;
}) {
  if (!trip.proposal) return null;
  if (proposals === undefined) return null;
  const proposalId = proposals.find((proposal) => proposal.workingTripId === trip.id)?.id;
  if (!proposalId) return <TripNotFound />;
  return (
    <Navigate
      params={{
        proposalId,
        tripId: trip.proposal.sourceTripId,
        view: section === 'itinerary' ? 'itinerary' : 'overview'
      }}
      replace
      search={addDestinationOpen ? { addDestination: true } : {}}
      to="/trips/$tripId/ideas/$proposalId/$view"
    />
  );
}
