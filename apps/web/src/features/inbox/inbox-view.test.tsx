import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { InboxNotification } from '@/types/inbox';
import { InboxView } from './inbox-view';

const state = vi.hoisted(() => ({
  isLoading: false,
  notifications: [] as unknown[],
  unread: 0
}));
const markAllRead = vi.hoisted(() => vi.fn());
const markNotificationRead = vi.hoisted(() => vi.fn());
const setContext = vi.hoisted(() => vi.fn());

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: setContext
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ activeOrganization: { id: 'org-acme', name: 'Acme Labs' } })
}));

vi.mock('./hooks/use-workspace-notifications', () => ({
  useWorkspaceNotifications: () => ({
    isLoading: state.isLoading,
    markAllRead,
    markNotificationRead,
    notifications: state.notifications,
    unread: state.unread
  })
}));

function makeNotification(overrides: Partial<InboxNotification> = {}): InboxNotification {
  return {
    body: 'Sam asked you to review the Lisbon idea.',
    createdAt: 1_700_000_000_000,
    href: '/ideas/lisbon',
    id: 'notification-1' as InboxNotification['id'],
    kind: 'idea_shared',
    readAt: null,
    title: 'Review requested',
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.isLoading = false;
  state.notifications = [];
  state.unread = 0;
});

describe('InboxView', () => {
  test('shows a loading state while notifications load', async () => {
    state.isLoading = true;
    await render(<InboxView />);
    await expect.element(page.getByText('Loading notifications…')).toBeVisible();
    await expect.element(page.getByTestId(testIds.inboxTitle)).not.toBeInTheDocument();
  });

  test('shows the caught-up empty state without a mark-all action', async () => {
    await render(<InboxView />);
    await expect.element(page.getByTestId(testIds.inboxTitle)).toBeVisible();
    await expect.element(page.getByText('You’re caught up')).toBeVisible();
    await expect.element(page.getByTestId(testIds.inboxMarkAll)).not.toBeInTheDocument();
  });

  test('lists notifications and marks all read when some are unread', async () => {
    state.notifications = [makeNotification()];
    state.unread = 1;
    await render(<InboxView />);
    await expect.element(page.getByText('Review requested')).toBeVisible();
    await page.getByTestId(testIds.inboxMarkAll).click();
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  test('hides mark-all when every notification is read', async () => {
    state.notifications = [makeNotification({ readAt: 5 })];
    await render(<InboxView />);
    await expect.element(page.getByText('Review requested')).toBeVisible();
    await expect.element(page.getByTestId(testIds.inboxMarkAll)).not.toBeInTheDocument();
  });

  test('registers the inbox with the assistant', async () => {
    state.notifications = [makeNotification()];
    state.unread = 1;
    await render(<InboxView />);
    expect(setContext).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activeGroup: 'Acme Labs', unreadCount: 1 }),
        key: 'inbox:list'
      })
    );
  });
});
