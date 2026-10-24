import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useTripYourTurn } from './use-trip-your-turn';

const data = vi.hoisted(() => ({
  issues: undefined as unknown[] | undefined,
  pollsLoading: false,
  polls: [] as unknown[],
  proposals: undefined as unknown[] | undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));
vi.mock('@/features/polls/hooks/use-polls', () => ({
  useTripOpenPolls: () => ({ isLoading: data.pollsLoading, polls: data.polls })
}));
vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: () => ({ issues: data.issues })
}));
vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: () => ({ proposals: data.proposals })
}));

const tripId = 'trip-1' as Id<'trips'>;
const mine = { kind: 'user', name: 'Alex', userId: 'user-alex' };

const issue = (id: string, overrides: Record<string, unknown> = {}) => ({
  assignee: mine,
  author: { name: 'Sam', userId: 'user-sam' },
  dueAt: null,
  id,
  labels: [],
  status: 'open',
  title: `Issue ${id}`,
  updatedAt: Number(id.replace(/\D/gu, '')) || 1,
  ...overrides
});

beforeEach(() => {
  data.issues = [];
  data.pollsLoading = false;
  data.polls = [];
  data.proposals = [];
});

describe('useTripYourTurn', () => {
  test.each([
    ['issues', () => (data.issues = undefined)],
    ['ideas', () => (data.proposals = undefined)],
    ['polls', () => (data.pollsLoading = true)]
  ])('is loading until the %s have loaded', async (_name, load) => {
    load();
    const { result } = await renderHook(() => useTripYourTurn(tripId, false));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
  });

  test("names at most three of the viewer's items and counts the rest", async () => {
    data.issues = ['i1', 'i2', 'i3', 'i4', 'i5'].map((id) => issue(id));
    const { result } = await renderHook(() => useTripYourTurn(tripId, false));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toHaveLength(3);
    expect(result.current.more).toEqual({ ideas: 0, issues: 2, polls: 0 });
    expect(result.current.total).toBe(5);
  });

  test('leaves out what waits on someone else', async () => {
    data.issues = [issue('i1'), issue('i2', { assignee: null })];
    const { result } = await renderHook(() => useTripYourTurn(tripId, false));
    expect(result.current.items.map((entry) => entry.id)).toEqual(['i1']);
  });

  test('an archived trip has nothing waiting on the viewer', async () => {
    data.issues = [issue('i1')];
    const { result } = await renderHook(() => useTripYourTurn(tripId, true));
    expect(result.current.items).toEqual([]);
    expect(result.current.more).toEqual({ ideas: 0, issues: 0, polls: 0 });
  });

  test("reports the mandatory progress of the trip's issues", async () => {
    data.issues = [
      issue('i1', { assignee: null, labels: ['mandatory'], status: 'closed' }),
      issue('i2', { assignee: null, labels: ['mandatory'] })
    ];
    const { result } = await renderHook(() => useTripYourTurn(tripId, false));
    expect(result.current.progress).toEqual({ done: 1, total: 2 });
  });

  test('includes the polls the viewer has not voted on', async () => {
    data.polls = [
      {
        canVote: true,
        closesAt: null,
        createdBy: { kind: 'user', name: 'Ana' },
        id: 'p1',
        myOptionIds: [],
        question: 'Dinner?',
        status: 'open',
        updatedAt: 1
      }
    ];
    const { result } = await renderHook(() => useTripYourTurn(tripId, false));
    expect(result.current.items.map((entry) => entry.kind)).toEqual(['poll']);
  });
});
