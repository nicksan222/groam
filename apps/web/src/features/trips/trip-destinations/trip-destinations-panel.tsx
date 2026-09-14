import type { Id } from '@groam/backend/data-model';
import { ItineraryProposalChangesProvider } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import type {
  TripDestinationInput,
  TripDestinationSchedule,
  TripDetail,
  TripUpdateInput
} from '@/features/trips/hooks/use-trips';
import { ItineraryEditor } from '@/features/trips/itinerary-editor/itinerary-editor';
import { AddTripDestinationDialog } from '@/features/trips/trip-destinations/add-trip-destination-dialog';
import { TripDayPlanner } from '@/features/trips/trip-planner/trip-day-planner';
import type { TripActivityActions, TripStayActions } from './destination-types';

export function TripDestinationsPanel({
  addActivity,
  addDestination,
  addDestinationOpen,
  addStay,
  moveDestination,
  onAddDestinationClose,
  onAddDestination,
  onOpenOverview,
  removeActivity,
  removeActivityTransfer,
  removeBoundaryTransfer,
  reorderActivities,
  removeDestination,
  removeDestinationTransfer,
  removeStay,
  setActivityTransfer,
  setBoundaryTransfer,
  setDestinationTransfer,
  trip,
  updateActivity,
  updateDestination,
  updateStay,
  updateTrip
}: TripActivityActions &
  TripStayActions & {
    addDestination: (input: TripDestinationInput) => Promise<boolean>;
    addDestinationOpen: boolean;
    moveDestination: (
      destinationId: Id<'tripDestinations'>,
      direction: 'earlier' | 'later'
    ) => Promise<boolean>;
    onAddDestinationClose: () => void;
    onAddDestination?: () => void;
    onOpenOverview: () => void;
    removeDestination: (destinationId: Id<'tripDestinations'>) => Promise<boolean>;
    trip: TripDetail;
    updateDestination: (
      destinationId: Id<'tripDestinations'>,
      schedule: TripDestinationSchedule
    ) => Promise<boolean>;
    updateTrip: (input: TripUpdateInput) => Promise<boolean>;
  }) {
  const canManage = trip.permissions.canEdit;
  if (!canManage) return <TripDayPlanner trip={trip} />;
  const activityActions: TripActivityActions = {
    addActivity,
    removeActivity,
    removeActivityTransfer,
    removeBoundaryTransfer,
    reorderActivities,
    removeDestinationTransfer,
    setActivityTransfer,
    setBoundaryTransfer,
    setDestinationTransfer,
    updateActivity
  };
  const stayActions: TripStayActions = { addStay, removeStay, updateStay };

  return (
    <ItineraryProposalChangesProvider trip={trip}>
      <ItineraryEditor
        activityActions={activityActions}
        stayActions={stayActions}
        trip={trip}
        moveDestination={moveDestination}
        removeDestination={removeDestination}
        updateDestination={updateDestination}
        updateTrip={updateTrip}
        onAddDestination={onAddDestination}
        onOpenOverview={onOpenOverview}
      />
      {canManage && addDestinationOpen && (
        <AddTripDestinationDialog
          addDestination={addDestination}
          firstDestination={trip.destinations.length === 0}
          onClose={onAddDestinationClose}
        />
      )}
    </ItineraryProposalChangesProvider>
  );
}
