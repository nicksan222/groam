import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import type { QueueItem } from '@/types/queue';
import { useQueueBatch } from './use-queue-batch';

const mutations = vi.hoisted(() => ({ assign: vi.fn(), setStatus: vi.fn() }));
const setDue = vi.hoisted(() => vi.fn());
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('@/features/issues/hooks/use-issue-mutations', () => ({
  useIssueMutations: () => mutations
}));
vi.mock('./use-issue-due', () => ({ useIssueDue: () => setDue }));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const selected = [{ id: 'issue-1' }, { id: 'issue-2' }] as unknown as QueueItem[];

beforeEach(() => {
  vi.clearAllMocks();
  mutations.assign.mockResolvedValue(true);
  mutations.setStatus.mockResolvedValue(true);
  setDue.mockResolvedValue(true);
});

describe('useQueueBatch', () => {
  test('moves every selected issue and says how many', async () => {
    const { result } = await renderHook(() => useQueueBatch(selected));
    let done: string[] = [];
    await act(async () => {
      done = await result.current.setStatus('closed');
    });
    expect(mutations.setStatus).toHaveBeenCalledWith('issue-1', 'closed');
    expect(mutations.setStatus).toHaveBeenCalledWith('issue-2', 'closed');
    expect(done).toEqual(['issue-1', 'issue-2']);
    expect(notifications.success).toHaveBeenCalledWith('Moved 2 issues to Done');
  });

  test('assigns a person and unassigns with null', async () => {
    const { result } = await renderHook(() => useQueueBatch(selected.slice(0, 1)));
    const sam = { kind: 'user', name: 'Sam', userId: 'user-sam' } as const;
    await act(async () => {
      await result.current.assign(sam);
      await result.current.assign(null);
    });
    expect(mutations.assign).toHaveBeenNthCalledWith(1, 'issue-1', sam);
    expect(mutations.assign).toHaveBeenNthCalledWith(2, 'issue-1', null);
    expect(notifications.success).toHaveBeenNthCalledWith(1, 'Assigned 1 issue to Sam');
    expect(notifications.success).toHaveBeenNthCalledWith(2, 'Unassigned 1 issue');
  });

  test('clears the decide-by date', async () => {
    const { result } = await renderHook(() => useQueueBatch(selected));
    await act(async () => {
      await result.current.setDue(null);
    });
    expect(setDue).toHaveBeenCalledWith('issue-2', null);
    expect(notifications.success).toHaveBeenCalledWith('Cleared the decide-by date on 2 issues');
  });

  test('returns only the issues that took the change and stays quiet when none did', async () => {
    mutations.setStatus.mockImplementation(async (id: string) => id === 'issue-1');
    const { result } = await renderHook(() => useQueueBatch(selected));
    let done: string[] = [];
    await act(async () => {
      done = await result.current.setStatus('open');
    });
    expect(done).toEqual(['issue-1']);
    expect(notifications.success).toHaveBeenCalledWith('Moved 1 issue to To decide');

    notifications.success.mockClear();
    mutations.setStatus.mockResolvedValue(false);
    await act(async () => {
      done = await result.current.setStatus('open');
    });
    expect(done).toEqual([]);
    expect(notifications.success).not.toHaveBeenCalled();
  });
});
