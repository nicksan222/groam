import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripLocation } from '@/features/trips/trip-location';
import { TripDestinationPicker } from './trip-destination-picker';

const search = vi.hoisted(() => ({
  closeAndClear: vi.fn(),
  error: null as string | null,
  isLoading: false,
  isOpen: false,
  onOpenChange: vi.fn(),
  open: vi.fn(),
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
  Object.assign(search, { error: null, isLoading: false, isOpen: false, query: '', results: [] });
  for (const fn of [search.closeAndClear, search.onOpenChange, search.open, search.setQuery])
    fn.mockReset();
});

function renderPicker(props: Partial<Parameters<typeof TripDestinationPicker>[0]> = {}) {
  const onChange = vi.fn();
  return {
    onChange,
    ready: render(
      <TripDestinationPicker
        disabled={false}
        onChange={onChange}
        status="undecided"
        value={null}
        {...props}
      />
    )
  };
}

describe('TripDestinationPicker', () => {
  test.each([
    ['undecided', 'undecided', null, 'Keep the destination open'],
    ['known with a place', 'known', makeLocation(), 'Lisbon'],
    ['known without a place', 'known', null, 'Keep the destination open']
  ] as const)('trigger summarises a %s destination', async (_, status, value, text) => {
    await renderPicker({ status, value }).ready;
    await expect.element(page.getByRole('button', { name: new RegExp(text, 'u') })).toBeVisible();
  });

  test('opens the search dialog from the trigger', async () => {
    await renderPicker().ready;
    await page.getByRole('button', { name: /Keep the destination open/u }).click();
    expect(search.open).toHaveBeenCalledTimes(1);
  });

  test('disables the trigger', async () => {
    await renderPicker({ disabled: true }).ready;
    await expect
      .element(page.getByRole('button', { name: /Keep the destination open/u }))
      .toBeDisabled();
  });

  test('lets the group decide and closes the dialog', async () => {
    search.isOpen = true;
    const { onChange, ready } = renderPicker({ status: 'known', value: makeLocation() });
    await ready;
    await page.getByRole('button', { name: /Let the group decide/u }).click();
    expect(onChange).toHaveBeenCalledWith('undecided', null);
    expect(search.closeAndClear).toHaveBeenCalled();
  });

  test('picks a searched place', async () => {
    search.isOpen = true;
    search.query = 'Lis';
    const porto = makeLocation({ name: 'Porto', placeId: 'osm:2' });
    search.results = [porto];
    const { onChange, ready } = renderPicker();
    await ready;
    await page.getByRole('button', { name: /Porto/u }).click();
    expect(onChange).toHaveBeenCalledWith('known', porto);
    expect(search.closeAndClear).toHaveBeenCalled();
  });

  test('types into the search field', async () => {
    search.isOpen = true;
    await renderPicker().ready;
    await page.getByLabelText('Search destinations').fill('Tok');
    expect(search.setQuery).toHaveBeenCalledWith('Tok');
  });

  test.each([
    ['an empty query', { query: '' }, 'Search anywhere in the world'],
    ['a short query', { query: 'L' }, 'Search anywhere in the world'],
    ['no matches', { query: 'Zzzz' }, 'No matching places found'],
    ['searching', { isLoading: true, query: 'Lis' }, null],
    ['an error', { error: 'Location search is unavailable', query: 'Lis' }, null]
  ] as [string, Partial<typeof search>, null | string][])(
    'shows the state for %s',
    async (_, state, text) => {
      search.isOpen = true;
      Object.assign(search, state);
      await renderPicker().ready;
      if (text) await expect.element(page.getByText(text)).toBeVisible();
      else if (state.isLoading)
        await expect
          .element(page.getByRole('status', { name: 'Searching real places…' }))
          .toBeVisible();
      else await expect.element(page.getByText('Location search is unavailable')).toBeVisible();
    }
  );
});
