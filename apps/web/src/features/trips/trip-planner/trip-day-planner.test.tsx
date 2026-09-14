import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { plannerFixture } from '@/testing/trip-planner-fixture';
import { TripDayPlanner } from './trip-day-planner';

vi.mock('@/features/trips/trip-destinations/trip-destinations-map', () => ({
  TripDestinationsMap: () => null
}));
afterEach(cleanup);

test('makes the day, part of day, exact times and location directly readable', () => {
  render(<TripDayPlanner trip={plannerFixture()} />);
  const day = screen.getByRole('region', { name: 'Day 1 Monday, September 14' });
  const morning = within(day).getByRole('region', { name: 'Morning, Day 1' });
  expect(within(morning).getByText('10:00–12:00')).toBeTruthy();
  expect(within(morning).getByText('Explore the tile museum')).toBeTruthy();
  expect(within(morning).getByText('Lisbon')).toBeTruthy();
  expect(within(day).getByText('Check in · Casa do Pátio')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /add|edit|remove/i })).toBeNull();
  fireEvent.click(within(morning).getByText('Explore the tile museum'));
  expect(
    within(morning).getByText('Leave a little time for the courtyard café.').closest('details')
      ?.open
  ).toBe(true);
});

test('shows unscheduled and empty states without assigning made-up days', () => {
  const trip = plannerFixture();
  trip.totalDurationDays = null;
  trip.destinations = [];
  render(<TripDayPlanner trip={trip} />);
  expect(screen.getByRole('heading', { name: 'The itinerary is still wide open' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: /^Day / })).toBeNull();
});
