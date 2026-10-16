import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { type InboxNotification, InboxNotificationList } from './inbox-notification-list';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

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

const markNotificationRead = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InboxNotificationList', () => {
  test('shows a labeled loading state', async () => {
    await render(
      <InboxNotificationList
        isLoading
        markNotificationRead={markNotificationRead}
        notifications={[]}
      />
    );
    await expect.element(page.getByRole('status', { name: 'Loading inbox…' })).toBeVisible();
    await expect.element(page.getByTestId(testIds.inboxItem)).not.toBeInTheDocument();
  });

  test('renders each notification title and body', async () => {
    await render(
      <InboxNotificationList
        isLoading={false}
        markNotificationRead={markNotificationRead}
        notifications={[
          makeNotification(),
          makeNotification({
            body: 'You were invited to Tokyo.',
            id: 'notification-2' as InboxNotification['id'],
            readAt: 5,
            title: 'Trip invite'
          })
        ]}
      />
    );
    await expect.element(page.getByText('Review requested')).toBeVisible();
    await expect.element(page.getByText('You were invited to Tokyo.')).toBeVisible();
    await expect.poll(() => page.getByTestId(testIds.inboxItem).elements().length).toBe(2);
  });

  test('marks an unread notification read and navigates to it', async () => {
    await render(
      <InboxNotificationList
        isLoading={false}
        markNotificationRead={markNotificationRead}
        notifications={[makeNotification()]}
      />
    );
    await page.getByText('Review requested').click();
    expect(markNotificationRead).toHaveBeenCalledWith('notification-1');
    expect(navigate).toHaveBeenCalledWith({ to: '/ideas/lisbon' });
  });

  test('only navigates for an already read notification', async () => {
    await render(
      <InboxNotificationList
        isLoading={false}
        markNotificationRead={markNotificationRead}
        notifications={[makeNotification({ readAt: 10 })]}
      />
    );
    await page.getByText('Review requested').click();
    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: '/ideas/lisbon' });
  });
});
