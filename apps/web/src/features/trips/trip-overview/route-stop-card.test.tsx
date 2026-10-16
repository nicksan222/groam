import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { RouteStopCard } from './route-stop-card';

function makeDestination(
  overrides: Partial<TripDetail['destinations'][number]> = {}
): TripDetail['destinations'][number] {
  return {
    activities: [],
    coverStatus: null,
    coverUrl: null,
    endDay: 3,
    id: 'dest-1',
    name: 'Lisbon',
    startDay: 1,
    ...overrides
  } as unknown as TripDetail['destinations'][number];
}

describe('RouteStopCard', () => {
  test.each([
    ['a day range', { endDay: 3, startDay: 1 }, 'Days 1–3'],
    ['a single day', { endDay: 2, startDay: 2 }, 'Day 2'],
    ['no assigned days', { endDay: null, startDay: null }, 'Days not assigned']
  ])('labels %s', async (_, overrides, label) => {
    await render(
      <ul>
        <RouteStopCard
          destination={makeDestination(overrides)}
          onOpenItinerary={vi.fn()}
          stop={1}
        />
      </ul>
    );
    await expect.element(page.getByText(label, { exact: true })).toBeVisible();
    await expect.element(page.getByText('Lisbon', { exact: true })).toBeVisible();
  });

  test.each([
    [0, '0 activities'],
    [1, '1 activity'],
    [3, '3 activities']
  ])('pluralizes %i activities', async (count, label) => {
    const activities = Array.from({ length: count }, (_, i) => ({ id: `a-${i}` }));
    await render(
      <ul>
        <RouteStopCard
          destination={makeDestination({ activities } as never)}
          onOpenItinerary={vi.fn()}
          stop={1}
        />
      </ul>
    );
    await expect.element(page.getByText(label)).toBeVisible();
  });

  test('opens the itinerary on click', async () => {
    const onOpenItinerary = vi.fn();
    await render(
      <ul>
        <RouteStopCard destination={makeDestination()} onOpenItinerary={onOpenItinerary} stop={2} />
      </ul>
    );
    await page.getByRole('button').click();
    expect(onOpenItinerary).toHaveBeenCalledTimes(1);
  });
});
