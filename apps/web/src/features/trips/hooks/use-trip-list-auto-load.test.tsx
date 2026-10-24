import { act, renderHook } from '@groam/vitest-config/react';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { useTripListAutoLoad } from './use-trip-list-auto-load';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useTripListAutoLoad', () => {
  test('loads once when visible, waits during loading, and rearms for the next page', async () => {
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
    const { result, rerender, unmount } = await renderHook(
      ({ status }: { status: 'LoadingMore' | 'CanLoadMore' | 'Exhausted' }) =>
        useTripListAutoLoad({ loadMore, status }),
      { initialProps: { status: 'LoadingMore' } }
    );
    result.current.current = document.createElement('div');
    await rerender({ status: 'CanLoadMore' });
    const emit = async (index: number, isIntersecting: boolean) =>
      await act(() =>
        callbacks[index]?.(
          [{ isIntersecting } as IntersectionObserverEntry],
          {} as IntersectionObserver
        )
      );
    await emit(0, false);
    expect(loadMore).not.toHaveBeenCalled();
    await emit(0, true);
    await emit(0, true);
    expect(loadMore).toHaveBeenCalledExactlyOnceWith(25);
    await rerender({ status: 'LoadingMore' });
    await emit(0, true);
    expect(loadMore).toHaveBeenCalledTimes(1);
    await rerender({ status: 'CanLoadMore' });
    await emit(1, true);
    expect(loadMore).toHaveBeenCalledTimes(2);
    await rerender({ status: 'Exhausted' });
    await emit(1, true);
    expect(loadMore).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenCalledTimes(2);
    await unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  test('keeps manual pagination usable when the observer API is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const loadMore = vi.fn();
    await renderHook(() => useTripListAutoLoad({ loadMore, status: 'CanLoadMore' }));
    expect(loadMore).not.toHaveBeenCalled();
  });
});
