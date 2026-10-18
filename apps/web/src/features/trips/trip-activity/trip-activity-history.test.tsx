import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripActivityHistory } from './trip-activity-history';

const activity = [
  {
    actorName: 'Alex Traveler',
    actorUserId: 'user-alex',
    createdAt: Date.UTC(2026, 6, 12, 14, 30),
    id: 'activity-1' as Id<'tripAuditEvents'>,
    message: 'Alex Traveler created the trip in Idea & Group',
    type: 'trip_created'
  },
  {
    actorName: 'Sam Planner',
    actorUserId: 'user-sam',
    createdAt: Date.UTC(2026, 6, 13, 10, 0),
    id: 'activity-2' as Id<'tripAuditEvents'>,
    message: 'Sam Planner applied the route update',
    type: 'proposed_version_merged'
  }
] satisfies TripDetail['activity'];

test('renders activity events in a data table with compact filters', async () => {
  await render(<TripActivityHistory activity={activity} />);

  await expect.element(page.getByText('2 events')).toBeInTheDocument();
  await expect.element(page.getByRole('heading', { name: 'Activity' })).not.toBeInTheDocument();
  await expect.element(page.getByRole('table')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Event' })).toBeInTheDocument();
  await expect.element(page.getByLabelText('Search activity')).toBeInTheDocument();
  expect(page.getByLabelText('Filter activity by person').element().textContent).toContain(
    'People'
  );
  expect(page.getByLabelText('Filter activity by action').element().textContent).toContain(
    'Actions'
  );
  await expect
    .element(page.getByText('Alex Traveler created the trip in Idea & Group'))
    .toBeInTheDocument();
  await expect.element(page.getByText('Trip created')).toBeInTheDocument();
  await expect.element(page.getByText('Idea applied')).toBeInTheDocument();
  expect(document.querySelector('[data-slot="timeline"]')).toBeNull();
});

test('searches visible activity fields and can clear the filter', async () => {
  await render(<TripActivityHistory activity={activity} />);

  await page.getByLabelText('Search activity').fill('route');
  await expect
    .element(page.getByText('Alex Traveler created the trip in Idea & Group'))
    .not.toBeInTheDocument();
  await expect.element(page.getByText('Sam Planner applied the route update')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Clear activity filters' }).click();
  await expect
    .element(page.getByText('Alex Traveler created the trip in Idea & Group'))
    .toBeInTheDocument();
  await expect.element(page.getByText('Sam Planner applied the route update')).toBeInTheDocument();
});
