import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { formatTripCost } from '@/features/trips/trip-forms/trip-currencies';
import { formatTripDay } from '@/features/trips/trip-local-date-time';
import { OverviewProperties } from './overview-properties';

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

test('renders a properties row instead of metric tiles', async () => {
  await render(
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
  const row = page.getByLabelText('Trip facts');
  await expect.element(row).toHaveClass('min-w-0', 'rounded-xl', 'border-border');
  await expect.element(row).not.toHaveClass('bg-muted');
  await expect.element(row).not.toHaveClass('bg-card');
  expect(row.element().getAttribute('data-slot')).toBe('overview-properties');
  await expect.element(page.getByText('Window')).toBeInTheDocument();
  await expect
    .element(page.getByText('A long weekend in early June with friends'))
    .toBeInTheDocument();
  await expect.element(page.getByText('Length')).toBeInTheDocument();
  await expect.element(page.getByText('4 days')).toBeInTheDocument();
  await expect.element(page.getByText('Stops')).toBeInTheDocument();
  await expect.element(page.getByText('2')).toBeInTheDocument();
  await expect.element(page.getByText('Total')).toBeInTheDocument();
  await expect
    .element(page.getByText(`${formatTripCost(1280, 'EUR')} / ${formatTripCost(2400, 'EUR')}`))
    .toBeInTheDocument();
});

test('shows a calendar range when a start date and length are set', async () => {
  await render(
    <OverviewProperties
      trip={trip({
        startDate: '2026-08-01',
        totalDurationDays: 7
      })}
    />
  );

  await expect
    .element(
      page.getByText(`${formatTripDay('2026-08-01', 1)} – ${formatTripDay('2026-08-01', 7)}`)
    )
    .toBeInTheDocument();
});
