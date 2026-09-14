import type { Id } from '@groam/backend/data-model';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { ItineraryDetailsBanner } from '@/features/trips/trip-destinations/itinerary-details-banner';
import { ActiveTripSection } from '@/features/trips/trip-detail/active-trip-section';
import type { TripNavigation, TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { TripOverview } from '@/features/trips/trip-overview/trip-overview';
import type { TripSection } from '@/features/trips/trip-sections';
import { TripVersionDetail } from '@/features/trips/trip-versions/trip-version-detail';
import type { IdeaCloneView } from './idea-sections';

export function IdeaCloneBody({
  addDestinationOpen,
  navigation,
  onEdit,
  planningSection,
  proposalId,
  showLoading,
  trip,
  tripState,
  view
}: {
  addDestinationOpen: boolean;
  navigation: TripNavigation;
  onEdit: () => void;
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
      <TripOverview isLoading />
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
      onEdit={onEdit}
      section={planningSection}
      trip={trip}
      tripState={tripState}
    />
  );
}
