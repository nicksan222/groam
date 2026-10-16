import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { TripPlanPage } from './trip-plan-page';

vi.mock('@/features/trips/trip-overview/trip-reading-overview', () => ({
  TripReadingOverview: ({ itinerary }: { itinerary: ReactNode }) => <div>{itinerary}</div>
}));

const trip = { id: 'trip-1' as Id<'trips'> } as TripDetail;

test('shows the itinerary without a subpage header or back link', async () => {
  await render(<TripPlanPage itinerary={<p>Lisbon itinerary</p>} trip={trip} />);
  await expect.element(page.getByTestId(testIds.tripPlanPage)).toBeVisible();
  await expect.element(page.getByText('Lisbon itinerary')).toBeVisible();
  await expect.element(page.getByRole('heading', { name: 'Trip plan' })).not.toBeInTheDocument();
  await expect.element(page.getByText('Back to board')).not.toBeInTheDocument();
});

test('scrolls the requested day into view', async () => {
  const day = document.createElement('div');
  day.id = 'trip-day-3';
  day.tabIndex = -1;
  day.scrollIntoView = vi.fn();
  document.body.append(day);
  try {
    await render(<TripPlanPage day={3} itinerary={<p>Lisbon itinerary</p>} trip={trip} />);
    await expect.poll(() => day.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(day);
  } finally {
    day.remove();
  }
});
