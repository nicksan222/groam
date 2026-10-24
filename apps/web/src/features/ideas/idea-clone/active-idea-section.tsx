import type { Id } from '@groam/backend/data-model';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { itineraryActionsFromTripState } from '@/features/trips/trip-destinations/itinerary-actions';
import { TripDestinationsPanel } from '@/features/trips/trip-destinations/trip-destinations-panel';
import { TripCalendarPage } from '@/features/trips/trip-detail/trip-calendar-page';
import type { TripNavigation, TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { TripPlanPage } from '@/features/trips/trip-detail/trip-plan-page';
import { TripPackingPanel } from '@/features/trips/trip-packing/trip-packing-panel';
import { TripDayPlanner } from '@/features/trips/trip-planner/trip-day-planner';
import type { IdeaPlanningSection } from '@/types/ideas';

/**
 * The body of one of an idea working copy's planning views. Its Overview is the read-only days
 * view of the trip it would become, its Calendar the plan on a calendar, and its author changes
 * the plan on the Itinerary view.
 */
export function ActiveIdeaSection({
  addDestinationOpen,
  day,
  navigation,
  proposalId,
  section,
  trip,
  tripState
}: {
  addDestinationOpen: boolean;
  day?: number;
  navigation: TripNavigation;
  proposalId: Id<'tripProposals'>;
  section: IdeaPlanningSection;
  trip: TripDetail;
  tripState: TripState;
}) {
  if (section === 'packing') return <TripPackingPanel trip={trip} />;
  if (section === 'calendar')
    return (
      <TripCalendarPage
        day={day}
        fill
        planning={
          trip.permissions.canEdit
            ? { mode: 'add', addActivity: tripState.addActivity, proposalId }
            : undefined
        }
        trip={trip}
      />
    );
  if (section === 'itinerary' && trip.permissions.canEdit) {
    return (
      <TripDestinationsPanel
        {...itineraryActionsFromTripState(tripState)}
        addDestinationOpen={addDestinationOpen}
        onAddDestination={navigation.openAddDestination}
        onAddDestinationClose={navigation.closeAddDestination}
        onOpenOverview={() => navigation.openSection('overview')}
        trip={trip}
      />
    );
  }
  return <TripPlanPage day={day} itinerary={<TripDayPlanner trip={trip} />} trip={trip} />;
}
