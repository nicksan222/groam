import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useCreateIdea, useViewerOpenIdeas, useWorkspaceIdeas } from './use-workspace-ideas';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn(),
  usePaginatedQuery: vi.fn(),
  useQuery: vi.fn()
}));

vi.mock('convex/react', () => ({
  useMutation: (...args: unknown[]) => convex.useMutation(...args),
  usePaginatedQuery: (...args: unknown[]) => convex.usePaginatedQuery(...args),
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
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
  convex.useQuery.mockReturnValue(undefined);
});

test('uses the requested workspace idea page size and loading status', () => {
  const { result } = renderHook(() => useWorkspaceIdeas({ initialNumItems: 12 }));

  expect(result.current).toMatchObject({ isLoading: true, proposals: [] });
  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(
    expect.anything(),
    {},
    {
      initialNumItems: 12
    }
  );
});

test('skips workspace and viewer idea queries when requested', () => {
  renderHook(() => useWorkspaceIdeas('skip'));
  renderHook(() => useViewerOpenIdeas('skip'));

  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(expect.anything(), 'skip', {
    initialNumItems: 25
  });
  expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
});

test('normalizes an unresolved viewer list to an empty loading result', () => {
  const { result } = renderHook(() => useViewerOpenIdeas());

  expect(result.current).toEqual({ isLoading: true, proposals: [] });
});

test('creates an untitled idea and reports creation failures', async () => {
  const create = vi.fn().mockRejectedValue(new Error('Trip is archived'));
  convex.useMutation.mockReturnValue(create);
  const { result } = renderHook(() => useCreateIdea());

  let proposal: unknown;
  await act(async () => {
    proposal = await result.current('trip-1' as Id<'trips'>);
  });

  expect(create).toHaveBeenCalledWith({ tripId: 'trip-1' });
  expect(proposal).toBeNull();
  expect(toast.error).toHaveBeenCalledWith('Trip is archived');
});
