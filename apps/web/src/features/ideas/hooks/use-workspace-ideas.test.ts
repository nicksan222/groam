import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useCreateIdea, useViewerOpenIdeas, useWorkspaceIdeas } from './use-workspace-ideas';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn(),
  usePaginatedQuery: vi.fn()
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useMutation: (...args: unknown[]) => convex.useMutation(...args),
  usePaginatedQuery: (...args: unknown[]) => convex.usePaginatedQuery(...args)
}));

vi.mock('@groam/ui/components/toast', () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue('proposal-1'));
  convex.usePaginatedQuery.mockReturnValue({
    loadMore: vi.fn(),
    results: [],
    status: 'LoadingFirstPage'
  });
});

test('uses the requested workspace idea page size and loading status', async () => {
  const { result } = await renderHook(() => useWorkspaceIdeas({ initialNumItems: 12 }));

  expect(result.current).toMatchObject({ isLoading: true, proposals: [] });
  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(
    expect.anything(),
    {},
    {
      initialNumItems: 12
    }
  );
});

test('skips workspace and viewer idea queries when requested', async () => {
  await renderHook(() => useWorkspaceIdeas('skip'));
  await renderHook(() => useViewerOpenIdeas('skip'));

  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(expect.anything(), 'skip', {
    initialNumItems: 25
  });
  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(expect.anything(), 'skip', {
    initialNumItems: 50
  });
});

test('normalizes an unresolved viewer list to an empty loading result', async () => {
  const { result } = await renderHook(() => useViewerOpenIdeas());

  expect(result.current).toMatchObject({
    isLoading: true,
    proposals: [],
    canLoadMore: false,
    isLoadingMore: false
  });
});

test('creates an untitled idea and reports creation failures', async () => {
  const create = vi.fn().mockRejectedValue(new Error('Trip is archived'));
  convex.useMutation.mockReturnValue(create);
  const { result } = await renderHook(() => useCreateIdea());

  let proposal: unknown;
  await act(async () => {
    proposal = await result.current('trip-1' as Id<'trips'>);
  });

  expect(create).toHaveBeenCalledWith({ tripId: 'trip-1' });
  expect(proposal).toBeNull();
  expect(toast.error).toHaveBeenCalledWith('Trip is archived');
});

test('viewer pending pages load explicitly even when the filtered results are empty', async () => {
  const loadMore = vi.fn();
  convex.usePaginatedQuery.mockReturnValue({ loadMore, results: [], status: 'CanLoadMore' });
  const { result, rerender } = await renderHook(() => useViewerOpenIdeas());
  expect(result.current.canLoadMore).toBe(true);
  expect(loadMore).not.toHaveBeenCalled();
  await act(() => result.current.loadMore());
  expect(loadMore).toHaveBeenCalledExactlyOnceWith(50);
  convex.usePaginatedQuery.mockReturnValue({ loadMore, results: [], status: 'LoadingMore' });
  await rerender();
  expect(result.current.isLoadingMore).toBe(true);
  await act(() => result.current.loadMore());
  expect(loadMore).toHaveBeenCalledTimes(1);
});
