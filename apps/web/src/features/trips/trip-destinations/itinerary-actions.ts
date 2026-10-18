import type { TripItineraryState } from '@/types/trips';

export type { TripItineraryState };

export function itineraryActionsFromTripState(tripState: TripItineraryState) {
  return {
    addActivity: tripState.addActivity,
    addDestination: tripState.addDestination,
    addStay: tripState.addStay,
    moveDestination: tripState.moveDestination,
    removeActivity: tripState.removeActivity,
    removeActivityTransfer: tripState.removeActivityTransfer,
    removeBoundaryTransfer: tripState.removeBoundaryTransfer,
    removeDestination: tripState.removeDestination,
    removeDestinationTransfer: tripState.removeDestinationTransfer,
    removeStay: tripState.removeStay,
    reorderActivities: tripState.reorderActivities,
    setActivityTransfer: tripState.setActivityTransfer,
    setBoundaryTransfer: tripState.setBoundaryTransfer,
    setDestinationTransfer: tripState.setDestinationTransfer,
    updateActivity: tripState.updateActivity,
    updateDestination: tripState.updateDestination,
    updateStay: tripState.updateStay,
    updateTrip: tripState.update
  };
}
