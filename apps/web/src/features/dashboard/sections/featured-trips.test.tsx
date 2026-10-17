import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { FeaturedTrips } from './featured-trips';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal);
});

function makeTrip(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    coverUrl: null,
    dateNotes: 'Early June',
    destination: 'Lisbon',
    id: 'trip-1',
    name: 'Lisbon getaway',
    nextAction: null,
    outstandingActionCount: 0,
    ...overrides
  } as unknown as TripListItem;
}

describe('FeaturedTrips', () => {
  test('shows the empty state and the trips link without trips', async () => {
    await render(<FeaturedTrips trips={[]} />);
    await expect.element(page.getByText('No active trips yet')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'View trips' }))
      .toHaveAttribute('href', '/trips');
  });

  test('links each trip to its board with destination and dates', async () => {
    await render(<FeaturedTrips trips={[makeTrip()]} />);
    await expect.element(page.getByRole('heading', { name: 'Lisbon getaway' })).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: /Lisbon getaway/u }))
      .toHaveAttribute('href', '/trips/trip-1/board');
    await expect.element(page.getByText('Early June')).toBeVisible();
    await expect.element(page.getByText('No active trips yet')).not.toBeInTheDocument();
  });

  test('falls back when destination and dates are not set', async () => {
    await render(<FeaturedTrips trips={[makeTrip({ dateNotes: null, destination: null })]} />);
    await expect.element(page.getByText('Destination undecided')).toBeVisible();
    await expect.element(page.getByText('Flexible dates')).toBeVisible();
  });

  test('shows the next action when there is one', async () => {
    await render(<FeaturedTrips trips={[makeTrip({ nextAction: 'Pick a hotel' })]} />);
    await expect.element(page.getByText('Pick a hotel')).toBeVisible();
  });

  test.each([
    [0, null],
    [1, '1 item needs attention'],
    [3, '3 items need attention']
  ])('outstanding count %i shows %s', async (outstandingActionCount, text) => {
    await render(<FeaturedTrips trips={[makeTrip({ outstandingActionCount })]} />);
    if (text) await expect.element(page.getByText(text)).toBeVisible();
    else await expect.element(page.getByText(/attention/u)).not.toBeInTheDocument();
  });
});
