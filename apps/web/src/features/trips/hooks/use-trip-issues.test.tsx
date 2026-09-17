import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useTripIssue, useTripIssues } from './use-trip-issues';

const convex = vi.hoisted(() => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn()
}));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('convex/react', () => convex);
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const tripId = 'trip-1' as Id<'trips'>;
const issueId = 'issue-1' as Id<'tripIssues'>;

const openIssue = {
  author: { name: 'Alex Morgan', userId: 'user-alex' },
  body: 'Add a coast day near Lisbon.',
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
  test('creates an issue and exposes the issue query result', async () => {
    const create = vi.fn().mockResolvedValue(issueId);
    convex.useQuery.mockReturnValue([{ id: issueId }]);
    convex.useMutation.mockReturnValue(create);
    const { result } = renderHook(() => useTripIssues(tripId));

    await act(async () => {
      expect(await result.current.createIssue('Coast day', 'Body')).toBe(issueId);
    });
    expect(result.current.issues).toEqual([{ id: issueId }]);
  });

  test('returns null and toasts when issue creation fails', async () => {
    const create = vi.fn().mockRejectedValue(new Error('Trip is archived'));
    convex.useMutation.mockReturnValue(create);
    const { result } = renderHook(() => useTripIssues(tripId));

    let created: Id<'tripIssues'> | null = null;
    await act(async () => {
      created = await result.current.createIssue('Coast day', 'Add a coast day near Lisbon.');
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

describe('useTripIssue', () => {
  test('runs successful comment, assignment, due-date, and status actions', async () => {
    const comment = vi.fn().mockResolvedValue(null);
    const status = vi.fn().mockResolvedValue(null);
    const due = vi.fn().mockResolvedValue(null);
    const assign = vi.fn().mockResolvedValue(null);
    convex.useQuery.mockReturnValue(openIssue);
    convex.useMutation
      .mockReturnValueOnce(vi.fn())
      .mockReturnValueOnce(comment)
      .mockReturnValueOnce(status)
      .mockReturnValueOnce(due)
      .mockReturnValueOnce(assign);
    const { result } = renderHook(() => useTripIssue(issueId));

    await act(async () => {
      expect(await result.current.addComment('A note')).toBe(true);
      expect(await result.current.assignUser('user-sam', 'Sam')).toBe(true);
      expect(await result.current.setDueAt(null)).toBe(true);
      expect(await result.current.setStatus('closed')).toBe(true);
    });
    expect(assign).toHaveBeenCalledWith({
      assignee: { kind: 'user', name: 'Sam', userId: 'user-sam' },
      issueId
    });
    expect(due).toHaveBeenCalledWith({ dueAt: null, issueId });
  });

  test('does not implement without an issue', async () => {
    const createVersion = vi.fn();
    convex.useQuery.mockReturnValue(undefined);
    convex.useMutation.mockReturnValue(createVersion);
    const { result } = renderHook(() => useTripIssue(issueId));

    await act(async () => expect(await result.current.implement()).toBeNull());
    expect(createVersion).not.toHaveBeenCalled();
  });
  test('reports failed comments without claiming success', async () => {
    const comment = vi.fn().mockRejectedValue(new Error('Issue is closed'));
    convex.useQuery.mockReturnValue(openIssue);
    convex.useMutation.mockReturnValue(comment);
    const { result } = renderHook(() => useTripIssue(issueId));

    await act(async () => {
      expect(await result.current.addComment('Can we keep this flexible?')).toBe(false);
    });

    expect(comment).toHaveBeenCalledWith({ content: 'Can we keep this flexible?', issueId });
    expect(notifications.error).toHaveBeenCalledWith('Issue is closed');
  });

  test('reports failed status updates without claiming success', async () => {
    const status = vi.fn().mockRejectedValue(new Error('Only organizers can close issues'));
    convex.useQuery.mockReturnValue(openIssue);
    convex.useMutation.mockReturnValue(status);
    const { result } = renderHook(() => useTripIssue(issueId));

    await act(async () => {
      expect(await result.current.setStatus('closed')).toBe(false);
    });

    expect(status).toHaveBeenCalledWith({ issueId, status: 'closed' });
    expect(notifications.error).toHaveBeenCalledWith('Only organizers can close issues');
  });

  test('reports failed Issue agent assignment without claiming success', async () => {
    const assign = vi.fn().mockRejectedValue(new Error('Issue agent is unavailable'));
    convex.useQuery.mockReturnValue(openIssue);
    convex.useMutation.mockReturnValue(assign);
    const { result } = renderHook(() => useTripIssue(issueId));

    await act(async () => {
      expect(await result.current.assignIssueAgent()).toBe(false);
    });

    expect(assign).toHaveBeenCalledWith({
      assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' },
      issueId
    });
    expect(notifications.error).toHaveBeenCalledWith('Issue agent is unavailable');
  });

  test('reports failed Issue agent unassignment without claiming success', async () => {
    const assign = vi.fn().mockRejectedValue(new Error('Only organizers can assign issues'));
    convex.useQuery.mockReturnValue(openIssue);
    convex.useMutation.mockReturnValue(assign);
    const { result } = renderHook(() => useTripIssue(issueId));

    await act(async () => {
      expect(await result.current.unassign()).toBe(false);
    });

    expect(assign).toHaveBeenCalledWith({ assignee: null, issueId });
    expect(notifications.error).toHaveBeenCalledWith('Only organizers can assign issues');
  });

  test('returns null and toasts when starting an idea from an issue fails', async () => {
    const createVersion = vi.fn().mockRejectedValue(new Error('Issue already has an idea'));
    convex.useQuery.mockReturnValue(openIssue);
    convex.useMutation.mockReturnValue(createVersion);
    const { result } = renderHook(() => useTripIssue(issueId));

    let version = null;
    await act(async () => {
      version = await result.current.implement();
    });

    expect(createVersion).toHaveBeenCalledWith({ issueId, tripId });
    expect(version).toBeNull();
    expect(notifications.error).toHaveBeenCalledWith('Issue already has an idea');
  });
});
