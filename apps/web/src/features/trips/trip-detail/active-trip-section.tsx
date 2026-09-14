import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripActivityHistory } from '@/features/trips/trip-activity/trip-activity-history';
import { itineraryActionsFromTripState } from '@/features/trips/trip-destinations/itinerary-actions';
import { TripDestinationsPanel } from '@/features/trips/trip-destinations/trip-destinations-panel';
import { TripIdeasPanel } from '@/features/trips/trip-ideas/trip-ideas-panel';
import { TripIssuesPanel } from '@/features/trips/trip-issues/trip-issues-panel';
import { TripOverview } from '@/features/trips/trip-overview/trip-overview';
import { TripReadingOverview } from '@/features/trips/trip-overview/trip-reading-overview';
import type { TripSection } from '@/features/trips/trip-sections';
import type { TripNavigation, TripState } from './trip-detail-types';
import { updateTripDuration } from './update-trip-duration';

export function ActiveTripSection({
  addDestinationOpen,
  navigation,
  onEdit,
  onStartVersion,
  section,
  startingIdea,
  trip,
  tripState
}: {
  addDestinationOpen: boolean;
  navigation: TripNavigation;
  onEdit: () => void;
  onStartVersion?: () => void;
  section: TripSection;
  startingIdea?: boolean;
  trip: TripDetail;
  tripState: TripState;
}) {
  const itinerary = (
    <TripDestinationsPanel
      {...itineraryActionsFromTripState(tripState)}
      addDestinationOpen={addDestinationOpen}
      onAddDestination={navigation.openAddDestination}
      onAddDestinationClose={navigation.closeAddDestination}
      onOpenOverview={() => navigation.openSection('overview')}
      trip={trip}
    />
  );
  if ((section === 'overview' || section === 'itinerary') && !trip.permissions.canEdit) {
    return <TripReadingOverview itinerary={itinerary} trip={trip} tripState={tripState} />;
  }
  if (section === 'overview') {
    return (
      <TripOverview
        hidePageCover
        onAddDestination={navigation.openAddDestination}
        onEditDetails={onEdit}
        onOpenItinerary={() => navigation.openSection('itinerary')}
        onStartVersion={onStartVersion}
        onUpdateDuration={(totalDurationDays, startDate) =>
          updateTripDuration(trip, tripState, totalDurationDays, startDate)
        }
        replaceCover={tripState.replaceCover}
        retryCover={tripState.retryCover}
        trip={trip}
        tripState={tripState}
      />
    );
  }
  if (section === 'issues') {
    return <TripIssuesPanel trip={trip} />;
  }
  if (section === 'ideas') {
    return <TripIdeasPanel onStartIdea={onStartVersion} startingIdea={startingIdea} trip={trip} />;
  }
  if (section === 'itinerary') return itinerary;
  return <TripActivityHistory activity={trip.activity} />;
}
