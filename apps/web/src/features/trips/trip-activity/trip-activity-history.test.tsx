import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripActivityHistory } from './trip-activity-history';

afterEach(cleanup);

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

test('renders activity events in a data table with compact filters', () => {
  render(<TripActivityHistory activity={activity} />);

  expect(screen.getByRole('heading', { level: 2, name: 'Activity' })).toBeTruthy();
  expect(screen.getByText('Every planning move the group has made on this trip.')).toBeTruthy();
  expect(screen.getByText('2 events')).toBeTruthy();
  const toolbar = document.querySelector('[aria-label="Filter activity"]');
  expect(toolbar?.className).toContain('flex');
  expect(toolbar?.className).toContain('items-center');
  expect(toolbar?.className).not.toContain('dashboard-panel');
  expect(document.querySelector('table')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Event' })).toBeTruthy();
  expect(screen.getByLabelText('Search activity')).toBeTruthy();
  expect(screen.getByLabelText('Filter activity by person').textContent).toContain('People');
  expect(screen.getByLabelText('Filter activity by action').textContent).toContain('Actions');
  expect(screen.getByText('Alex Traveler created the trip in Idea & Group')).toBeTruthy();
  expect(screen.getByText('Trip created')).toBeTruthy();
  expect(screen.getByText('Idea applied')).toBeTruthy();
  expect(document.querySelector('[data-slot="timeline"]')).toBeNull();
});

test('searches visible activity fields and can clear the filter', () => {
  render(<TripActivityHistory activity={activity} />);

  fireEvent.change(screen.getByLabelText('Search activity'), { target: { value: 'route' } });
  expect(screen.queryByText('Alex Traveler created the trip in Idea & Group')).toBeNull();
  expect(screen.getByText('Sam Planner applied the route update')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Clear activity filters' }));
  expect(screen.getByText('Alex Traveler created the trip in Idea & Group')).toBeTruthy();
  expect(screen.getByText('Sam Planner applied the route update')).toBeTruthy();
});
