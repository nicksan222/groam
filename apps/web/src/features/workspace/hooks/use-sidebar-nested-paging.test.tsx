import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useSidebarNestedPaging } from './use-sidebar-nested-paging';

describe('useSidebarNestedPaging', () => {
  test('expands the visible window before fetching more', () => {
    const loadMore = vi.fn();
    const showMore = vi.fn();
    const { result } = renderHook(() =>
      useSidebarNestedPaging({
        canExpandVisible: () => true,
        loadMore,
        showMore,
        status: 'CanLoadMore',
        total: 12
      })
    );

    expect(result.current.canLoadMore).toBe(true);
    act(() => {
      result.current.onLoadMore();
    });
    expect(showMore).toHaveBeenCalledOnce();
    expect(loadMore).not.toHaveBeenCalled();
  });

  test('fetches the next page once the visible window is exhausted', () => {
    const loadMore = vi.fn();
    const showMore = vi.fn();
    const { result } = renderHook(() =>
      useSidebarNestedPaging({
        canExpandVisible: () => false,
        loadMore,
        showMore,
        status: 'CanLoadMore',
        total: 12
      })
    );

    act(() => {
      result.current.onLoadMore();
    });
    expect(loadMore).toHaveBeenCalledWith(5);
    expect(showMore).toHaveBeenCalledOnce();
  });
});
