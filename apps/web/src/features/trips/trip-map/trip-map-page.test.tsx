import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { plannerFixture } from '@/features/trips/testing/planner-fixtures';
import { testIds } from '@/lib/test-ids';
import { TripMapPage } from './trip-map-page';

vi.mock('react-map-gl/maplibre', () => ({
  Layer: () => null,
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  NavigationControl: () => null,
  Popup: ({ children }: { children: ReactNode }) => (
    <aside aria-label="Stop popup">{children}</aside>
  ),
  Source: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  default: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>
}));

test('shows every stop as a numbered pill with the day chips and a legend', async () => {
  await render(<TripMapPage trip={plannerFixture()} />);
  await expect.element(page.getByTestId(testIds.tripMapPage)).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Show Lisbon on map' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Show Porto on map' })).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'All days' }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect.element(page.getByRole('list', { name: 'Map legend' })).toBeVisible();
});

test('narrows the map to one day and says when a day has nothing planned', async () => {
  const trip = { ...plannerFixture(), totalDurationDays: 5 } as ReturnType<typeof plannerFixture>;
  await render(<TripMapPage trip={trip} />);
  await page.getByRole('button', { name: 'Day 1' }).click();
  await expect.element(page.getByRole('button', { name: 'Show Lisbon on map' })).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Show Porto on map' }))
    .not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Day 5' }).click();
  await expect.element(page.getByText('Nothing is planned for Day 5 yet.')).toBeVisible();
});

test('opens a popup with the stop days and its next leg', async () => {
  await render(<TripMapPage trip={plannerFixture()} />);
  // The mocked map does not place markers, so the day chips would cover the pill.
  (page.getByRole('button', { name: 'Show Lisbon on map' }).element() as HTMLElement).click();
  await expect.element(page.getByRole('complementary', { name: 'Stop popup' })).toBeVisible();
  await expect.element(page.getByText('Next: Train · 3 h')).toBeVisible();
});

test('invites planning when the trip has no stops', async () => {
  const trip = { ...plannerFixture(), destinations: [] } as unknown as ReturnType<
    typeof plannerFixture
  >;
  await render(<TripMapPage trip={trip} />);
  await expect.element(page.getByRole('region', { name: 'Empty itinerary' })).toBeVisible();
});
