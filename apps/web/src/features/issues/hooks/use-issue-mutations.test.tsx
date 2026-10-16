import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { getFunctionName } from 'convex/server';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useIssueMutations } from './use-issue-mutations';

const convex = vi.hoisted(() => ({ useMutation: vi.fn() }));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const issueId = 'issue-1' as Id<'tripIssues'>;
const handlers = {
  assign: vi.fn(),
  status: vi.fn()
};

beforeEach(() => {
  vi.clearAllMocks();
  handlers.assign.mockResolvedValue(null);
  handlers.status.mockResolvedValue(null);
  convex.useMutation.mockImplementation((reference: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(reference).includes('assign') ? handlers.assign : handlers.status
  );
});

describe('useIssueMutations', () => {
  test('sets any lifecycle status for the given issue', async () => {
    const { result } = await renderHook(() => useIssueMutations());
    await act(async () => {
      expect(await result.current.setStatus(issueId, 'wont_do')).toBe(true);
    });
    expect(handlers.status).toHaveBeenCalledWith({ issueId, status: 'wont_do' });
  });

  test('assigns a person and unassigns with null', async () => {
    const { result } = await renderHook(() => useIssueMutations());
    await act(async () => {
      expect(
        await result.current.assign(issueId, { kind: 'user', name: 'Sam', userId: 'user-sam' })
      ).toBe(true);
      expect(await result.current.assign(issueId, null)).toBe(true);
    });
    expect(handlers.assign).toHaveBeenNthCalledWith(1, {
      assignee: { kind: 'user', name: 'Sam', userId: 'user-sam' },
      issueId
    });
    expect(handlers.assign).toHaveBeenNthCalledWith(2, { assignee: null, issueId });
  });

  test('toasts and returns false when a write fails', async () => {
    handlers.status.mockRejectedValue(new Error('Only organizers can change status'));
    const { result } = await renderHook(() => useIssueMutations());
    await act(async () => {
      expect(await result.current.setStatus(issueId, 'closed')).toBe(false);
    });
    expect(notifications.error).toHaveBeenCalledWith('Only organizers can change status');
  });
});
