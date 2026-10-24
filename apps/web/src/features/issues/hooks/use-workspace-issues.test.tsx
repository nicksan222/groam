import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useCreateIssue } from './use-workspace-issues';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn()
}));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const tripId = 'trip-1' as Id<'trips'>;

beforeEach(() => {
  vi.clearAllMocks();
  convex.useQuery.mockReturnValue(undefined);
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue(null));
});

describe('useCreateIssue', () => {
  test('creates an issue with its trip context', async () => {
    const create = vi.fn().mockResolvedValue('issue-1');
    convex.useMutation.mockReturnValue(create);
    const { result } = await renderHook(() => useCreateIssue());
    await expect(result.current(tripId, 'Coast day', 'Add a coast day.')).resolves.toBe('issue-1');
    expect(create).toHaveBeenCalledWith({ body: 'Add a coast day.', title: 'Coast day', tripId });
  });

  test('returns null and toasts when issue creation fails', async () => {
    const create = vi.fn().mockRejectedValue(new Error('Trip is archived'));
    convex.useMutation.mockReturnValue(create);
    const { result } = await renderHook(() => useCreateIssue());

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
