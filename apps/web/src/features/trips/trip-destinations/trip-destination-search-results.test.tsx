import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripLocation } from '@/features/trips/trip-location';
import { TripDestinationSearchResults } from './trip-destination-search-results';

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

function renderResults(props: Partial<Parameters<typeof TripDestinationSearchResults>[0]> = {}) {
  const onSelect = vi.fn();
  return {
    onSelect,
    ready: render(
      <TripDestinationSearchResults
        disabled={false}
        error={null}
        isLoading={false}
        onSelect={onSelect}
        results={[]}
        {...props}
      />
    )
  };
}

describe('TripDestinationSearchResults', () => {
  test('shows a labeled loading state', async () => {
    await renderResults({ isLoading: true }).ready;
    await expect.element(page.getByRole('status', { name: 'Searching places…' })).toBeVisible();
  });

  test('shows the error instead of results', async () => {
    await renderResults({
      error: 'Location search is unavailable',
      results: [makeLocation()]
    }).ready;
    await expect.element(page.getByText('Location search is unavailable')).toBeVisible();
    await expect.element(page.getByRole('button', { name: /Lisbon/u })).not.toBeInTheDocument();
  });

  test('shows the empty state', async () => {
    await renderResults().ready;
    await expect.element(page.getByText('No matching places found')).toBeVisible();
  });

  test('lists results and selects the clicked one', async () => {
    const porto = makeLocation({ name: 'Porto', placeId: 'osm:2', type: 'City' });
    const { onSelect, ready } = renderResults({ results: [makeLocation(), porto] });
    await ready;
    await expect.element(page.getByRole('button', { name: /Lisbon/u })).toBeVisible();
    await page.getByRole('button', { name: /Porto/u }).click();
    expect(onSelect).toHaveBeenCalledWith(porto);
  });

  test('disables results while disabled', async () => {
    await renderResults({ disabled: true, results: [makeLocation()] }).ready;
    await expect.element(page.getByRole('button', { name: /Lisbon/u })).toBeDisabled();
  });
});
