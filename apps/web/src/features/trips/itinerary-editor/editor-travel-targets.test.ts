import { expect, test } from 'vite-plus/test';
import { plannerFixture } from '@/testing/trip-planner-fixture';
import type { Destination } from '@/types/trips';
import { travelChoicesForDay, untimedTravelDay } from './editor-travel-targets';

test('offers arrival and departure on the stop days when the trip has open days around them', () => {
  const trip = plannerFixture();
  trip.totalDurationDays = 5;
  const [lisbon, porto] = trip.destinations as [Destination, Destination];
  lisbon.startDay = 2;
  porto.endDay = 3;
  const kinds = (day: number) => travelChoicesForDay(trip, day).map(({ target }) => target.kind);
  expect(kinds(2)).toContain('arrival');
  expect(kinds(3)).toContain('departure');
  expect(kinds(5)).toContain('departure');
  expect(kinds(4)).not.toContain('arrival');
});

test('places untimed transfers on the day they naturally belong to', () => {
  const trip = plannerFixture();
  expect(untimedTravelDay(trip, { kind: 'destination', fromId: 'lisbon' })).toBe(2);
  expect(untimedTravelDay(trip, { kind: 'activity', fromId: 'ribeira' })).toBe(2);
  expect(untimedTravelDay(trip, { kind: 'arrival' })).toBe(1);
  expect(untimedTravelDay(trip, { kind: 'departure' })).toBe(3);
});
