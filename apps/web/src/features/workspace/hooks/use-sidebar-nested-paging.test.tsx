import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { useSidebarNestedPaging } from './use-sidebar-nested-paging';

describe('useSidebarNestedPaging', () => {
  test('expands the visible window before fetching more', async () => {
    const loadMore = vi.fn();
    const showMore = vi.fn();
    const { result } = await renderHook(() =>
      useSidebarNestedPaging({
        canExpandVisible: () => true,
        loadMore,
        showMore,
        status: 'CanLoadMore',
        total: 12
      })
    );

    expect(result.current.canLoadMore).toBe(true);
    await act(() => {
      result.current.onLoadMore();
    });
    expect(showMore).toHaveBeenCalledOnce();
    expect(loadMore).not.toHaveBeenCalled();
  });

  test('fetches the next page once the visible window is exhausted', async () => {
    const loadMore = vi.fn();
    const showMore = vi.fn();
    const { result } = await renderHook(() =>
      useSidebarNestedPaging({
        canExpandVisible: () => false,
        loadMore,
        showMore,
        status: 'CanLoadMore',
        total: 12
      })
    );

    await act(() => {
      result.current.onLoadMore();
    });
    expect(loadMore).toHaveBeenCalledWith(5);
    expect(showMore).toHaveBeenCalledOnce();
  });
});
