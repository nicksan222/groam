import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  useAgentRun,
  useAgentRunControls,
  useAgentRunEvents,
  useIssueAgentRun,
  useStartQueuedAssignRuns
} from './use-agent-run';

const convex = vi.hoisted(() => ({
  retry: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  useAction: vi.fn(),
  useMutation: vi.fn(),
  usePaginatedQuery: vi.fn(),
  useQuery: vi.fn()
}));

vi.mock('convex/react', () => ({
  useAction: (...args: unknown[]) => convex.useAction(...args),
  useMutation: (...args: unknown[]) => convex.useMutation(...args),
  usePaginatedQuery: (...args: unknown[]) => convex.usePaginatedQuery(...args),
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

vi.mock('@groam/ui/components/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

beforeEach(() => {
  vi.clearAllMocks();
  convex.start.mockResolvedValue(null);
  convex.stop.mockResolvedValue(null);
  convex.retry.mockResolvedValue('run-next');
  convex.useAction.mockReturnValue(convex.start);
  convex.useMutation.mockReturnValueOnce(convex.stop).mockReturnValueOnce(convex.retry);
  convex.usePaginatedQuery.mockReturnValue({
    loadMore: vi.fn(),
    results: [{ id: 'new' }, { id: 'old' }],
    status: 'CanLoadMore'
  });
  convex.useQuery.mockReturnValue({ id: 'run-1' });
});

test('loads events in display order and skips run queries without an id', () => {
  const events = renderHook(() => useAgentRunEvents('run-1' as Id<'agentRuns'>));
  expect(events.result.current.events).toEqual([{ id: 'old' }, { id: 'new' }]);
  expect(events.result.current.status).toBe('CanLoadMore');

  const issue = renderHook(() => useIssueAgentRun(undefined));
  expect(issue.result.current).toEqual({ id: 'run-1' });
  expect(convex.useQuery).toHaveBeenLastCalledWith(expect.anything(), 'skip');

  const run = renderHook(() => useAgentRun('run-1' as Id<'agentRuns'>));
  expect(run.result.current).toEqual({ id: 'run-1' });
  expect(convex.useQuery).toHaveBeenLastCalledWith(expect.anything(), { runId: 'run-1' });
});

test('starts each eligible queued assignment once and ignores other runs', async () => {
  type AssignRun = {
    id: Id<'agentRuns'>;
    kickoff: string;
    status: string;
    surface: string;
  };
  const initialProps: { runs: AssignRun[] | undefined } = {
    runs: [
      {
        id: 'queued' as Id<'agentRuns'>,
        kickoff: 'assign',
        status: 'queued',
        surface: 'standalone'
      },
      {
        id: 'manual' as Id<'agentRuns'>,
        kickoff: 'manual',
        status: 'queued',
        surface: 'standalone'
      },
      { id: 'chat' as Id<'agentRuns'>, kickoff: 'assign', status: 'queued', surface: 'chat' }
    ]
  };
  const { rerender } = renderHook(
    ({ runs }: { runs: AssignRun[] | undefined }) => useStartQueuedAssignRuns(runs),
    { initialProps }
  );

  await waitFor(() => expect(convex.start).toHaveBeenCalledWith({ runId: 'queued' }));
  rerender({
    runs: [
      {
        id: 'queued' as Id<'agentRuns'>,
        kickoff: 'assign',
        status: 'queued',
        surface: 'standalone'
      }
    ]
  });
  expect(convex.start).toHaveBeenCalledTimes(1);
  rerender({ runs: undefined });
  expect(convex.start).toHaveBeenCalledTimes(1);
});

test('retries from zero by queueing a new run then starting it', async () => {
  const { result } = renderHook(() => useAgentRunControls());
  let nextId: string | undefined;
  await act(async () => {
    nextId = await result.current.retry({ runId: 'run-failed' as Id<'agentRuns'> });
  });
  expect(nextId).toBe('run-next');
  expect(convex.retry).toHaveBeenCalledWith({ runId: 'run-failed' });
  expect(convex.start).toHaveBeenCalledWith({ runId: 'run-next' });
});

test('toasts when retry from zero fails', async () => {
  convex.retry.mockRejectedValue(new Error('Stop this run before re-running'));
  const { result } = renderHook(() => useAgentRunControls());
  let nextId: string | undefined = 'sentinel';
  await act(async () => {
    nextId = await result.current.retry({ runId: 'run-failed' as Id<'agentRuns'> });
  });
  expect(nextId).toBeUndefined();
  expect(toast.error).toHaveBeenCalledWith('Stop this run before re-running');
  expect(convex.start).not.toHaveBeenCalled();
});
