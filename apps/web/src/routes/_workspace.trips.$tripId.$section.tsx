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
  const { section, tripId } = useResolvedParams(Route.useParams());
  const { addDestination = false, issue, proposal } = Route.useSearch();

  if (section === 'issues' && issue) {
    return <Navigate params={{ issueId: issue }} replace to="/issues/$issueId" />;
  }

  if (section === 'versions' && proposal) {
    return (
      <Navigate
        params={{ proposalId: proposal, tripId, view: 'compare' }}
        replace
        to="/trips/$tripId/ideas/$proposalId/$view"
      />
    );
  }

  if (section === 'versions') {
    return <Navigate params={{ section: 'ideas', tripId }} replace to="/trips/$tripId/$section" />;
  }

  if (section === 'ideas' && proposal) {
    return (
      <Navigate
        params={{ proposalId: proposal, tripId, view: 'compare' }}
        replace
        to="/trips/$tripId/ideas/$proposalId/$view"
      />
    );
  }

  if (section === 'comments' || section === 'decisions' || !isTripSection(section)) {
    return (
      <Navigate params={{ section: 'overview', tripId }} replace to="/trips/$tripId/$section" />
    );
  }

  return (
    <TripDetailView
      addDestinationOpen={section === 'itinerary' && addDestination}
      section={section}
      tripId={tripId as Id<'trips'>}
    />
  );
}
