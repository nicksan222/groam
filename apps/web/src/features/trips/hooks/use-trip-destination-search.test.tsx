import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useTripDestinationSearch } from './use-trip-destination-search';

const search = vi.hoisted(() => ({
  searchLocations: vi.fn()
}));

vi.mock('@/features/trips/trip-location-search', () => search);

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  search.searchLocations.mockResolvedValue([{ name: 'Lisbon', placeId: 'p1' }]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTripDestinationSearch', () => {
  test('starts closed and clears query on close', () => {
    const { result } = renderHook(() => useTripDestinationSearch());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.open();
      result.current.setQuery('Li');
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.onOpenChange(false);
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.query).toBe('');
  });

  test('debounces search while open', async () => {
    const { result } = renderHook(() => useTripDestinationSearch());
    act(() => {
      result.current.open();
      result.current.setQuery('Lisbon');
    });

    expect(search.searchLocations).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(search.searchLocations).toHaveBeenCalledWith('Lisbon', expect.any(AbortSignal));
    expect(result.current.results).toEqual([{ name: 'Lisbon', placeId: 'p1' }]);
    expect(result.current.isLoading).toBe(false);
  });

  test('ignores a stale response after the search changes', async () => {
    let finishOldSearch: (value: unknown) => void = () => {};
    search.searchLocations.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOldSearch = resolve;
        })
    );
    const { result } = renderHook(() => useTripDestinationSearch(true));
    act(() => result.current.setQuery('Lisbon'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    act(() => result.current.setQuery('Porto'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.results).toEqual([]);
    await act(async () => {
      finishOldSearch([{ name: 'Lisbon' }]);
    });
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    act(() => result.current.setQuery(''));
    expect(result.current.isLoading).toBe(false);
  });

  test('shows search errors and handles non-Error rejections', async () => {
    search.searchLocations.mockRejectedValue('offline');
    const { result } = renderHook(() => useTripDestinationSearch());
    act(() => {
      result.current.open();
      result.current.setQuery('Rome');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(result.current.error).toBe('Location search is unavailable');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
