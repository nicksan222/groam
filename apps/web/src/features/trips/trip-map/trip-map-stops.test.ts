import { expect, test } from 'vite-plus/test';
import { plannerFixture } from '@/features/trips/testing/planner-fixtures';
import {
  dayHue,
  legLabel,
  mapDayCount,
  mapLegs,
  mapStops,
  stopDaysLabel,
  stopsOnDay
} from './trip-map-stops';

const trip = plannerFixture();

test('numbers every stop across the route and colors it by the day it starts', () => {
  const stops = mapStops(trip.destinations);
  expect(stops.map(({ number }) => number)).toEqual([1, 2]);
  expect(stops.map(({ colorDay }) => colorDay)).toEqual([1, 2]);
});

test('cycles five day hues and mutes a stop with no day', () => {
  expect(dayHue(1)).toBe('var(--chart-1)');
  expect(dayHue(5)).toBe('var(--chart-5)');
  expect(dayHue(6)).toBe('var(--chart-1)');
  expect(dayHue(null)).toBe('var(--muted-foreground)');
});

test('narrows to the stops the trip is at on a day, tinted in that day', () => {
  const stops = mapStops(trip.destinations);
  expect(stopsOnDay(stops, null)).toHaveLength(2);
  const onTwo = stopsOnDay(stops, 2);
  expect(onTwo.map(({ destination }) => destination.name)).toContain('Porto');
  expect(onTwo.every(({ colorDay }) => colorDay === 2)).toBe(true);
  expect(stopsOnDay(stops, 9)).toEqual([]);
});

test('counts the days from the plan length or the furthest stop', () => {
  expect(mapDayCount(3, trip.destinations)).toBe(3);
  expect(mapDayCount(null, trip.destinations)).toBe(3);
  expect(mapDayCount(null, [])).toBe(0);
});

test('draws one leg between neighbouring visible stops, in the hue of the one it leaves', () => {
  const legs = mapLegs(mapStops(trip.destinations));
  expect(legs).toHaveLength(1);
  expect(legs[0]?.colorDay).toBe(1);
  expect(mapLegs(mapStops(trip.destinations).slice(0, 1))).toEqual([]);
});

test('words the days and the leg out of a stop', () => {
  expect(stopDaysLabel({ endDay: null, startDay: null })).toBe('Days to be decided');
  expect(stopDaysLabel({ endDay: 1, startDay: 1 })).toBe('Day 1');
  expect(stopDaysLabel({ endDay: 3, startDay: 2 })).toBe('Days 2–3');
  expect(legLabel(trip.destinations[0]?.transferToNext ?? null)).toBe('Train · 3 h');
  expect(legLabel(null)).toBeNull();
});
