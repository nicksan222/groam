import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { formatTripCost } from '@/features/trips/trip-forms/trip-currencies';
import { formatTripDay } from '@/features/trips/trip-local-date-time';
import { OverviewProperties } from './overview-properties';

afterEach(cleanup);

function trip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    currency: 'EUR',
    dateNotes: null,
    destinations: [],
    initialBudget: null,
    startDate: null,
    totalDurationDays: null,
    totalPlannedCost: 0,
    ...overrides
  } as TripDetail;
}

test('renders a properties row instead of metric tiles', () => {
  render(
    <OverviewProperties
      trip={trip({
        dateNotes: 'A long weekend in early June with friends',
        destinations: [{}, {}] as TripDetail['destinations'],
        initialBudget: 2400,
        totalDurationDays: 4,
        totalPlannedCost: 1280
      })}
    />
  );

  expect(document.querySelector('[data-slot="metric-tiles"]')).toBeNull();
  const row = document.querySelector('[data-slot="overview-properties"]');
  expect(row).toBeTruthy();
  expect(row?.className).toContain('min-w-0');
  expect(row?.className).toContain('rounded-xl');
  expect(row?.className).toContain('border-border');
  expect(row?.className).not.toContain('bg-muted');
  expect(row?.className).not.toContain('bg-card');
  expect(screen.getByLabelText('Trip facts')).toBeTruthy();
  expect(screen.getByText('Window')).toBeTruthy();
  expect(screen.getByText('A long weekend in early June with friends')).toBeTruthy();
  expect(screen.getByText('Length')).toBeTruthy();
  expect(screen.getByText('4 days')).toBeTruthy();
  expect(screen.getByText('Stops')).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.getByText('Total')).toBeTruthy();
  expect(
    screen.getByText(`${formatTripCost(1280, 'EUR')} / ${formatTripCost(2400, 'EUR')}`)
  ).toBeTruthy();
});

test('shows a calendar range when a start date and length are set', () => {
  render(
    <OverviewProperties
      trip={trip({
        startDate: '2026-08-01',
        totalDurationDays: 7
      })}
    />
  );

  expect(
    screen.getByText(`${formatTripDay('2026-08-01', 1)} – ${formatTripDay('2026-08-01', 7)}`)
  ).toBeTruthy();
});
