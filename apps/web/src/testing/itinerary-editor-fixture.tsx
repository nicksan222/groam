import type { Id } from '@groam/backend/data-model';
import { useState } from 'react';
import { vi } from 'vite-plus/test';
import { ItineraryEditor } from '@/features/trips/itinerary-editor/itinerary-editor';
import { plannerActivity, plannerDestination } from '@/testing/trip-planner-fixture';
import type {
  Destination,
  TripActivity,
  TripDestinationActivityInput,
  TripDetail
} from '@/types/trips';

/** Calls the stateful editor made, so tests can assert what was (not) saved. */
export const itineraryCalls = {
  addActivity: vi.fn(),
  removeActivity: vi.fn(),
  updateActivity: vi.fn()
};

/** A seven-day idea whose stops cover the given days; nothing is planned yet. */
export function itineraryTrip(
  stops: Array<{ activities?: TripActivity[]; endDay: number; name: string; startDay: number }>,
  totalDurationDays = 7
): TripDetail {
  const destinations = stops.map((stop, index) =>
    plannerDestination({
      activities: stop.activities ?? [],
      endDay: stop.endDay,
      id: `stop-${stop.name.toLowerCase()}` as Destination['id'],
      name: stop.name,
      position: index,
      startDay: stop.startDay,
      stays: [],
      transferToNext: null
    })
  );
  return {
    arrivalTransfer: null,
    currency: 'EUR',
    departureTransfer: null,
    destinations,
    id: 'trip-idea',
    name: 'Idea',
    permissions: { canEdit: true, canPropose: true },
    proposal: null,
    startDate: null,
    totalDurationDays
  } as unknown as TripDetail;
}

export function plannedActivity({
  id,
  ...overrides
}: Omit<Partial<TripActivity>, 'id'> & { id: string; title: string }) {
  return plannerActivity({
    id: id as TripActivity['id'],
    address: null,
    costAmount: null,
    endTime: null,
    notes: null,
    startTime: null,
    timeBlock: 'morning',
    ...overrides
  });
}

function activityFromInput(input: TripDestinationActivityInput, id: string): TripActivity {
  return plannedActivity({
    address: input.address ?? null,
    dayNumber: input.schedule.day,
    endDayNumber: input.schedule.endDay ?? input.schedule.day,
    id,
    notes: input.notes ?? null,
    timeBlock: input.schedule.timeBlock,
    title: input.title
  });
}

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
