import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripLocation } from '@/features/trips/trip-location';
import { AddTripDestinationSearch } from './add-trip-destination-search';

const search = vi.hoisted(() => ({
  error: null as string | null,
  isLoading: false,
  query: '',
  results: [] as unknown[],
  setQuery: vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trip-destination-search', () => ({
  useTripDestinationSearch: () => search
}));

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

beforeEach(() => {
  search.error = null;
  search.isLoading = false;
  search.query = '';
  search.results = [];
  search.setQuery.mockReset();
});

describe('AddTripDestinationSearch', () => {
  test('waits for a longer query before showing results', async () => {
    search.query = 'L';
    await render(<AddTripDestinationSearch disabled={false} onSelect={vi.fn()} selected={null} />);
    await expect
      .element(page.getByText('Search for a city, region, or landmark, then select a result.'))
      .toBeVisible();
    await expect
      .element(page.getByRole('region', { name: 'Destination results' }))
      .not.toBeInTheDocument();
  });

  test('clears the selection and updates the query when typing', async () => {
    const onSelect = vi.fn();
    await render(<AddTripDestinationSearch disabled={false} onSelect={onSelect} selected={null} />);
    await page.getByLabelText('Search destinations').fill('Li');
    expect(onSelect).toHaveBeenCalledWith(null);
    expect(search.setQuery).toHaveBeenCalledWith('Li');
  });

  test('shows results and passes the picked place on', async () => {
    search.query = 'Lis';
    const lisbon = makeLocation();
    search.results = [lisbon];
    const onSelect = vi.fn();
    await render(<AddTripDestinationSearch disabled={false} onSelect={onSelect} selected={null} />);
    await expect.element(page.getByRole('region', { name: 'Destination results' })).toBeVisible();
    await expect
      .element(page.getByText('Place data from OpenStreetMap contributors'))
      .toBeVisible();
    await page.getByRole('button', { name: /Lisbon/u }).click();
    expect(onSelect).toHaveBeenCalledWith(lisbon);
  });

  test('marks the results region busy while searching', async () => {
    search.query = 'Lis';
    search.isLoading = true;
    await render(<AddTripDestinationSearch disabled={false} onSelect={vi.fn()} selected={null} />);
    await expect
      .element(page.getByRole('region', { name: 'Destination results' }))
      .toHaveAttribute('aria-busy', 'true');
  });

  test('shows search errors', async () => {
    search.query = 'Lis';
    search.error = 'Location search is unavailable';
    await render(<AddTripDestinationSearch disabled={false} onSelect={vi.fn()} selected={null} />);
    await expect.element(page.getByText('Location search is unavailable')).toBeVisible();
  });

  test('replaces results with the selected destination', async () => {
    search.query = 'Lisbon';
    search.results = [makeLocation()];
    await render(
      <AddTripDestinationSearch disabled={false} onSelect={vi.fn()} selected={makeLocation()} />
    );
    await expect
      .element(page.getByText('Destination selected. Search again to choose a different place.'))
      .toBeVisible();
    await expect.element(page.getByRole('status')).toBeVisible();
    await expect
      .element(page.getByRole('region', { name: 'Destination results' }))
      .not.toBeInTheDocument();
  });

  test('disables the input and results when disabled', async () => {
    search.query = 'Lis';
    search.results = [makeLocation()];
    await render(<AddTripDestinationSearch disabled onSelect={vi.fn()} selected={null} />);
    await expect.element(page.getByLabelText('Search destinations')).toBeDisabled();
    await expect.element(page.getByRole('button', { name: /Lisbon/u })).toBeDisabled();
  });

  test('links the hint to the input when given an id', async () => {
    await render(
      <AddTripDestinationSearch disabled={false} id="dest" onSelect={vi.fn()} selected={null} />
    );
    await expect
      .element(page.getByLabelText('Search destinations'))
      .toHaveAttribute('aria-describedby', 'dest-hint');
  });
});
