import { expect, test } from 'vite-plus/test';
import { plannerFixture } from '@/features/trips/testing/planner-fixtures';
import type { TripActivity } from '@/types/trips';
import { buildTripPlanner } from './trip-day-planner';
import { buildTripPlanCalendar } from './trip-plan-calendar';

test('lays a dated trip out as destination and stay spans plus timed plans', () => {
  const trip = plannerFixture();
  const calendar = buildTripPlanCalendar(trip, buildTripPlanner(trip));
  expect(calendar.startDate).toBe('2026-09-14');
  expect(calendar.endDate).toBe('2026-09-16');
  const byId = new Map(calendar.events.map((event) => [event.id, event]));
  expect(byId.get('place-porto')).toMatchObject({
    tone: 'place',
    startDate: '2026-09-15',
    endDate: '2026-09-16'
  });
  // One span per stay instead of separate check-in and check-out moments.
  expect(byId.get('stay-hotel')).toMatchObject({
    tone: 'stay',
    startDate: '2026-09-14',
    endDate: '2026-09-15'
  });
  expect([...byId.keys()].some((id) => id.startsWith('check_'))).toBe(false);
  expect(byId.get('activity-museum')).toMatchObject({ startTime: '10:00', endTime: '12:00' });
  expect(byId.get('travel-train')).toMatchObject({
    tone: 'travel',
    startDate: '2026-09-15',
    startTime: '09:00'
  });
  expect(calendar.details['stay-hotel']).toMatchObject({ kind: 'entry' });
  expect(calendar.details['place-lisbon']).toMatchObject({ kind: 'place' });
});

test('ends a travel leg after its travel time when no arrival is set', () => {
  const trip = plannerFixture();
  const train = trip.destinations[0]?.transferToNext;
  if (train?.timing) train.timing = { ...train.timing, endTime: null };
  const calendar = buildTripPlanCalendar(trip, buildTripPlanner(trip));
  expect(calendar.events.find((event) => event.id === 'travel-train')).toMatchObject({
    endDate: '2026-09-15',
    endTime: '12:00'
  });
});

test('lays an undated trip out from a placeholder Day 1', () => {
  const trip = plannerFixture();
  const calendar = buildTripPlanCalendar({ ...trip, startDate: null }, buildTripPlanner(trip));
  expect(calendar.undated).toBe(true);
  expect(calendar.startDate).toBe('2001-01-01');
  expect(calendar.events.length).toBeGreaterThan(0);
});

test('places untimed travel where it leaves: after a plan, or on the last day at a stop', () => {
  const trip = plannerFixture();
  const lisbon = trip.destinations[0];
  const museum = lisbon?.activities[0];
  if (!(lisbon?.transferToNext && museum)) throw new Error('Expected the fixture train and museum');
  lisbon.transferToNext = { ...lisbon.transferToNext, timing: null };
  museum.transferToNext = {
    id: 'walk',
    toActivityId: 'alfama',
    sourceId: null,
    mode: 'walk',
    timing: null,
    durationMinutes: 20,
    costAmount: null,
    costSplit: 'total',
    attachments: [],
    notes: null
  } as unknown as TripActivity['transferToNext'];
  const calendar = buildTripPlanCalendar(trip, buildTripPlanner(trip));
  const byId = new Map(calendar.events.map((event) => [event.id, event]));
  expect(byId.get('travel-train')).toMatchObject({ startDate: '2026-09-15', startTime: null });
  expect(byId.get('travel-walk')).toMatchObject({
    startDate: '2026-09-14',
    startTime: '12:00',
    endTime: '12:20'
  });
});
