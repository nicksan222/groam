import type { ReactNode } from 'react';
import { TripPollsPanel } from '@/features/polls/trip-polls/trip-polls-panel';
import { ResearchListView } from '@/features/research/research-list/research-list-view';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripBoard } from '@/features/trips/trip-board/trip-board';
import { itineraryActionsFromTripState } from '@/features/trips/trip-destinations/itinerary-actions';
import { TripDestinationsPanel } from '@/features/trips/trip-destinations/trip-destinations-panel';
import { TripIdeasPanel } from '@/features/trips/trip-ideas/trip-ideas-panel';
import { TripIssuesPanel } from '@/features/trips/trip-issues/trip-issues-panel';
import { TripOverview } from '@/features/trips/trip-overview/trip-overview';
import { TripReadingOverview } from '@/features/trips/trip-overview/trip-reading-overview';
import type { TripSection } from '@/features/trips/trip-sections';
import type { TripNavigation, TripState } from './trip-detail-types';
import { TripHistoryPage } from './trip-history-page';
import { TripPlanPage } from './trip-plan-page';
import { updateTripDuration } from './update-trip-duration';

/** One tab of a shared trip; Board is the fallback. */
function sharedTripSection({
  day,
  itinerary,
  onStartVersion,
  section,
  startingIdea,
  trip
}: {
  day?: number;
  itinerary: () => ReactNode;
  onStartVersion?: () => void;
  section: TripSection;
  startingIdea?: boolean;
  trip: TripDetail;
}): ReactNode {
  if (section === 'activity') return <TripHistoryPage trip={trip} />;
  if (section === 'issues') return <TripIssuesPanel trip={trip} />;
  if (section === 'polls') return <TripPollsPanel trip={trip} />;
  if (section === 'ideas')
    return <TripIdeasPanel onStartIdea={onStartVersion} startingIdea={startingIdea} trip={trip} />;
  if (section === 'research')
    return <ResearchListView archived={trip.archivedAt !== null} tripId={trip.id} />;
  if (section === 'overview' || section === 'itinerary')
    return <TripPlanPage day={day} itinerary={itinerary()} trip={trip} />;
  return <TripBoard onStartIdea={onStartVersion} startingIdea={startingIdea} trip={trip} />;
}

/**
 * A trip's section body. A shared trip shows one of its tabs: board, overview, issues, ideas,
 * polls, research, or activity. The idea clone
 * workspace also renders this for an idea's working trip, which is why the proposal branches stay.
 */
export function ActiveTripSection({
  addDestinationOpen,
  day,
  navigation,
  onEdit,
  onStartVersion,
  section,
  startingIdea,
  trip,
  tripState
}: {
  addDestinationOpen: boolean;
  day?: number;
  navigation: TripNavigation;
  onEdit: () => void;
  onStartVersion?: () => void;
  section: TripSection;
  startingIdea?: boolean;
  trip: TripDetail;
  tripState: TripState;
}) {
  const itinerary = () => (
    <TripDestinationsPanel
      {...itineraryActionsFromTripState(tripState)}
      addDestinationOpen={addDestinationOpen}
      onAddDestination={navigation.openAddDestination}
      onAddDestinationClose={navigation.closeAddDestination}
      onOpenOverview={() => navigation.openSection('overview')}
      trip={trip}
    />
  );
  if (!trip.proposal) {
    return sharedTripSection({ day, itinerary, onStartVersion, section, startingIdea, trip });
  }
  if (!trip.permissions.canEdit) return <TripReadingOverview itinerary={itinerary()} trip={trip} />;
  if (section === 'itinerary') return itinerary();
  return (
    <TripOverview
      onAddDestination={navigation.openAddDestination}
      onEditDetails={onEdit}
      onOpenItinerary={() => navigation.openSection('itinerary')}
      onStartVersion={onStartVersion}
      onUpdateDuration={(totalDurationDays, startDate) =>
        updateTripDuration(trip, tripState, totalDurationDays, startDate)
      }
      trip={trip}
      tripState={tripState}
    />
  );
}
