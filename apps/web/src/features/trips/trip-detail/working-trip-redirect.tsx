import type { Id } from '@groam/backend/data-model';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripNotFound } from '@/features/trips/trip-detail/trip-not-found';
import { Navigate } from '@/lib/navigation/router';

/** An idea's working copy has no shared-trip page; its URL sends the viewer to the idea's Overview. */
export function WorkingTripRedirect({
  proposals,
  trip
}: {
  proposals: Array<{ id: Id<'tripProposals'>; workingTripId: Id<'trips'> }> | undefined;
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
        view: 'overview'
      }}
      replace
      search={{}}
      to="/trips/$tripId/ideas/$proposalId/$view"
    />
  );
}
