import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { plannerFixture } from '@/features/trips/testing/planner-fixtures';
import { TripDayPlanner } from './trip-day-planner';

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

test('leaves the calendar to its own tab: the overview is the day cards', async () => {
  await render(<TripDayPlanner trip={plannerFixture()} />);
  await expect
    .element(page.getByRole('region', { name: 'Day 1 Monday, September 14' }))
    .toBeInTheDocument();
  expect(document.querySelector('[data-plan-calendar]')).toBeNull();
});
