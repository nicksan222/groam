import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useWorkspaceNotifications } from './use-workspace-notifications';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn()
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useMutation: (...args: unknown[]) => convex.useMutation(...args),
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

beforeEach(() => {
  vi.clearAllMocks();
  convex.useQuery.mockReturnValue(undefined);
  convex.useMutation.mockReturnValue(vi.fn());
});

test('uses a safe empty list while notifications are loading', async () => {
  const { result } = await renderHook(() => useWorkspaceNotifications());

  expect(result.current).toMatchObject({ isLoading: true, notifications: [], unread: 0 });
  expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), {});
});

test('counts unread notifications and invokes both read mutations', async () => {
  const markRead = vi.fn();
  const markAllRead = vi.fn();
  convex.useQuery.mockReturnValue([
    { id: 'notification-1', readAt: null },
    { id: 'notification-2', readAt: 123 }
  ]);
  convex.useMutation.mockReturnValueOnce(markRead).mockReturnValueOnce(markAllRead);
  const { result } = await renderHook(() => useWorkspaceNotifications());

  expect(result.current).toMatchObject({ isLoading: false, unread: 1 });
  await act(() => {
    result.current.markNotificationRead('notification-1' as Id<'workspaceNotifications'>);
    result.current.markAllRead();
  });
  expect(markRead).toHaveBeenCalledWith({ notificationId: 'notification-1' });
  expect(markAllRead).toHaveBeenCalledWith({});
});
