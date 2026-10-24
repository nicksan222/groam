import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useTripSectionCounts } from './use-trip-section-counts';

const data = vi.hoisted(() => ({
  issues: undefined as
    | Array<{ assignee?: { kind: 'user'; userId: string } | null; status: string }>
    | undefined,
  proposals: undefined as
    | Array<{
        author: { userId: string };
        canApprove?: boolean;
        hasApproved?: boolean;
        id?: string;
        status: string;
      }>
    | undefined,
  pollsLoading: false,
  polls: [] as unknown[],
  researchLoading: false,
  researches: [] as unknown[]
}));

vi.mock('@/features/polls/hooks/use-polls', () => ({
  useTripOpenPolls: () => ({ isLoading: data.pollsLoading, polls: data.polls })
}));
vi.mock('@/features/research/hooks/use-trip-researches', () => ({
  useTripResearches: () => ({ isLoading: data.researchLoading, researches: data.researches })
}));
vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: () => ({
    issues: data.issues?.map((issue) => ({
      assignee: null,
      author: { name: 'Sam', userId: 'user-sam' },
      dueAt: null,
      id: 'issue',
      labels: [],
      title: 'Issue',
      updatedAt: 1,
      ...issue
    }))
  })
}));
vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: () => ({
    proposals: data.proposals?.map((proposal) => ({
      id: 'idea',
      title: 'Idea',
      updatedAt: 1,
      workingTripId: 'working-1',
      ...proposal
    }))
  })
}));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));

const tripId = 'trip-1' as Id<'trips'>;

beforeEach(() => {
  data.issues = undefined;
  data.proposals = undefined;
  data.pollsLoading = false;
  data.polls = [];
  data.researchLoading = false;
  data.researches = [];
});

describe('useTripSectionCounts', () => {
  test('has no count for a list that is still loading', async () => {
    data.pollsLoading = true;
    data.researchLoading = true;
    const { result } = await renderHook(() => useTripSectionCounts(tripId));
    expect(result.current).toEqual({});
  });

  test('counts what is open in Ideas and Issues when nothing waits on the viewer, plus unread research', async () => {
    data.issues = [{ status: 'open' }, { status: 'closed' }, { status: 'open' }];
    data.proposals = [
      { author: { userId: 'someone' }, status: 'draft' },
      { author: { userId: 'someone' }, status: 'in_review' },
      { author: { userId: 'someone' }, status: 'merged' }
    ];
    data.researches = [{ unread: true }, { unread: false }, { unread: true }];
    const { result } = await renderHook(() => useTripSectionCounts(tripId));
    expect(result.current).toEqual({
      ideas: { count: 1, waiting: false },
      issues: { count: 2, waiting: false },
      polls: { count: 0, waiting: false },
      research: 2
    });
  });

  test('counts, per queue, only what waits on the viewer when anything does', async () => {
    data.issues = [
      { assignee: { kind: 'user', userId: 'user-alex' }, status: 'in_progress' },
      { assignee: { kind: 'user', userId: 'user-alex' }, status: 'closed' },
      { assignee: { kind: 'user', userId: 'someone' }, status: 'open' }
    ];
    data.proposals = [
      { author: { userId: 'someone' }, canApprove: true, hasApproved: false, status: 'in_review' },
      { author: { userId: 'someone' }, canApprove: true, hasApproved: true, status: 'in_review' },
      { author: { userId: 'user-alex' }, id: 'mine', status: 'draft' },
      { author: { userId: 'someone' }, status: 'draft' }
    ];
    const { result } = await renderHook(() => useTripSectionCounts(tripId));
    expect(result.current).toMatchObject({
      ideas: { count: 2, waiting: true },
      issues: { count: 1, waiting: true }
    });
  });

  test('on an archived trip nothing waits on the viewer, so Ideas and Issues count what is open', async () => {
    data.issues = [{ assignee: { kind: 'user', userId: 'user-alex' }, status: 'open' }];
    data.proposals = [];
    const { result } = await renderHook(() => useTripSectionCounts(tripId, true));
    expect(result.current.issues).toEqual({ count: 1, waiting: false });
    expect(result.current.ideas).toEqual({ count: 0, waiting: false });
  });

  test('each count appears as soon as its own list has loaded', async () => {
    data.issues = [{ status: 'open' }];
    data.pollsLoading = true;
    const { result } = await renderHook(() => useTripSectionCounts(tripId));
    expect(result.current).toEqual({
      issues: { count: 1, waiting: false },
      research: 0
    });
  });

  test('Polls counts the open polls the viewer has not voted on', async () => {
    data.polls = [
      {
        canVote: true,
        closesAt: null,
        createdBy: { kind: 'user', name: 'Ana' },
        id: 'p1',
        myOptionIds: [],
        question: 'A',
        status: 'open',
        updatedAt: 1
      },
      {
        canVote: true,
        closesAt: null,
        createdBy: { kind: 'user', name: 'Ana' },
        id: 'p2',
        myOptionIds: ['o1'],
        question: 'B',
        status: 'open',
        updatedAt: 1
      },
      {
        canVote: true,
        closesAt: null,
        createdBy: { kind: 'user', name: 'Ana' },
        id: 'p3',
        myOptionIds: [],
        question: 'C',
        status: 'open',
        updatedAt: 1
      }
    ];
    const { result } = await renderHook(() => useTripSectionCounts(tripId));
    expect(result.current.polls).toEqual({ count: 2, waiting: true });
  });

  test('with every poll voted, Polls counts what is open', async () => {
    data.polls = [
      {
        canVote: true,
        closesAt: null,
        createdBy: { kind: 'user', name: 'Ana' },
        id: 'p1',
        myOptionIds: ['o1'],
        question: 'A',
        status: 'open',
        updatedAt: 1
      }
    ];
    const { result } = await renderHook(() => useTripSectionCounts(tripId));
    expect(result.current.polls).toEqual({ count: 1, waiting: false });
  });
});
