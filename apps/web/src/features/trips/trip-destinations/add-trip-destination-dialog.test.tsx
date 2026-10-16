import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripLocation } from '@/features/trips/trip-location';
import { AddTripDestinationDialog } from './add-trip-destination-dialog';

const search = vi.hoisted(() => ({
  error: null as string | null,
  isLoading: false,
  query: 'Lis',
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
  search.results = [makeLocation()];
});

describe('AddTripDestinationDialog', () => {
  test.each([
    [false, 'Add a destination', 'Add destination'],
    [true, 'Add your first destination', 'Add first destination']
  ])('uses the right copy when firstDestination is %s', async (first, title, submit) => {
    await render(
      <AddTripDestinationDialog
        addDestination={vi.fn()}
        firstDestination={first}
        onClose={vi.fn()}
      />
    );
    await expect.element(page.getByRole('heading', { name: title })).toBeVisible();
    await expect.element(page.getByRole('button', { name: submit })).toBeVisible();
  });

  test('cannot submit until a place is chosen', async () => {
    await render(<AddTripDestinationDialog addDestination={vi.fn()} onClose={vi.fn()} />);
    await expect.element(page.getByRole('button', { name: 'Add destination' })).toBeDisabled();
  });

  test('submits the chosen place with notes and closes on success', async () => {
    const addDestination = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    await render(<AddTripDestinationDialog addDestination={addDestination} onClose={onClose} />);

    await page.getByRole('button', { name: /Lisbon/u }).click();
    await page.getByPlaceholder('Food, neighborhoods, beaches…').fill('Pastries');
    await page.getByRole('button', { name: 'Add destination' }).click();

    await expect.poll(() => addDestination.mock.calls.length).toBe(1);
    expect(addDestination).toHaveBeenCalledWith({
      coordinates: { latitude: 38.72, longitude: -9.14 },
      countryCode: 'PT',
      dayNotes: 'Pastries',
      name: 'Lisbon',
      placeId: 'osm:1',
      status: 'known'
    });
    await expect.poll(() => onClose.mock.calls.length).toBe(1);
  });

  test('omits empty notes and unknown country codes', async () => {
    const addDestination = vi.fn().mockResolvedValue(true);
    search.results = [makeLocation({ countryCode: undefined })];
    await render(<AddTripDestinationDialog addDestination={addDestination} onClose={vi.fn()} />);

    await page.getByRole('button', { name: /Lisbon/u }).click();
    await page.getByRole('button', { name: 'Add destination' }).click();

    await expect.poll(() => addDestination.mock.calls.length).toBe(1);
    expect(addDestination.mock.calls[0]![0]).not.toHaveProperty('dayNotes');
    expect(addDestination.mock.calls[0]![0]).not.toHaveProperty('countryCode');
  });

  test('stays open when adding fails', async () => {
    const addDestination = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();
    await render(<AddTripDestinationDialog addDestination={addDestination} onClose={onClose} />);

    await page.getByRole('button', { name: /Lisbon/u }).click();
    await page.getByRole('button', { name: 'Add destination' }).click();

    await expect.poll(() => addDestination.mock.calls.length).toBe(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('closes from Cancel', async () => {
    const onClose = vi.fn();
    await render(<AddTripDestinationDialog addDestination={vi.fn()} onClose={onClose} />);
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
