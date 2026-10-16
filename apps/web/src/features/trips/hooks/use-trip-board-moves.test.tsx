import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import type { IssueListItem, WorkspaceIssue } from '@/types/issues';
import type { TripBoardDropTarget } from '@/types/trip-board';
import type {
  TripBoardIdea,
  TripBoardIdeaItem,
  TripBoardIssue,
  TripBoardIssueItem,
  TripBoardRights
} from '@/types/trip-board';
import { useTripBoardMoves } from './use-trip-board-moves';

const listItem = {
  assignee: null,
  author: { name: 'Alex Morgan', userId: 'user-alex' },
  canAssign: true,
  canManage: true,
  condition: null,
  dueAt: null,
  id: 'issue-1' as Id<'tripIssues'>,
  idea: null,
  labels: [],
  rank: 0,
  status: 'open',
  title: 'Coast day',
  updatedAt: Date.UTC(2026, 7, 17)
} satisfies Omit<IssueListItem, 'tripName'>;

const workspaceIssue = (over: Partial<WorkspaceIssue> = {}): WorkspaceIssue => ({
  ...listItem,
  body: 'Add a coast day near Lisbon.',
  closedAt: null,
  tripId: 'trip-1' as Id<'trips'>,
  tripName: 'Atlantic week',
  ...over
});

/** A board issue; `id` doubles as the title so tests can find the card by name. */
const boardIssue = (id: string, over: Partial<TripBoardIssue> = {}): TripBoardIssue =>
  workspaceIssue({ id: id as Id<'tripIssues'>, title: id, ...over });

const boardIdea = (id: string, over: Partial<TripBoardIdea> = {}): TripBoardIdea => ({
  author: { name: 'Sam', userId: 'user-sam' },
  baseUpdatedAt: 0,
  canApprove: false,
  canMerge: false,
  conflictCount: 0,
  feedbackCount: 0,
  hasApproved: false,
  id: id as Id<'tripProposals'>,
  ideaName: id,
  issueId: null,
  status: 'in_review',
  submittedAt: null,
  title: id,
  unresolvedFeedbackCount: 0,
  updatedAt: Date.now(),
  workingTripId: 'trip-work' as Id<'trips'>,
  ...over
});

/** A lifted issue card; pass `archived` or `canPropose` to change what the viewer may do. */
const issueItem = (
  over: Partial<TripBoardIssue> = {},
  { archived = false, canPropose = true }: Partial<TripBoardRights> = {}
): TripBoardIssueItem => ({
  archived,
  canPropose,
  issue: boardIssue('issue-1', over),
  kind: 'issue'
});

const ideaItem = (
  over: Partial<TripBoardIdea> = {},
  { archived = false, canPropose = true }: Partial<TripBoardRights> = {}
): TripBoardIdeaItem => ({ archived, canPropose, idea: boardIdea('idea-1', over), kind: 'idea' });

type Optimistic = (
  store: { getQuery: (...args: unknown[]) => unknown; setQuery: (...args: unknown[]) => void },
  args: unknown
) => void;

const mocks = vi.hoisted(() => ({
  createVersion: vi.fn(),
  merge: vi.fn(),
  move: vi.fn(),
  navigate: vi.fn(),
  optimistic: undefined as unknown,
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() }
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useAction: () => mocks.merge,
  useMutation: () =>
    Object.assign(mocks.move, {
      withOptimisticUpdate: (update: unknown) => {
        mocks.optimistic = update;
        return mocks.move;
      }
    })
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => mocks.navigate
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: mocks.toast }));
vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useCreateTripVersion: () => mocks.createVersion
}));

const tripId = 'trip-1' as Id<'trips'>;
const issueId = 'issue-1' as Id<'tripIssues'>;

const at = (over: Partial<TripBoardDropTarget>): TripBoardDropTarget => ({
  index: 0,
  lane: 'open',
  unchanged: false,
  ...over
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.move.mockResolvedValue(null);
  mocks.merge.mockResolvedValue('applied');
  mocks.createVersion.mockResolvedValue({ proposalId: 'proposal-2' });
});

describe('useTripBoardMoves', () => {
  test('moves an issue with its neighbours', async () => {
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    await act(async () =>
      result.current.drop(
        issueItem({ status: 'open' }),
        at({
          afterIssueId: 'next' as Id<'tripIssues'>,
          beforeIssueId: 'prev' as Id<'tripIssues'>,
          lane: 'closed'
        })
      )
    );
    expect(mocks.move).toHaveBeenCalledWith({
      afterIssueId: 'next',
      beforeIssueId: 'prev',
      issueId,
      status: 'closed'
    });
  });

  test('reorders inside a lane but skips a drop back in place', async () => {
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    await act(async () => result.current.drop(issueItem(), at({ unchanged: true })));
    expect(mocks.move).not.toHaveBeenCalled();
    await act(async () =>
      result.current.drop(issueItem(), at({ beforeIssueId: 'prev' as Id<'tripIssues'> }))
    );
    expect(mocks.move).toHaveBeenCalledWith(
      expect.objectContaining({ beforeIssueId: 'prev', issueId, status: 'open' })
    );
  });

  test('opens the issue page once an issue dropped into In progress has moved', async () => {
    let finish: () => void = () => undefined;
    mocks.move.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    let dropped: Promise<unknown> = Promise.resolve();
    await act(async () => {
      dropped = result.current.drop(issueItem(), at({ lane: 'in_progress' }));
    });
    expect(mocks.navigate).not.toHaveBeenCalled();
    await act(async () => {
      finish();
      await dropped;
    });
    expect(mocks.navigate).toHaveBeenCalledWith({ params: { issueId }, to: '/issues/$issueId' });
  });

  test('stays on the board when the move into In progress fails', async () => {
    mocks.move.mockRejectedValueOnce(new Error('Nope'));
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    await act(async () => result.current.drop(issueItem(), at({ lane: 'in_progress' })));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  test.each([
    ['it only reorders in progress', issueItem({ status: 'in_progress' }), 'in_progress'],
    ['it goes elsewhere', issueItem(), 'closed']
  ] as const)('stays on the board when %s', async (_name, item, lane) => {
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    await act(async () => result.current.drop(item, at({ lane })));
    expect(mocks.move).toHaveBeenCalledOnce();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  test('applies the optimistic update to the trip issue list', async () => {
    await renderHook(() => useTripBoardMoves(tripId));
    const setQuery = vi.fn();
    const issues = [boardIssue('a'), boardIssue('b')];
    (mocks.optimistic as Optimistic)(
      { getQuery: () => issues, setQuery },
      { beforeIssueId: 'b', issueId: 'a', status: 'in_progress' }
    );
    const [, args, next] = setQuery.mock.calls[0] as [unknown, unknown, typeof issues];
    expect(args).toEqual({ tripId });
    expect(next.map(({ id, status }) => `${id}:${status}`)).toEqual(['b:open', 'a:in_progress']);
  });

  test('leaves an unloaded list alone', async () => {
    await renderHook(() => useTripBoardMoves(tripId));
    const setQuery = vi.fn();
    (mocks.optimistic as Optimistic)(
      { getQuery: () => undefined, setQuery },
      { issueId: 'a', status: 'closed' }
    );
    expect(setQuery).not.toHaveBeenCalled();
  });

  test('starts an idea for an issue and opens it', async () => {
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    await act(async () => result.current.drop(issueItem(), at({ lane: 'review' })));
    expect(mocks.createVersion).toHaveBeenCalledWith({ issueId });
    expect(mocks.navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ proposalId: 'proposal-2', tripId })
      })
    );
  });

  test('applies a mergeable idea and warns when it conflicts', async () => {
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    await act(async () =>
      result.current.drop(ideaItem({ canMerge: true }), at({ lane: 'agreed' }))
    );
    expect(mocks.merge).toHaveBeenCalledWith({ proposalId: 'idea-1' });
    expect(mocks.toast.success).toHaveBeenCalledWith('Applied to the shared trip');
    mocks.merge.mockResolvedValue('conflict');
    await act(async () =>
      result.current.drop(ideaItem({ canMerge: true }), at({ lane: 'agreed' }))
    );
    expect(mocks.toast.warning).toHaveBeenCalled();
  });

  test('explains a refused drop without calling anything', async () => {
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    await act(async () => result.current.drop(ideaItem(), at({ lane: 'agreed' })));
    expect(mocks.toast.info).toHaveBeenCalledWith('Needs approvals before it can be applied');
    expect(mocks.merge).not.toHaveBeenCalled();
  });

  test('ignores drops that are not targets', async () => {
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    await act(async () => result.current.drop(issueItem(), at({ lane: 'agreed' })));
    expect(mocks.move).not.toHaveBeenCalled();
    expect(mocks.toast.info).not.toHaveBeenCalled();
  });

  test('reports failures', async () => {
    mocks.move.mockRejectedValue(new Error('Nope'));
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    await act(async () => result.current.drop(issueItem(), at({ lane: 'closed' })));
    expect(mocks.toast.error).toHaveBeenCalledWith('Nope');
  });

  test('says so when a start or apply is already running', async () => {
    mocks.merge.mockReturnValue(new Promise(() => undefined));
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    await act(async () => {
      void result.current.drop(ideaItem({ canMerge: true }), at({ lane: 'agreed' }));
      await result.current.drop(ideaItem({ canMerge: true }), at({ lane: 'agreed' }));
    });
    expect(mocks.toast.info).toHaveBeenCalledWith('Already working on it');
  });

  test('runs one start or apply at a time', async () => {
    let finish: (value: string) => void = () => undefined;
    mocks.merge.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = await renderHook(() => useTripBoardMoves(tripId));
    let first: Promise<unknown> = Promise.resolve();
    await act(async () => {
      first = result.current.drop(ideaItem({ canMerge: true }), at({ lane: 'agreed' }));
      await result.current.drop(ideaItem({ canMerge: true }), at({ lane: 'agreed' }));
    });
    expect(mocks.merge).toHaveBeenCalledOnce();
    await act(async () => {
      finish('applied');
      await first;
    });
  });
});
