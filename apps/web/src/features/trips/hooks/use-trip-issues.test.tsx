import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useTripIssue, useTripIssues } from './use-trip-issues';

const convex = vi.hoisted(() => ({
  useAction: vi.fn(),
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
const issueId = 'issue-1' as Id<'tripIssues'>;

const openIssue = {
  author: { name: 'Alex Morgan', userId: 'user-alex' },
  body: 'Add a coast day near Lisbon.',
  canAssign: true,
  canManage: true,
  comments: [],
  id: issueId,
  status: 'open' as const,
  title: 'Coast day',
  tripId,
  updatedAt: Date.UTC(2026, 7, 17)
};

beforeEach(() => {
  vi.clearAllMocks();
  convex.useAction.mockReturnValue(vi.fn().mockResolvedValue(null));
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue(null));
  convex.useQuery.mockReturnValue([]);
});

describe('useTripIssues', () => {
  test('exposes the issue query result, or skips when disabled', async () => {
    convex.useQuery.mockReturnValue([{ id: issueId }]);
    const { result } = await renderHook(() => useTripIssues(tripId));
    expect(result.current.issues).toEqual([{ id: issueId }]);
    expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), { tripId });

    await renderHook(() => useTripIssues(tripId, false));
    expect(convex.useQuery).toHaveBeenLastCalledWith(expect.anything(), 'skip');
  });
});

describe('useTripIssue', () => {
  test('runs successful comment and due-date actions', async () => {
    const comment = vi.fn().mockResolvedValue(null);
    const due = vi.fn().mockResolvedValue(null);
    convex.useQuery.mockReturnValue(openIssue);
    convex.useMutation
      .mockReturnValueOnce(vi.fn())
      .mockReturnValueOnce(comment)
      .mockReturnValueOnce(due);
    const { result } = await renderHook(() => useTripIssue(issueId));

    await act(async () => {
      expect(await result.current.addComment('A note')).toBe(true);
      expect(await result.current.setDueAt(null)).toBe(true);
    });
    expect(comment).toHaveBeenCalledWith({ content: 'A note', issueId });
    expect(due).toHaveBeenCalledWith({ dueAt: null, issueId });
  });

  test('sets and clears the done-when condition', async () => {
    const condition = vi.fn().mockResolvedValue(null);
    convex.useQuery.mockReturnValue(openIssue);
    convex.useMutation
      .mockReturnValueOnce(vi.fn())
      .mockReturnValueOnce(vi.fn())
      .mockReturnValueOnce(vi.fn())
      .mockReturnValueOnce(condition);
    const { result } = await renderHook(() => useTripIssue(issueId));
    const rule = { items: [{ kind: 'within_budget' as const }], match: 'all' as const };

    await act(async () => {
      expect(await result.current.setCondition({ rule })).toBe(true);
      expect(await result.current.setCondition({})).toBe(true);
    });
    expect(condition).toHaveBeenNthCalledWith(1, { issueId, rule });
    expect(condition).toHaveBeenNthCalledWith(2, { issueId });
  });

  test('does not implement without an issue', async () => {
    const createVersion = vi.fn();
    convex.useQuery.mockReturnValue(undefined);
    convex.useMutation.mockReturnValue(createVersion);
    const { result } = await renderHook(() => useTripIssue(issueId));

    await act(async () => expect(await result.current.implement()).toBeNull());
    expect(createVersion).not.toHaveBeenCalled();
  });
  test('reports failed comments without claiming success', async () => {
    const comment = vi.fn().mockRejectedValue(new Error('Issue is closed'));
    convex.useQuery.mockReturnValue(openIssue);
    convex.useMutation.mockReturnValue(comment);
    const { result } = await renderHook(() => useTripIssue(issueId));

    await act(async () => {
      expect(await result.current.addComment('Can we keep this flexible?')).toBe(false);
    });

    expect(comment).toHaveBeenCalledWith({ content: 'Can we keep this flexible?', issueId });
    expect(notifications.error).toHaveBeenCalledWith('Issue is closed');
  });

  test('returns null and toasts when starting an idea from an issue fails', async () => {
    const createVersion = vi.fn().mockRejectedValue(new Error('Issue already has an idea'));
    convex.useQuery.mockReturnValue(openIssue);
    convex.useMutation.mockReturnValue(createVersion);
    const { result } = await renderHook(() => useTripIssue(issueId));

    let version = null;
    await act(async () => {
      version = await result.current.implement();
    });

    expect(createVersion).toHaveBeenCalledWith({ issueId, tripId });
    expect(version).toBeNull();
    expect(notifications.error).toHaveBeenCalledWith('Issue already has an idea');
  });
});
