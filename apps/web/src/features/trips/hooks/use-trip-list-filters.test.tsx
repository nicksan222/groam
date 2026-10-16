import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import type { TripListItem } from '@/types/trips';
import { useTripListFilters } from './use-trip-list-filters';

function trip(value: Partial<TripListItem> & Pick<TripListItem, 'id' | 'name'>): TripListItem {
  return {
    archivedAt: null,
    coverUrl: null,
    dateNotes: null,
    destination: null,
    favorite: false,
    lastUpdatedAt: 1,
    nextAction: 'Continue planning together',
    outstandingActionCount: 0,
    ...value
  };
}

describe('useTripListFilters', () => {
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
});
