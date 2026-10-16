import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { Destination, TripActivity, TripDetail } from '@/types/trips';
import { TripDayPlanner } from './trip-day-planner';

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

vi.mock('@/features/trips/trip-destinations/trip-destinations-map', () => ({
  TripDestinationsMap: () => null
}));

test('makes the day, part of day, exact times and location directly readable', async () => {
  await render(<TripDayPlanner trip={plannerFixture()} />);
  const day = page.getByRole('region', { name: 'Day 1 Monday, September 14' });
  const morning = day.getByRole('region', { name: 'Morning, Day 1' });
  await expect.element(morning.getByText('10:00–12:00')).toBeInTheDocument();
  await expect.element(morning.getByText('Explore the tile museum')).toBeInTheDocument();
  await expect.element(morning.getByText('Lisbon')).toBeInTheDocument();
  await expect.element(day.getByText('Check in · Casa do Pátio')).toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: /add|edit|remove/i }))
    .not.toBeInTheDocument();
  // Every plan's details are already open: nothing to expand or collapse.
  await expect
    .element(morning.getByText('Leave a little time for the courtyard café.'))
    .toBeVisible();
});

test('keeps every plan open with no expand or collapse control', async () => {
  const { container } = await render(<TripDayPlanner trip={plannerFixture()} />);
  expect(container.querySelectorAll('details, summary')).toHaveLength(0);
  await expect.element(page.getByText('Open a plan for the details.')).not.toBeInTheDocument();
});

test('shows unscheduled and empty states without assigning made-up days', async () => {
  const trip = plannerFixture();
  trip.totalDurationDays = null;
  trip.destinations = [];
  await render(<TripDayPlanner trip={trip} />);
  await expect
    .element(page.getByRole('heading', { name: 'The itinerary is still wide open' }))
    .toBeInTheDocument();
  await expect.element(page.getByRole('heading', { name: /^Day / })).not.toBeInTheDocument();
});
