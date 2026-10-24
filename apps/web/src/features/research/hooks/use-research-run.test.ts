import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useResearchRun } from './use-research-run';

const mocks = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), useQuery: vi.fn(), events: [] }));
vi.mock('convex/react', async (original) => ({
  ...(await original<typeof import('convex/react')>()),
  useMutation: () => mocks.start,
  useQuery: (...args: unknown[]) => mocks.useQuery(...args)
}));
vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRunControls: () => ({ stop: mocks.stop }),
  useAgentRunEvents: () => ({ events: mocks.events })
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.start.mockResolvedValue('run-1');
  mocks.stop.mockResolvedValue(undefined);
  mocks.useQuery.mockReturnValue(null);
});
const id = 'research-1' as Id<'discussions'>;

test('subscribes to persisted research and sends topic and effort to the mutation', async () => {
  const { result } = await renderHook(() => useResearchRun(id));
  expect(mocks.useQuery).toHaveBeenCalledWith(expect.anything(), { discussionId: id });
  expect(result.current.isLoading).toBe(false);
  let started = false;
  await act(async () => {
    started = await result.current.start({ effort: 'deep', topic: 'Hotels' });
  });
  expect(started).toBe(true);
  expect(mocks.start).toHaveBeenCalledWith({ discussionId: id, effort: 'deep', topic: 'Hotels' });
});

test('exposes loading, active progress, and stop for the latest run', async () => {
  mocks.useQuery.mockReturnValue(undefined);
  const loading = await renderHook(() => useResearchRun(id));
  expect(loading.result.current.isLoading).toBe(true);
  await loading.unmount();
  mocks.useQuery.mockReturnValue({ id: 'run-1', status: 'running' });
  const { result } = await renderHook(() => useResearchRun(id));
  expect(result.current.isActive).toBe(true);
  await act(async () => {
    await result.current.stop();
  });
  expect(mocks.stop).toHaveBeenCalledWith({ runId: 'run-1' });
});

test('returns a recoverable inline error after a failed start', async () => {
  mocks.start.mockRejectedValue(new Error('Connect ChatGPT'));
  const { result } = await renderHook(() => useResearchRun(id));
  await act(async () => {
    expect(await result.current.start({ effort: 'quick', topic: 'Hotels' })).toBe(false);
  });
  expect(result.current.error).toBe('Connect ChatGPT');
  expect(result.current.isStarting).toBe(false);
  mocks.start.mockResolvedValue('run-2');
  await act(async () => {
    await result.current.start({ effort: 'standard', topic: 'Hotels' });
  });
  expect(result.current.error).toBeNull();
});

test('shows an inline error when stopping fails', async () => {
  mocks.useQuery.mockReturnValue({ id: 'run-1', status: 'running' });
  mocks.stop.mockRejectedValueOnce(new Error('Unable to stop this run'));
  const { result } = await renderHook(() => useResearchRun(id));
  await act(async () => {
    await result.current.stop();
  });
  expect(result.current.error).toBe('Unable to stop this run');
});
