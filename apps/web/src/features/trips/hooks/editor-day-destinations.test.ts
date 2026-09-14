import { expect, test } from 'vitest';
import { plannerDestination, plannerFixture } from '@/testing/trip-planner-fixture';
import { editorDayDestinations } from './editor-day-destinations';
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

test('previews a sole destination with open dates without assigning it to the day', () => {
  const trip = plannerFixture();
  trip.destinations = [plannerDestination({ startDay: null, endDay: null })];
  const day = buildTripPlanner(trip).days[0];
  expect(editorDayDestinations(day, trip.destinations)).toEqual(trip.destinations);
  expect(trip.destinations[0].startDay).toBeNull();
});
