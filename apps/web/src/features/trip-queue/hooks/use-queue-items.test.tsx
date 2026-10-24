import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useQueueItems } from './use-queue-items';

const data = vi.hoisted(() => ({
  issues: undefined as unknown[] | undefined,
  pollsLoading: false,
  proposals: undefined as unknown[] | undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));
vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: () => ({ issues: data.issues })
}));
vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: () => ({ proposals: data.proposals })
}));

const tripId = 'trip-1' as Id<'trips'>;
const feed = () => ({
  canLoadMore: true,
  isLoading: data.pollsLoading,
  loadMore: vi.fn(),
  polls: []
});

beforeEach(() => {
  data.issues = [];
  data.pollsLoading = false;
  data.proposals = [];
});

const issue = (id: string, title: string) => ({
  assignee: null,
  author: { name: 'Sam', userId: 'user-sam' },
  dueAt: null,
  id,
  labels: [],
  status: 'open',
  title,
  updatedAt: 1
});

describe('useQueueItems', () => {
  test.each([
    [
      'issue',
      () => {
        data.issues = undefined;
      }
    ],
    [
      'idea',
      () => {
        data.proposals = undefined;
      }
    ],
    [
      'poll',
      () => {
        data.pollsLoading = true;
      }
    ]
  ] as const)('is loading until the %s list has loaded', async (kind, load) => {
    load();
    const { result } = await renderHook(() =>
      useQueueItems({ archived: false, kind, pollFeed: feed(), tripId })
    );
    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
  });

  test('does not wait for the lists of other kinds', async () => {
    data.proposals = undefined;
    data.pollsLoading = true;
    const { result } = await renderHook(() =>
      useQueueItems({ archived: false, kind: 'issue', tripId })
    );
    expect(result.current.isLoading).toBe(false);
  });

  test('lists the one kind once loaded and passes paging through', async () => {
    data.issues = [issue('i1', 'Pick a hotel')];
    const { result } = await renderHook(() =>
      useQueueItems({ archived: false, kind: 'issue', pollFeed: feed(), tripId })
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.items.map((item) => item.title)).toEqual(['Pick a hotel']);
    expect(result.current.canLoadMore).toBe(true);
  });

  test('lists the trip ideas for the idea kind', async () => {
    data.proposals = [
      {
        author: { name: 'Sam', userId: 'user-sam' },
        id: 'idea-1',
        issueId: null,
        status: 'in_review',
        title: 'Add a coast day',
        updatedAt: 1,
        workingTripId: 'working-1'
      }
    ];
    const { result } = await renderHook(() =>
      useQueueItems({ archived: false, kind: 'idea', tripId })
    );
    expect(result.current.items.map((item) => item.title)).toEqual(['Add a coast day']);
    expect(result.current.items[0]).toMatchObject({ kind: 'idea', who: 'By Sam' });
  });

  test('lists the shared poll feed for the poll kind', async () => {
    const poll = {
      canVote: true,
      closesAt: null,
      createdBy: { name: 'Sam', userId: 'user-sam' },
      id: 'poll-1',
      myOptionIds: [],
      question: 'Beach or mountains?',
      status: 'open',
      updatedAt: 1
    };
    const { result } = await renderHook(() =>
      useQueueItems({
        archived: false,
        kind: 'poll',
        pollFeed: { ...feed(), polls: [poll] as never },
        tripId
      })
    );
    expect(result.current.items.map((item) => item.title)).toEqual(['Beach or mountains?']);
  });

  test('has nothing to page when no poll feed is given', async () => {
    const { result } = await renderHook(() =>
      useQueueItems({ archived: false, kind: 'issue', tripId })
    );
    expect(result.current.canLoadMore).toBe(false);
    expect(result.current.loadMore()).toBeUndefined();
  });

  test('waits on nobody in an archived trip', async () => {
    data.issues = [
      {
        ...issue('i1', 'Pick a hotel'),
        assignee: { kind: 'user', name: 'Alex', userId: 'user-alex' }
      }
    ];
    const { result } = await renderHook(() =>
      useQueueItems({ archived: true, kind: 'issue', tripId })
    );
    expect(result.current.items.map((item) => item.yourTurn)).toEqual([false]);
  });
});
