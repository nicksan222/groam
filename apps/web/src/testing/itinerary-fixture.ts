import { vi } from 'vite-plus/test';
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

export function activityFromInput(input: TripDestinationActivityInput, id: string): TripActivity {
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
