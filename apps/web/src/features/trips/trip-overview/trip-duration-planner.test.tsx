import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { TripDurationPlanner } from '@/features/trips/trip-overview/trip-duration-planner';

afterEach(cleanup);

test('renders full-width start and end date fields', () => {
  render(
    <TripDurationPlanner
      canEdit
      minimumDays={1}
      onSave={vi.fn()}
      startDate={null}
      totalDays={null}
    />
  );

  const start = screen.getByRole('button', { name: 'Choose start date' });
  const end = screen.getByRole('button', { name: 'Choose end date' });
  expect(start.className).toContain('w-full');
  expect(end.className).toContain('w-full');
  expect(start.className).not.toContain('max-w-md');
  expect(screen.getByText('Start')).toBeDefined();
  expect(screen.getByText('End')).toBeDefined();
  expect(screen.getByText('Select both dates to set the trip length.')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Saved' })).toBeDefined();
});

test('shows a static locked range and start-idea path for proposers', () => {
  const onStartVersion = vi.fn();
  render(
    <TripDurationPlanner
      canEdit={false}
      canPropose
      minimumDays={1}
      onSave={vi.fn()}
      onStartVersion={onStartVersion}
      startDate="2026-08-01"
      totalDays={7}
    />
  );

  expect(screen.getByText('Shared')).toBeDefined();
  expect(screen.queryByText('Read-only')).toBeNull();
  expect(
    screen.getByText(
      'Everyone sees these dates. Start an idea to try others — the shared trip stays put.'
    )
  ).toBeDefined();
  expect(
    screen.getByText('7 days. Start an idea to try other dates without changing the shared trip.')
  ).toBeDefined();
  const shownDate = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  expect(screen.getByText(shownDate.format(new Date(2026, 7, 1)))).toBeDefined();
  expect(screen.getByText(shownDate.format(new Date(2026, 7, 7)))).toBeDefined();
  expect(screen.queryByRole('button', { name: 'Choose start date' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Choose end date' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Saved' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Save dates' })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'New idea' }));
  expect(onStartVersion).toHaveBeenCalledOnce();
});

test('omits the start-idea control when the viewer cannot propose', () => {
  render(
    <TripDurationPlanner
      canEdit={false}
      canPropose={false}
      minimumDays={1}
      onSave={vi.fn()}
      startDate={null}
      totalDays={null}
    />
  );

  expect(screen.getByText('These dates cannot be edited on the shared trip.')).toBeDefined();
  expect(screen.getByText('Dates are not set.')).toBeDefined();
  expect(screen.getAllByText('Not set')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'New idea' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Choose start date' })).toBeNull();
});
