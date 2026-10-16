import { expect, test } from 'vite-plus/test';
import type { Destination, TripActivity, TripDetail } from '@/types/trips';
import { buildTripPlanner, entryPeriod, entryTime, plannerDate } from './trip-day-planner';

function plannerActivity(overrides: Partial<TripActivity> = {}): TripActivity {
  return {
    id: 'museum',
    sourceId: null,
    title: 'Explore the tile museum',
    dayNumber: 1,
    endDayNumber: 1,
    startTime: '10:00',
    endTime: '12:00',
    timeBlock: 'morning',
    address: 'Lisbon, Portugal',
    notes: 'Leave a little time for the courtyard café.',
    costAmount: 8,
    costSplit: 'per_person',
    attachments: [],
    transferToNext: null,
    ...overrides
  } as TripActivity;
}

function plannerDestination(overrides: Partial<Destination> = {}): Destination {
  return {
    id: 'lisbon',
    sourceId: null,
    name: 'Lisbon',
    startDay: 1,
    endDay: 2,
    activities: [],
    stays: [],
    transferToNext: null,
    latitude: 38.72,
    longitude: -9.14,
    placeId: 'lisbon',
    position: 0,
    coverUrl: null,
    coverStatus: null,
    dayNotes: null,
    ...overrides
  } as Destination;
}

function plannerFixture(): TripDetail {
  const lisbon = plannerDestination({
    activities: [
      plannerActivity(),
      plannerActivity({
        id: 'alfama' as TripActivity['id'],
        title: 'Wander through Alfama',
        startTime: '14:00',
        endTime: '16:00',
        timeBlock: 'afternoon',
        notes: null,
        costAmount: null
      }),
      plannerActivity({
        id: 'dinner' as TripActivity['id'],
        title: 'Dinner by the river',
        startTime: '19:00',
        endTime: '20:30',
        timeBlock: 'evening',
        notes: null,
        costAmount: null
      })
    ],
    stays: [
      {
        id: 'hotel' as Destination['stays'][number]['id'],
        position: 0,
        sourceId: null,
        title: 'Casa do Pátio',
        address: 'Alfama, Lisbon',
        checkInDay: 1,
        checkOutDay: 2,
        checkInTime: '15:00',
        checkOutTime: '08:00',
        notes: 'Bags can be left at reception.',
        attachments: [],
        costAmount: 120,
        costSplit: 'total'
      } as Destination['stays'][number]
    ],
    transferToNext: {
      id: 'train' as NonNullable<Destination['transferToNext']>['id'],
      toDestinationId: 'porto' as Destination['id'],
      sourceId: null,
      mode: 'train',
      timing: { startDay: 2, endDay: 2, startTime: '09:00', endTime: '12:00' },
      durationMinutes: 180,
      costAmount: 30,
      costSplit: 'per_person',
      attachments: [],
      notes: 'Depart from Santa Apolónia station.'
    } as Destination['transferToNext']
  });
  const porto = plannerDestination({
    id: 'porto' as Destination['id'],
    name: 'Porto',
    startDay: 2,
    endDay: 3,
    activities: [
      plannerActivity({
        id: 'ribeira' as TripActivity['id'],
        title: 'Sunset along the Ribeira',
        dayNumber: 2,
        endDayNumber: 2,
        startTime: null,
        endTime: null,
        timeBlock: 'evening',
        address: 'Ribeira, Porto',
        notes: null,
        costAmount: null
      })
    ]
  });
  return {
    id: 'sample-trip',
    name: 'A few days in Portugal',
    currency: 'EUR',
    startDate: '2026-09-14',
    totalDurationDays: 3,
    destinations: [lisbon, porto],
    arrivalTransfer: null,
    departureTransfer: null,
    permissions: { canEdit: false, canPropose: true },
    proposal: null
  } as TripDetail;
}

test('builds consecutive days, timed activities, travel and overnight stays without changing source order', () => {
  const trip = plannerFixture();
  trip.destinations[0]?.activities.reverse();
  const original = JSON.stringify(trip);
  const plan = buildTripPlanner(trip);
  expect(plan.days.map((day) => day.day)).toEqual([1, 2, 3]);
  expect(plan.days[0]?.entries.map((entry) => entry.title)).toEqual([
    'Explore the tile museum',
    'Wander through Alfama',
    'Check in · Casa do Pátio',
    'Dinner by the river'
  ]);
  expect(plan.days[1]?.entries.find((entry) => entry.kind === 'travel')?.title).toBe(
    'Train · Lisbon → Porto'
  );
  expect(plan.days[0]?.stays[0]?.stay.title).toBe('Casa do Pátio');
  expect(plan.days[1]?.stays).toEqual([]);
  expect(plan.days[2]?.stays).toEqual([]);
  expect(JSON.stringify(trip)).toBe(original);
});

test('keeps day numbers alongside dates across month and daylight saving boundaries', () => {
  expect(plannerDate(null, 1)).toBeNull();
  expect(plannerDate('2026-09-30', 2)).toBe('Thursday, October 1');
  expect(plannerDate('2026-03-28', 3)).toBe('Monday, March 30');
});

test('represents multi-day plans on every covered day without inventing times', () => {
  const trip = plannerFixture();
  trip.destinations = [
    plannerDestination({
      activities: [
        plannerActivity({ dayNumber: 1, endDayNumber: 3, startTime: '19:00', endTime: '11:00' })
      ]
    })
  ];
  const plan = buildTripPlanner(trip);
  const entry = plan.days[0]?.entries[0];
  if (!entry) throw new Error('Expected activity');
  expect(plan.days.map((day) => day.entries.length)).toEqual([1, 1, 1]);
  expect(entryPeriod(entry, 1)).toBe('evening');
  expect(entryTime(entry, 1)).toBe('19:00 →');
  expect(entryTime(entry, 2)).toBe('Continues');
  expect(entryTime(entry, 3)).toBe('Until 11:00');
});

test('keeps unscheduled destinations and travel separate from dated plans', () => {
  const trip = plannerFixture();
  const destination = trip.destinations[0];
  if (!destination?.transferToNext) throw new Error('Expected transfer');
  destination.transferToNext.timing = null;
  trip.destinations.push(
    plannerDestination({
      id: 'coimbra' as typeof destination.id,
      startDay: null,
      endDay: null,
      name: 'Coimbra'
    })
  );
  const plan = buildTripPlanner(trip);
  expect(plan.unscheduledDestinations.map((stop) => stop.name)).toEqual(['Coimbra']);
  expect(plan.unscheduledTravel).toHaveLength(1);
  expect(plan.days[1]?.entries.every((entry) => entry.kind !== 'travel')).toBe(true);
});

test('preserves empty days and flexible time labels', () => {
  const trip = plannerFixture();
  trip.destinations = [
    plannerDestination({
      activities: [plannerActivity({ startTime: null, endTime: null, timeBlock: 'afternoon' })]
    })
  ];
  const plan = buildTripPlanner(trip);
  expect(plan.days[2]?.entries).toEqual([]);
  const entry = plan.days[0]?.entries[0];
  if (!entry) throw new Error('Expected activity');
  expect(entryPeriod(entry, 1)).toBe('afternoon');
  expect(entryTime(entry, 1)).toBe('Time open');
});

test('chronological plans preserve activity identity for editing', () => {
  const activities = [
    plannerActivity({ id: 'later', dayNumber: 2, endDayNumber: 2, startTime: '14:00' } as Partial<
      ReturnType<typeof plannerActivity>
    >),
    plannerActivity({ startTime: '11:00' }),
    plannerActivity({ startTime: '09:00' })
  ];
  const trip = plannerFixture();
  trip.destinations = [plannerDestination({ activities })];
  const plan = buildTripPlanner(trip);
  expect(plan.days[0]?.entries.map((entry) => entry.startTime)).toEqual(['09:00', '11:00']);
  const first = plan.days[0]?.entries[0];
  expect(first?.kind === 'activity' && first.activity).toBe(activities[2]);
});
