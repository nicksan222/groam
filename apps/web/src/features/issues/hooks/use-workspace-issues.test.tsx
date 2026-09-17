import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useCreateIssue, useWorkspaceIssues } from './use-workspace-issues';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn(),
  usePaginatedQuery: vi.fn()
}));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('convex/react', () => convex);
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const tripId = 'trip-1' as Id<'trips'>;

beforeEach(() => {
  vi.clearAllMocks();
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue(null));
  convex.usePaginatedQuery.mockReturnValue({
    loadMore: vi.fn(),
    results: [],
    status: 'Exhausted'
  });
});

describe('useWorkspaceIssues', () => {
  test('exposes the first page of workspace issues', () => {
    convex.usePaginatedQuery.mockReturnValue({
      loadMore: vi.fn(),
      results: [{ id: 'issue-1', title: 'Coast day' }],
      status: 'CanLoadMore'
    });
    const { result } = renderHook(() => useWorkspaceIssues());
    expect(result.current.issues).toEqual([{ id: 'issue-1', title: 'Coast day' }]);
    expect(result.current.isLoading).toBe(false);
  });

  test('skips pagination on request and reports first-page loading', () => {
    convex.usePaginatedQuery.mockReturnValue({
      loadMore: vi.fn(),
      results: [],
      status: 'LoadingFirstPage'
    });
    const { result } = renderHook(() => useWorkspaceIssues('skip'));
    expect(convex.usePaginatedQuery).toHaveBeenCalledWith(expect.anything(), 'skip', {
      initialNumItems: 25
    });
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useCreateIssue', () => {
  test('creates an issue with its trip context', async () => {
    const create = vi.fn().mockResolvedValue('issue-1');
    convex.useMutation.mockReturnValue(create);
    const { result } = renderHook(() => useCreateIssue());
    await expect(result.current(tripId, 'Coast day', 'Add a coast day.')).resolves.toBe('issue-1');
    expect(create).toHaveBeenCalledWith({ body: 'Add a coast day.', title: 'Coast day', tripId });
  });

  test('returns null and toasts when issue creation fails', async () => {
    const create = vi.fn().mockRejectedValue(new Error('Trip is archived'));
    convex.useMutation.mockReturnValue(create);
    const { result } = renderHook(() => useCreateIssue());

    let created: Id<'tripIssues'> | null = null;
    await act(async () => {
      created = await result.current(tripId, 'Coast day', 'Add a coast day near Lisbon.');
    });

    expect(create).toHaveBeenCalledWith({
      body: 'Add a coast day near Lisbon.',
      title: 'Coast day',
      tripId
    });
    expect(created).toBeNull();
    expect(notifications.error).toHaveBeenCalledWith('Trip is archived');
  });
});
