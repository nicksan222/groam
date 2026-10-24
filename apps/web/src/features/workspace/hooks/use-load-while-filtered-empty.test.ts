import { renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { useLoadWhileFilteredEmpty } from './use-load-while-filtered-empty';

describe('useLoadWhileFilteredEmpty', () => {
  test('loads another page while the filter hides everything and more exist', async () => {
    const loadMore = vi.fn();
    const { result } = await renderHook(() =>
      useLoadWhileFilteredEmpty({ isFilteredEmpty: true, loadMore, status: 'CanLoadMore' })
    );
    expect(loadMore).toHaveBeenCalledWith(25);
    expect(result.current).toBe(true);
  });

  test('stays idle when something matches or the list is exhausted', async () => {
    const loadMore = vi.fn();
    const matched = await renderHook(() =>
      useLoadWhileFilteredEmpty({ isFilteredEmpty: false, loadMore, status: 'CanLoadMore' })
    );
    const done = await renderHook(() =>
      useLoadWhileFilteredEmpty({ isFilteredEmpty: true, loadMore, status: 'Exhausted' })
    );
    expect(loadMore).not.toHaveBeenCalled();
    expect(matched.result.current).toBe(false);
    expect(done.result.current).toBe(false);
  });
});
