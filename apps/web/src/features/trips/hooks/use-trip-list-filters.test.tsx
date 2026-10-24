import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import type { TripListItem } from '@/types/trips';
import { useTripListFilters } from './use-trip-list-filters';

const location = vi.hoisted(() => ({ navigate: vi.fn(), search: {} as Record<string, unknown> }));

vi.mock('@/lib/navigation/router', () => ({
  useNavigate: () => location.navigate,
  useSearch: <T,>(parse: (search: Record<string, unknown>) => T) => parse(location.search)
}));

beforeEach(() => {
  location.navigate.mockClear();
  location.search = {};
});

function trip(value: Partial<TripListItem> & Pick<TripListItem, 'id' | 'name'>): TripListItem {
  return {
    archivedAt: null,
    canParticipate: true,
    coverUrl: null,
    dateNotes: null,
    destination: null,
    favorite: false,
    shortId: 'trpabc',
    lastUpdatedAt: 1,
    nextAction: 'Continue planning together',
    outstandingActionCount: 0,
    ...value
  };
}

describe('useTripListFilters', () => {
  test.each([
    ['archived', 'archived', true],
    ['all', 'all', true],
    ['nonsense', 'active', false]
  ])('?status=%s opens on the %s trips', async (param, expected, filtered) => {
    location.search = { status: param };
    const { result } = await renderHook(() =>
      useTripListFilters({ emptyFilterMessage: () => 'none', trips: [] })
    );
    expect(result.current.statusFilter).toBe(expected);
    expect(result.current.hasFilters).toBe(filtered);
  });

  test('defaults to active and filters archived trips out', async () => {
    const trips = [
      trip({ id: 'trips:active' as Id<'trips'>, name: 'Atlantic week' }),
      trip({ archivedAt: 10, id: 'trips:archived' as Id<'trips'>, name: 'Last year' })
    ];
    const { result } = await renderHook(() =>
      useTripListFilters({
        emptyFilterMessage: (filter) => `empty:${filter}`,
        trips
      })
    );

    expect(result.current.statusFilter).toBe('active');
    expect(result.current.visibleTrips.map((item) => item.id)).toEqual(['trips:active']);
    expect(result.current.empty).toBe('empty:active');
  });

  test('clearing filters resets status and query', async () => {
    const { result } = await renderHook(() =>
      useTripListFilters({
        emptyFilterMessage: () => 'none',
        trips: []
      })
    );

    await act(() => {
      result.current.setStatusFilter('all');
      result.current.setQuery('lisbon');
    });
    expect(result.current.hasFilters).toBe(true);

    await act(() => {
      result.current.clearFilters();
    });
    expect(result.current.statusFilter).toBe('active');
    expect(result.current.query).toBe('');
    expect(result.current.hasFilters).toBe(false);
  });

  test('filters by search query in the visible list', async () => {
    const trips = [
      trip({ id: 'trips:one' as Id<'trips'>, name: 'Atlantic week' }),
      trip({ id: 'trips:two' as Id<'trips'>, name: 'City break' })
    ];
    const { result } = await renderHook(() =>
      useTripListFilters({
        emptyFilterMessage: () => 'none',
        trips
      })
    );

    await act(() => {
      result.current.setQuery('city');
    });
    expect(result.current.visibleTrips.map((item) => item.id)).toEqual(['trips:two']);
  });

  test('shows the chosen status in the URL, and drops it when the filters clear', async () => {
    const { result } = await renderHook(() =>
      useTripListFilters({ emptyFilterMessage: () => 'none', trips: [] })
    );

    await act(() => result.current.setStatusFilter('archived'));
    expect(location.navigate).toHaveBeenLastCalledWith({
      preserveScroll: true,
      replace: true,
      search: { status: 'archived' },
      to: '/trips'
    });

    await act(() => result.current.clearFilters());
    expect(location.navigate).toHaveBeenLastCalledWith({
      preserveScroll: true,
      replace: true,
      search: {},
      to: '/trips'
    });
  });
});
