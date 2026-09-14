import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useTripListAutoLoad } from './use-trip-list-auto-load';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useTripListAutoLoad', () => {
  test('loads once when visible, waits during loading, and rearms for the next page', () => {
    const callbacks: IntersectionObserverCallback[] = [];
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          callbacks.push(callback);
        }
        observe = observe;
        disconnect = disconnect;
      }
    );
    const loadMore = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ status }: { status: 'LoadingMore' | 'CanLoadMore' | 'Exhausted' }) =>
        useTripListAutoLoad({ loadMore, status }),
      { initialProps: { status: 'LoadingMore' } }
    );
    result.current.current = document.createElement('div');
    rerender({ status: 'CanLoadMore' });
    const emit = (index: number, isIntersecting: boolean) =>
      act(() =>
        callbacks[index]?.(
          [{ isIntersecting } as IntersectionObserverEntry],
          {} as IntersectionObserver
        )
      );
    emit(0, false);
    expect(loadMore).not.toHaveBeenCalled();
    emit(0, true);
    emit(0, true);
    expect(loadMore).toHaveBeenCalledExactlyOnceWith(25);
    rerender({ status: 'LoadingMore' });
    emit(0, true);
    expect(loadMore).toHaveBeenCalledTimes(1);
    rerender({ status: 'CanLoadMore' });
    emit(1, true);
    expect(loadMore).toHaveBeenCalledTimes(2);
    rerender({ status: 'Exhausted' });
    emit(1, true);
    expect(loadMore).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenCalledTimes(2);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  test('keeps manual pagination usable when the observer API is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const loadMore = vi.fn();
    expect(() =>
      renderHook(() => useTripListAutoLoad({ loadMore, status: 'CanLoadMore' }))
    ).not.toThrow();
    expect(loadMore).not.toHaveBeenCalled();
  });
});
