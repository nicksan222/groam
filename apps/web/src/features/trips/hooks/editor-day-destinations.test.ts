import { expect, test } from 'vitest';
import { plannerDestination, plannerFixture } from '@/testing/trip-planner-fixture';
import {
  activityDaysForDestination,
  destinationsForDay,
  editorDayDestinations
} from './editor-day-destinations';
import { buildTripPlanner } from './trip-day-planner';

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
