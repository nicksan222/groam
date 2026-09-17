import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useWorkspaceNotifications } from './use-workspace-notifications';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn()
}));

vi.mock('convex/react', () => ({
  useMutation: (...args: unknown[]) => convex.useMutation(...args),
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

beforeEach(() => {
  vi.clearAllMocks();
  convex.useQuery.mockReturnValue(undefined);
  convex.useMutation.mockReturnValue(vi.fn());
});

test('uses a safe empty list while notifications are loading', () => {
  const { result } = renderHook(() => useWorkspaceNotifications());

  expect(result.current).toMatchObject({ isLoading: true, notifications: [], unread: 0 });
  expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), {});
});

test('counts unread notifications and invokes both read mutations', () => {
  const markRead = vi.fn();
  const markAllRead = vi.fn();
  convex.useQuery.mockReturnValue([
    { id: 'notification-1', readAt: null },
    { id: 'notification-2', readAt: 123 }
  ]);
  convex.useMutation.mockReturnValueOnce(markRead).mockReturnValueOnce(markAllRead);
  const { result } = renderHook(() => useWorkspaceNotifications());

  expect(result.current).toMatchObject({ isLoading: false, unread: 1 });
  act(() => {
    result.current.markNotificationRead('notification-1' as Id<'workspaceNotifications'>);
    result.current.markAllRead();
  });
  expect(markRead).toHaveBeenCalledWith({ notificationId: 'notification-1' });
  expect(markAllRead).toHaveBeenCalledWith({});
});
