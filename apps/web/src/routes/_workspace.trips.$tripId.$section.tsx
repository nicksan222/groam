import type { Id } from '@groam/backend/data-model';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { TripDetailView } from '@/features/trips/trip-detail/trip-detail-view';
import { parseTripRouteSearch } from '@/features/trips/trip-route-search';
import { isTripSection } from '@/features/trips/trip-sections';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/trips/$tripId/$section')({
  component: TripSectionRoute,
  validateSearch: parseTripRouteSearch
});

function TripSectionRoute() {
  // Redirects keep the reference as written; ReferenceProvider canonicalizes it once.
  const params = Route.useParams();
  const { section, tripId } = useResolvedParams(params);
  const { addDestination = false, day, issue, proposal } = Route.useSearch();

  if (section === 'issues' && issue) {
    return <Navigate params={{ issueId: issue }} replace to="/issues/$issueId" />;
  }

  // Old links to the Ideas and Versions tabs land on the idea they name.
  if ((section === 'versions' || section === 'ideas') && proposal) {
    return (
      <Navigate
        params={{ proposalId: proposal, tripId: params.tripId, view: 'compare' }}
        replace
        to="/trips/$tripId/ideas/$proposalId/$view"
      />
    );
  }

  if (!isTripSection(section)) {
    return (
      <Navigate
        params={{ section: 'board', tripId: params.tripId }}
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
      tripReference={params.tripId}
    />
  );
}
