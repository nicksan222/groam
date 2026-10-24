import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripLocation } from '@/features/trips/trip-location';
import { SelectedTripDestination } from './selected-trip-destination';

function makeLocation(overrides: Partial<TripLocation> = {}): TripLocation {
  return {
    context: 'Portugal',
    countryCode: 'PT',
    latitude: 38.72,
    longitude: -9.14,
    name: 'Lisbon',
    placeId: 'osm:1',
    type: 'City',
    ...overrides
  };
}

describe('SelectedTripDestination', () => {
  test.each([
    ['type and context', {}, 'City · Portugal'],
    ['type only', { context: '' }, 'City'],
    ['context only', { type: '' }, 'Portugal']
  ])('shows %s', async (_, overrides, subtitle) => {
    await render(<SelectedTripDestination location={makeLocation(overrides)} />);
    const status = page.getByRole('status');
    await expect.element(status.getByText('Lisbon')).toBeVisible();
    await expect.element(status.getByText(subtitle, { exact: true })).toBeVisible();
  });
});
