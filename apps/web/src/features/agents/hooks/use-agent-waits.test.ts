import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useCancelWait, useDiscussionWaits, useRunWait } from './use-agent-waits';

const convex = vi.hoisted(() => ({
  cancel: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn()
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useMutation: (...args: unknown[]) => convex.useMutation(...args),
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

vi.mock('@groam/ui/components/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

const waitId = 'wait-1' as Id<'agentWaits'>;

beforeEach(() => {
  vi.clearAllMocks();
  convex.cancel.mockResolvedValue(null);
  convex.useMutation.mockReturnValue(convex.cancel);
  convex.useQuery.mockReturnValue(undefined);
});

test('skips the run wait query without a run id', async () => {
  await renderHook(() => useRunWait(undefined));
  expect(convex.useQuery).toHaveBeenLastCalledWith(expect.anything(), 'skip');
  await renderHook(() => useRunWait('run-1' as Id<'agentRuns'>));
  expect(convex.useQuery).toHaveBeenLastCalledWith(expect.anything(), { runId: 'run-1' });
});

test('discussion waits read as empty while loading', async () => {
  const loading = await renderHook(() => useDiscussionWaits('chat-1' as Id<'discussions'>));
  expect(loading.result.current).toEqual([]);
  convex.useQuery.mockReturnValue([{ id: waitId }]);
  const loaded = await renderHook(() => useDiscussionWaits('chat-1' as Id<'discussions'>));
  expect(loaded.result.current).toEqual([{ id: waitId }]);
});

test('cancelling a wait reports success, or toasts the failure', async () => {
  const { result } = await renderHook(() => useCancelWait());
  let cancelled: boolean | undefined;
  await act(async () => {
    cancelled = await result.current(waitId);
  });
  expect(cancelled).toBe(true);
  expect(convex.cancel).toHaveBeenCalledWith({ waitId });

  convex.cancel.mockRejectedValueOnce(new Error('Only the trip creator or a group admin'));
  await act(async () => {
    cancelled = await result.current(waitId);
  });
  expect(cancelled).toBe(false);
  expect(toast.error).toHaveBeenCalledWith('Only the trip creator or a group admin');
});
