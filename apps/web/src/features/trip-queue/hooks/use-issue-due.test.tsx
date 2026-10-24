import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useIssueDue } from './use-issue-due';

const convex = vi.hoisted(() => ({ useMutation: vi.fn() }));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
const due = vi.hoisted(() => vi.fn());

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const issueId = 'issue-1' as Id<'tripIssues'>;

beforeEach(() => {
  vi.clearAllMocks();
  due.mockResolvedValue(null);
  convex.useMutation.mockReturnValue(due);
});

describe('useIssueDue', () => {
  test('sets a decide-by date for the issue given per call', async () => {
    const { result } = await renderHook(() => useIssueDue());
    await act(async () => {
      expect(await result.current(issueId, 1_700_000_000_000)).toBe(true);
    });
    expect(due).toHaveBeenCalledWith({ dueAt: 1_700_000_000_000, issueId });
  });

  test('clears the date with null', async () => {
    const { result } = await renderHook(() => useIssueDue());
    await act(async () => {
      expect(await result.current(issueId, null)).toBe(true);
    });
    expect(due).toHaveBeenCalledWith({ dueAt: null, issueId });
  });

  test('toasts and returns false when the write fails', async () => {
    due.mockRejectedValue(new Error('Only organizers can set a date'));
    const { result } = await renderHook(() => useIssueDue());
    await act(async () => {
      expect(await result.current(issueId, 1)).toBe(false);
    });
    expect(notifications.error).toHaveBeenCalledWith('Only organizers can set a date');
  });
});
