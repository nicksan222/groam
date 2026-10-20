import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { dashboardPoll } from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { useDashboardPolls } from './use-dashboard-polls';

const convex = vi.hoisted(() => ({ usePaginatedQuery: vi.fn(), loadMore: vi.fn() }));
vi.mock('convex/react', async (original) => ({
  ...(await original<typeof import('convex/react')>()),
  usePaginatedQuery: convex.usePaginatedQuery
}));
beforeEach(() => {
  convex.loadMore.mockClear();
  convex.usePaginatedQuery.mockReturnValue({
    results: [],
    status: 'Exhausted',
    loadMore: convex.loadMore
  });
});

test('first-page loading remains explicit', async () => {
  convex.usePaginatedQuery.mockReturnValue({
    results: [],
    status: 'LoadingFirstPage',
    loadMore: convex.loadMore
  });
  const { result } = await renderHook(() => useDashboardPolls());
  expect(result.current.isLoading).toBe(true);
  expect(result.current.polls).toEqual([]);
});

test('an empty filtered page can explicitly continue without an automatic crawl', async () => {
  convex.usePaginatedQuery.mockReturnValue({
    results: [],
    status: 'CanLoadMore',
    loadMore: convex.loadMore
  });
  const { result } = await renderHook(() => useDashboardPolls());
  expect(result.current.canLoadMore).toBe(true);
  expect(convex.loadMore).not.toHaveBeenCalled();
  result.current.loadMore();
  expect(convex.loadMore).toHaveBeenCalledExactlyOnceWith(4);
});

test('all accumulated accessible results remain reachable', async () => {
  const items = Array.from({ length: 6 }, (_, index) =>
    dashboardPoll({ id: `item${index}` as never })
  );
  convex.usePaginatedQuery.mockReturnValue({
    results: items,
    status: 'LoadingMore',
    loadMore: convex.loadMore
  });
  const { result } = await renderHook(() => useDashboardPolls());
  expect(result.current.polls).toHaveLength(6);
  expect(result.current.isLoadingMore).toBe(true);
  result.current.loadMore();
  expect(convex.loadMore).not.toHaveBeenCalled();
});

test('voted polls are omitted without dropping other accessible polls', async () => {
  convex.usePaginatedQuery.mockReturnValue({
    results: [dashboardPoll({ viewerHasVoted: true }), dashboardPoll({ id: 'unvoted' as never })],
    status: 'Exhausted',
    loadMore: convex.loadMore
  });
  const { result } = await renderHook(() => useDashboardPolls());
  expect(result.current.polls.map((poll) => poll.id)).toEqual(['unvoted']);
});
