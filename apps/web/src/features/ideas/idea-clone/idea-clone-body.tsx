import type { Id } from '@groam/backend/data-model';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { ItineraryDetailsBanner } from '@/features/trips/trip-destinations/itinerary-details-banner';
import { ActiveTripSection } from '@/features/trips/trip-detail/active-trip-section';
import type { TripNavigation, TripState } from '@/features/trips/trip-detail/trip-detail-types';
import type { TripSection } from '@/features/trips/trip-sections';
import { TripVersionDetail } from '@/features/trips/trip-versions/trip-version-detail';
import type { IdeaCloneView } from './idea-sections';

export function IdeaCloneBody({
  addDestinationOpen,
  navigation,
  planningSection,
  proposalId,
  showLoading,
  trip,
  tripState,
  view
}: {
  addDestinationOpen: boolean;
  navigation: TripNavigation;
  planningSection: TripSection;
  proposalId: Id<'tripProposals'>;
  showLoading: boolean;
  trip?: TripDetail;
  tripState: TripState;
  view: IdeaCloneView;
}) {
  const idea = useOptionalIdeaContext();
  if (showLoading || !trip) {
    return view === 'compare' ? (
      <TripVersionDetail embedded isLoading proposalId={proposalId} />
    ) : (
      <PageLoading label="Loading idea…" />
    );
  }
  if (view === 'compare')
    return (
      <>
        <ItineraryDetailsBanner
          change={idea?.proposal?.changes.find((change) => change.entity === 'details') ?? null}
          trip={trip}
        />
        <TripVersionDetail embedded proposalId={proposalId} />
      </>
    );
  return (
    <ActiveTripSection
      addDestinationOpen={addDestinationOpen}
      navigation={navigation}
      section={planningSection}
      trip={trip}
      tripState={tripState}
    />
  );
}
