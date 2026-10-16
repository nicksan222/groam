import { expect, test } from 'vite-plus/test';
import type { Destination, TripActivity, TripDetail } from '@/types/trips';
import {
  activityDaysForDestination,
  destinationsForDay,
  editorDayDestinations
} from './editor-day-destinations';
import { buildTripPlanner } from './trip-day-planner';

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

test('keeps both places on a travel day in route order', () => {
  const trip = plannerFixture();
  const day = buildTripPlanner(trip).days[1];
  expect(editorDayDestinations(day, trip.destinations).map((stop) => stop.name)).toEqual([
    'Lisbon',
    'Porto'
  ]);
});

test('finds the place through scheduled activities and stays before route days are assigned', () => {
  const trip = plannerFixture();
  trip.destinations.forEach((stop) => {
    stop.startDay = null;
    stop.endDay = null;
  });
  const day = buildTripPlanner(trip).days[0];
  expect(editorDayDestinations(day, trip.destinations).map((stop) => stop.name)).toEqual([
    'Lisbon'
  ]);
});

test('does not show an unrelated destination on an open day', () => {
  const trip = plannerFixture();
  trip.destinations = [plannerDestination({ startDay: 1, endDay: 1 })];
  const day = buildTripPlanner(trip).days[2];
  expect(editorDayDestinations(day, trip.destinations)).toEqual([]);
});

test('allows scheduled and unscheduled destinations only on eligible days', () => {
  const trip = plannerFixture();
  trip.destinations[0].startDay = 1;
  trip.destinations[0].endDay = 3;
  trip.destinations[1].startDay = 4;
  trip.destinations[1].endDay = 5;
  expect(destinationsForDay(trip.destinations, 4).map((stop) => stop.name)).toEqual(['Porto']);
  trip.destinations[1].startDay = null;
  trip.destinations[1].endDay = null;
  expect(destinationsForDay(trip.destinations, 2).map((stop) => stop.name)).toEqual([
    'Lisbon',
    'Porto'
  ]);
  expect(destinationsForDay(trip.destinations, 6).map((stop) => stop.name)).toEqual(['Porto']);
});

test('keeps an inline draft but resets days outside the newly selected destination', () => {
  const destination = plannerDestination({ startDay: 2, endDay: 5 });
  expect(activityDaysForDestination('2', '4', destination, 2)).toEqual({
    dayNumber: '2',
    endDayNumber: '4'
  });
  expect(activityDaysForDestination('1', '2', destination, 2)).toEqual({
    dayNumber: '2',
    endDayNumber: '2'
  });
  expect(activityDaysForDestination('4', '6', destination, 2)).toEqual({
    dayNumber: '2',
    endDayNumber: '2'
  });
});

test('previews a sole destination with open dates without assigning it to the day', () => {
  const trip = plannerFixture();
  trip.destinations = [plannerDestination({ startDay: null, endDay: null })];
  const day = buildTripPlanner(trip).days[0];
  expect(editorDayDestinations(day, trip.destinations)).toEqual(trip.destinations);
  expect(trip.destinations[0].startDay).toBeNull();
});
