import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useTripCreateRequestStore } from '@/lib/stores/trip-create-request-store';
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

test('renders activity events in consistent records with compact filters', async () => {
  await render(<TripActivityHistory activity={activity} />);

  await expect.element(page.getByRole('heading', { name: 'Activity' })).not.toBeInTheDocument();
  await expect.element(page.getByRole('list', { name: 'Jul 12 · 1' })).toBeInTheDocument();
  await expect.element(page.getByLabelText('Sort events')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Filter', exact: true })).toBeVisible();
  await expect
    .element(page.getByText('Alex Traveler created the trip in Idea & Group'))
    .toBeInTheDocument();
  // Rows read as sentences, with a heading per day and no jargon chips.
  await expect.element(page.getByText('Jul 12')).toBeInTheDocument();
  await expect.element(page.getByText('Jul 13')).toBeInTheDocument();
  await expect.element(page.getByText('Trip created', { exact: true })).not.toBeInTheDocument();
  expect(document.querySelector('[data-slot="timeline"]')).toBeNull();
});

test('searches visible activity fields and can clear the filter', async () => {
  await render(<TripActivityHistory activity={activity} />);

  await userEvent.keyboard('k');
  await page.getByRole('combobox').fill('route');
  await userEvent.keyboard('{Enter}');
  await expect
    .element(page.getByText('Alex Traveler created the trip in Idea & Group'))
    .not.toBeInTheDocument();
  await expect.element(page.getByText('Sam Planner applied the route update')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Clear filter' }).click();
  await expect
    .element(page.getByText('Alex Traveler created the trip in Idea & Group'))
    .toBeInTheDocument();
  await expect.element(page.getByText('Sam Planner applied the route update')).toBeInTheDocument();
});

test('combines person and action facets through the shared filter palette', async () => {
  await render(<TripActivityHistory activity={activity} />);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('combobox').fill('person:sam-planner action:idea-applied');
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByText('1 of 2 events')).toBeVisible();
  await expect
    .element(page.getByText('Alex Traveler created the trip in Idea & Group'))
    .not.toBeInTheDocument();
  await expect.element(page.getByText('Sam Planner applied the route update')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filter' }).click();
  await expect
    .element(page.getByText('Alex Traveler created the trip in Idea & Group'))
    .toBeVisible();
});

test('keeps sort and filter controls together in the bottom bar', async () => {
  await render(<TripActivityHistory activity={activity} />);

  const sort = page.getByRole('button', { name: 'Sort events' });
  const filter = page.getByRole('button', { name: 'Filter', exact: true });
  await expect.element(sort).toHaveTextContent('Sort');
  await expect.element(filter).toBeVisible();
  expect(sort.element().closest('[data-slot="list-footer"]')).not.toBeNull();
  expect(filter.element().closest('[data-slot="list-footer"]')).not.toBeNull();
  const controls = document.querySelectorAll('[data-slot="list-controls"]');
  expect(controls).toHaveLength(1);
  expect(controls[0]?.closest('[data-slot="list-footer"]')).not.toBeNull();
});

test('orders activity by its selected time direction even when the input is unsorted', async () => {
  await render(<TripActivityHistory activity={activity} />);
  const eventIds = () =>
    [...document.querySelectorAll('[data-activity-id]')].map((row) =>
      row.getAttribute('data-activity-id')
    );

  expect(eventIds()).toEqual(['activity-2', 'activity-1']);
  await page.getByRole('button', { name: 'Sort events' }).click();
  await page.getByRole('radio', { name: 'Oldest first', exact: true }).click();
  await expect.poll(eventIds).toEqual(['activity-1', 'activity-2']);
});

test('opens mobile sorting from the trip header request and orders oldest first', async () => {
  await useViewport(390, 844);
  useTripCreateRequestStore.getState().request('sort');
  await render(<TripActivityHistory activity={activity} />);

  await expect.element(page.getByRole('dialog', { name: 'Sort events' })).toBeVisible();
  await page.getByRole('radio', { name: 'Oldest first', exact: true }).click();
  await expect
    .poll(() =>
      [...document.querySelectorAll('[data-activity-id]')].map((row) =>
        row.getAttribute('data-activity-id')
      )
    )
    .toEqual(['activity-1', 'activity-2']);
});

test('opens mobile filtering from the trip header search request', async () => {
  await useViewport(390, 844);
  useTripCreateRequestStore.getState().request('search');
  await render(<TripActivityHistory activity={activity} />);

  await expect.element(page.getByRole('dialog', { name: 'Filter events' })).toBeVisible();
  await page.getByRole('combobox').fill('route');
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByText('Sam Planner applied the route update')).toBeVisible();
  await expect
    .element(page.getByText('Alex Traveler created the trip in Idea & Group'))
    .not.toBeInTheDocument();
});
