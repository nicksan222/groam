import type { Id } from '@groam/backend/data-model';
import { TripDetailView } from '@/features/trips/trip-detail/trip-detail-view';
import { parseTripRouteSearch } from '@/features/trips/trip-route-search';
import { isTripSection } from '@/features/trips/trip-sections';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';
import { Navigate, useParams, useSearch } from '@/lib/navigation/router';

export default function TripSectionPage() {
  // Redirects keep the reference as written; ReferenceProvider canonicalizes it once.
  const params = useParams<{ section: string; tripId: string }>();
  const { section = '', tripId = '' } = useResolvedParams(params);
  const { addDestination = false, day, issue, proposal } = useSearch(parseTripRouteSearch);
  const tripReference = params.tripId ?? '';

  if (section === 'issues' && issue) {
    return <Navigate params={{ issueId: issue }} replace to="/issues/$issueId" />;
  }

  // Old links to the Ideas and Versions tabs land on the idea they name.
  if ((section === 'versions' || section === 'ideas') && proposal) {
    return (
      <Navigate
        params={{ proposalId: proposal, tripId: tripReference, view: 'compare' }}
        replace
        to="/trips/$tripId/ideas/$proposalId/$view"
      />
    );
  }

  if (!isTripSection(section)) {
    return (
      <Navigate
        params={{ section: 'board', tripId: tripReference }}
        replace
        to="/trips/$tripId/$section"
      />
    );
  }

  return (
    <TripDetailView
      addDestinationOpen={section === 'itinerary' && addDestination}
      day={day}
      section={section}
      tripId={tripId as Id<'trips'>}
      tripReference={tripReference}
    />
  );
}
