import { renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useWorkspaceAgentRuns } from './use-workspace-agent-runs';

const convex = vi.hoisted(() => ({ usePaginatedQuery: vi.fn() }));

vi.mock('convex/react', () => ({
  usePaginatedQuery: (...args: unknown[]) => convex.usePaginatedQuery(...args)
}));

beforeEach(() => {
  vi.clearAllMocks();
  convex.usePaginatedQuery.mockReturnValue({
    loadMore: vi.fn(),
    results: [],
    status: 'LoadingFirstPage'
  });
});

test('uses the supplied page size and exposes the first-page loading state', () => {
  const { result } = renderHook(() => useWorkspaceAgentRuns({ initialNumItems: 10 }));

  expect(result.current.isLoading).toBe(true);
  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(
    expect.anything(),
    {},
    {
      initialNumItems: 10
    }
  );
});

test('skips the query while preserving the standard page size', () => {
  const { result } = renderHook(() => useWorkspaceAgentRuns('skip'));

  expect(result.current).toMatchObject({ isLoading: true, runs: [], status: 'LoadingFirstPage' });
  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(expect.anything(), 'skip', {
    initialNumItems: 25
  });
});

test('returns loaded workspace runs and pagination controls', () => {
  const loadMore = vi.fn();
  const runs = [{ id: 'run-1', status: 'running' }];
  convex.usePaginatedQuery.mockReturnValue({ loadMore, results: runs, status: 'Exhausted' });

  const { result } = renderHook(() => useWorkspaceAgentRuns());

  expect(result.current).toEqual({ isLoading: false, loadMore, runs, status: 'Exhausted' });
});
