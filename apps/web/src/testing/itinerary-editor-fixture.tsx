import type { Id } from '@groam/backend/data-model';
import { useState } from 'react';
import { ItineraryEditor } from '@/features/trips/itinerary-editor/itinerary-editor';
import { activityFromInput, itineraryCalls } from '@/testing/itinerary-fixture';
import type { Destination, TripDestinationActivityInput, TripDetail } from '@/types/trips';

const succeed = () => Promise.resolve(true);

/** The itinerary editor wired to in-memory activity actions that update the trip like the backend. */
export function StatefulItineraryEditor({
  initial,
  standalone = true
}: {
  initial: TripDetail;
  /** False when a trip page shell already surrounds the editor. */
  standalone?: boolean;
}) {
  const [trip, setTrip] = useState(initial);
  const [nextId, setNextId] = useState(1);
  const mapStops = (change: (stop: Destination) => Destination) =>
    setTrip((current) => ({ ...current, destinations: current.destinations.map(change) }));
  const activityActions = {
    addActivity: (destinationId: Id<'tripDestinations'>, input: TripDestinationActivityInput) => {
      itineraryCalls.addActivity(destinationId, input);
      const added = activityFromInput(input, `new-${nextId}`);
      setNextId(nextId + 1);
      mapStops((stop) =>
        stop.id === destinationId ? { ...stop, activities: [...stop.activities, added] } : stop
      );
      return succeed();
    },
    removeActivity: (activityId: Id<'tripDestinationActivities'>) => {
      itineraryCalls.removeActivity(activityId);
      mapStops((stop) => ({
        ...stop,
        activities: stop.activities.filter((activity) => activity.id !== activityId)
      }));
      return succeed();
    },
    reorderActivities: succeed,
    removeActivityTransfer: succeed,
    removeBoundaryTransfer: succeed,
    removeDestinationTransfer: succeed,
    setActivityTransfer: succeed,
    setBoundaryTransfer: succeed,
    setDestinationTransfer: succeed,
    updateActivity: (
      activityId: Id<'tripDestinationActivities'>,
      input: TripDestinationActivityInput
    ) => {
      itineraryCalls.updateActivity(activityId, input);
      mapStops((stop) => ({
        ...stop,
        activities: stop.activities.map((activity) =>
          activity.id === activityId ? activityFromInput(input, activityId) : activity
        )
      }));
      return succeed();
    }
  };
  const editor = (
    <ItineraryEditor
      activityActions={activityActions}
      moveDestination={succeed}
      onOpenOverview={() => undefined}
      removeDestination={succeed}
      stayActions={{ addStay: succeed, removeStay: succeed, updateStay: succeed }}
      trip={trip}
      updateDestination={succeed}
      updateTrip={succeed}
    />
  );
  // The trip page turns off the section reveal animation; without it every first click waits for it.
  return standalone ? <div className="trip-page-shell">{editor}</div> : editor;
}
