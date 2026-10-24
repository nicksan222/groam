import type { Id } from '@groam/backend/data-model';
import { TripDetailView } from '@/features/trips/trip-detail/trip-detail-view';
import { parseTripRouteSearch } from '@/features/trips/trip-route-search';
import { defaultTripSection, isTripSection } from '@/features/trips/trip-sections';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';
import { Navigate, useParams, useSearch } from '@/lib/navigation/router';

export default function TripSectionPage() {
  // Redirects keep the reference as written; ReferenceProvider canonicalizes it once.
  const params = useParams<{ section: string; tripId: string }>();
  const { section = '', tripId = '' } = useResolvedParams(params);
  const { day } = useSearch(parseTripRouteSearch);
  const tripReference = params.tripId ?? '';

  if (!isTripSection(section)) {
    return (
      <Navigate
        params={{ section: defaultTripSection, tripId: tripReference }}
        replace
        to="/trips/$tripId/$section"
      />
    );
  }

  return <TripDetailView day={day} section={section} tripId={tripId as Id<'trips'>} />;
}
