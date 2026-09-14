import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useAgentRunControls } from './use-agent-run';

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
