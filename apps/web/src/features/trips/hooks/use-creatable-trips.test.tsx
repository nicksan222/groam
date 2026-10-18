import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useCreatableTrips } from './use-creatable-trips';

const state = vi.hoisted(() => ({
  args: undefined as unknown,
  loadMore: vi.fn(),
  status: 'CanLoadMore' as string,
  trips: [] as Array<{ archivedAt: number | null; id: string; name: string }>
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: (args: unknown) => {
    state.args = args;
    return {
      isLoading: state.status === 'LoadingFirstPage',
      loadMore: state.loadMore,
      status: state.status,
      trips: state.trips
    };
  }
}));

beforeEach(() => {
  state.loadMore = vi.fn();
  state.status = 'CanLoadMore';
  state.trips = [
    { archivedAt: null, id: 'trip-1', name: 'Atlantic week' },
    { archivedAt: 5, id: 'trip-2', name: 'Old trip' }
  ];
});

describe('useCreatableTrips', () => {
  test('keeps loading pages until exhausted and stays busy meanwhile', async () => {
    const { result } = await renderHook(() => useCreatableTrips(true));
    expect(state.loadMore).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.trips).toEqual([{ id: 'trip-1', name: 'Atlantic week' }]);
  });

  test('is idle once every page is loaded', async () => {
    state.status = 'Exhausted';
    const { result } = await renderHook(() => useCreatableTrips(true));
    expect(state.loadMore).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  test('skips the query while disabled', async () => {
    await renderHook(() => useCreatableTrips(false));
    expect(state.args).toBe('skip');
    expect(state.loadMore).not.toHaveBeenCalled();
  });
});
