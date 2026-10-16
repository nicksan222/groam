import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { RouteBoard } from './route-board';

function makeTrip(
  destinations: { activities: unknown[]; id: string; name: string }[],
  permissions: { canEdit: boolean; canPropose: boolean }
) {
  return {
    destinations: destinations.map((d) => ({
      coverStatus: null,
      coverUrl: null,
      endDay: null,
      startDay: null,
      ...d
    })),
    permissions
  } as unknown as TripDetail;
}

const stops = [
  { activities: [{ id: 'a1' }, { id: 'a2' }], id: 'd1', name: 'Lisbon' },
  { activities: [{ id: 'a3' }], id: 'd2', name: 'Porto' }
];

describe('RouteBoard', () => {
  test('shows a busy loading state', async () => {
    await render(<RouteBoard isLoading />);
    await expect.element(page.getByText('Route', { exact: true })).toBeVisible();
    await expect
      .element(page.getByText('Stops and activities appear here once the route loads.'))
      .toBeVisible();
  });

  test('lists stops and totals activities', async () => {
    await render(
      <RouteBoard
        onAddDestination={vi.fn()}
        onOpenItinerary={vi.fn()}
        trip={makeTrip(stops, { canEdit: false, canPropose: false })}
      />
    );
    await expect.element(page.getByRole('list', { name: 'Route stops' })).toBeVisible();
    await expect.element(page.getByText('Lisbon')).toBeVisible();
    await expect.element(page.getByText('Porto')).toBeVisible();
    await expect
      .element(page.getByText('3 activities currently planned across the route.'))
      .toBeVisible();
  });

  test('uses the singular for one activity', async () => {
    await render(
      <RouteBoard
        onAddDestination={vi.fn()}
        onOpenItinerary={vi.fn()}
        trip={makeTrip([stops[1]!], { canEdit: false, canPropose: false })}
      />
    );
    await expect
      .element(page.getByText('1 activity currently planned across the route.'))
      .toBeVisible();
  });

  test('empty route invites adding the first destination', async () => {
    const onAddDestination = vi.fn();
    await render(
      <RouteBoard
        onAddDestination={onAddDestination}
        onOpenItinerary={vi.fn()}
        trip={makeTrip([], { canEdit: true, canPropose: false })}
      />
    );
    await expect.element(page.getByText('No route yet')).toBeVisible();
    await page.getByRole('button', { name: /No route yet/ }).click();
    expect(onAddDestination).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['editors', { canEdit: true, canPropose: false }, true],
    ['proposers', { canEdit: false, canPropose: true }, true],
    ['read-only viewers', { canEdit: false, canPropose: false }, false]
  ])('add stop button for %s', async (_, permissions, visible) => {
    const onAddDestination = vi.fn();
    await render(
      <RouteBoard
        onAddDestination={onAddDestination}
        onOpenItinerary={vi.fn()}
        trip={makeTrip(stops, permissions)}
      />
    );
    const button = page.getByTestId(testIds.tripActionAddStop);
    if (!visible) {
      await expect.element(button).not.toBeInTheDocument();
      return;
    }
    await button.click();
    expect(onAddDestination).toHaveBeenCalledTimes(1);
  });

  test('clicking a stop opens the itinerary', async () => {
    const onOpenItinerary = vi.fn();
    await render(
      <RouteBoard
        onAddDestination={vi.fn()}
        onOpenItinerary={onOpenItinerary}
        trip={makeTrip(stops, { canEdit: false, canPropose: false })}
      />
    );
    await page.getByRole('button', { name: /Lisbon/ }).click();
    expect(onOpenItinerary).toHaveBeenCalledTimes(1);
  });
});
