import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { dashboardPoll } from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { useDashboardPolls } from './use-dashboard-polls';

const convex = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));

beforeEach(() => {
  convex.useQuery.mockReturnValue([]);
});

test('is loading until the query resolves', async () => {
  convex.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() => useDashboardPolls());
  expect(result.current).toEqual({ isLoading: true, polls: [] });
});

test('keeps only unvoted polls, capped at 4', async () => {
  convex.useQuery.mockReturnValue([
    dashboardPoll({ id: 'voted' as never, viewerHasVoted: true }),
    ...Array.from({ length: 6 }, (_, index) => dashboardPoll({ id: `p${index}` as never }))
  ]);
  const { result } = await renderHook(() => useDashboardPolls());
  expect(result.current.isLoading).toBe(false);
  expect(result.current.polls.map((poll) => poll.id)).toEqual(['p0', 'p1', 'p2', 'p3']);
});
