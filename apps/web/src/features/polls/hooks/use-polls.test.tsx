import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useDiscussionPolls, usePollActions, useTripOpenPolls, useTripPolls } from './use-polls';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn(),
  usePaginatedQuery: vi.fn(),
  useQuery: vi.fn()
}));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));
const ui = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('@groam/ui/components/toast', () => ({ toast: { error: ui.error, success: vi.fn() } }));

const pollId = 'p1' as Id<'polls'>;

beforeEach(() => {
  vi.clearAllMocks();
});

test('trip polls skip without a trip and report loading until both lists arrive', async () => {
  const page = (status: string, results: unknown[] = [], loadMore = vi.fn()) => ({
    loadMore,
    results,
    status
  });
  convex.usePaginatedQuery.mockReturnValue(page('LoadingFirstPage'));
  const skipped = await renderHook(() => useTripPolls(undefined));
  expect(convex.usePaginatedQuery).toHaveBeenLastCalledWith(expect.anything(), 'skip', {
    initialNumItems: 10
  });
  expect(skipped.result.current).toMatchObject({ canLoadMore: false, isLoading: false, polls: [] });
  const loading = await renderHook(() => useTripPolls('t1' as Id<'trips'>));
  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(
    expect.anything(),
    { status: 'open', tripId: 't1' },
    { initialNumItems: 50 }
  );
  expect(loading.result.current.isLoading).toBe(true);
});

test('open polls come first and load before older closed ones', async () => {
  const openMore = vi.fn();
  const closedMore = vi.fn();
  convex.usePaginatedQuery.mockImplementation((_ref: unknown, args: { status?: string }) =>
    args.status === 'open'
      ? { loadMore: openMore, results: [{ id: 'a' }], status: 'Exhausted' }
      : { loadMore: closedMore, results: [{ id: 'b' }], status: 'CanLoadMore' }
  );
  const { result } = await renderHook(() => useTripPolls('t1' as Id<'trips'>));
  expect(result.current.polls).toEqual([{ id: 'a' }, { id: 'b' }]);
  expect(result.current.canLoadMore).toBe(true);
  await act(async () => result.current.loadMore());
  expect(closedMore).toHaveBeenCalledWith(10);
  expect(openMore).not.toHaveBeenCalled();
});

test('discussion polls default to an empty list', async () => {
  convex.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() => useDiscussionPolls('d1' as Id<'discussions'>));
  expect(result.current.polls).toEqual([]);
});

test('vote forwards the options and toasts a failure', async () => {
  const mutate = vi.fn().mockRejectedValue({});
  convex.useMutation.mockReturnValue(mutate);
  const { result } = await renderHook(() => usePollActions());
  let ok: unknown;
  await act(async () => {
    ok = await result.current.vote(pollId, ['o1']);
  });
  expect(ok).toBe(false);
  expect(mutate).toHaveBeenCalledWith({ optionIds: ['o1'], pollId });
  expect(ui.error).toHaveBeenCalledWith('Unable to vote');
});

test('create, retract, and close call their routes', async () => {
  const mutate = vi.fn().mockResolvedValue('p9');
  convex.useMutation.mockReturnValue(mutate);
  const { result } = await renderHook(() => usePollActions());
  let created: unknown;
  await act(async () => {
    created = await result.current.create({
      multiSelect: false,
      options: ['A', 'B'],
      question: 'Q'
    });
    await result.current.retract(pollId);
    await result.current.close(pollId);
  });
  expect(created).toBe('p9');
  expect(mutate).toHaveBeenCalledWith({ pollId });
  expect(ui.error).not.toHaveBeenCalled();
});

test('open polls load more before the closed ones, and paging stops when both are done', async () => {
  const openMore = vi.fn();
  const closedMore = vi.fn();
  let openStatus = 'CanLoadMore';
  convex.usePaginatedQuery.mockImplementation((_ref: unknown, args: { status?: string }) =>
    args.status === 'open'
      ? { loadMore: openMore, results: [], status: openStatus }
      : { loadMore: closedMore, results: [], status: 'Exhausted' }
  );
  const { rerender, result } = await renderHook(() => useTripPolls('t1' as Id<'trips'>));
  await act(async () => result.current.loadMore());
  expect(openMore).toHaveBeenCalledWith(50);
  expect(closedMore).not.toHaveBeenCalled();
  expect(result.current.polls).toEqual([]);

  openStatus = 'Exhausted';
  await rerender();
  expect(result.current.canLoadMore).toBe(false);
  await act(async () => result.current.loadMore());
  expect(openMore).toHaveBeenCalledTimes(1);
  expect(closedMore).not.toHaveBeenCalled();
});

test('the open-polls summary skips without a trip, then loads and lists the first page', async () => {
  convex.usePaginatedQuery.mockReturnValue({
    loadMore: vi.fn(),
    results: [],
    status: 'LoadingFirstPage'
  });
  const skipped = await renderHook(() => useTripOpenPolls(undefined));
  expect(convex.usePaginatedQuery).toHaveBeenLastCalledWith(expect.anything(), 'skip', {
    initialNumItems: 50
  });
  expect(skipped.result.current).toEqual({ isLoading: false, polls: [] });

  const loading = await renderHook(() => useTripOpenPolls('t1' as Id<'trips'>));
  expect(loading.result.current.isLoading).toBe(true);

  convex.usePaginatedQuery.mockReturnValue({
    loadMore: vi.fn(),
    results: [{ id: 'a' }],
    status: 'Exhausted'
  });
  const loaded = await renderHook(() => useTripOpenPolls('t1' as Id<'trips'>));
  expect(loaded.result.current).toEqual({ isLoading: false, polls: [{ id: 'a' }] });
});

test('discussion polls pass through what the query returns', async () => {
  convex.useQuery.mockReturnValue([{ id: 'a' }]);
  const { result } = await renderHook(() => useDiscussionPolls('d1' as Id<'discussions'>));
  expect(result.current.polls).toEqual([{ id: 'a' }]);
});

test('remove deletes the poll and toasts a failure', async () => {
  const mutate = vi.fn().mockRejectedValue({});
  convex.useMutation.mockReturnValue(mutate);
  const { result } = await renderHook(() => usePollActions());
  let ok: unknown;
  await act(async () => {
    ok = await result.current.remove(pollId);
  });
  expect(ok).toBe(false);
  expect(mutate).toHaveBeenCalledWith({ pollId });
  expect(ui.error).toHaveBeenCalledWith('Unable to delete the poll');
});

test('create resolves to null and toasts when it fails', async () => {
  convex.useMutation.mockReturnValue(vi.fn().mockRejectedValue({}));
  const { result } = await renderHook(() => usePollActions());
  let created: unknown = 'unset';
  await act(async () => {
    created = await result.current.create({
      multiSelect: false,
      options: ['A', 'B'],
      question: 'Q'
    });
  });
  expect(created).toBeNull();
  expect(ui.error).toHaveBeenCalledWith('Unable to create the poll');
});
