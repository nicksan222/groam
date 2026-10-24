import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import { Bell, CheckCheckIcon } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import Shell from '@groam/ui/components/shell/client';
import { SHELL_HEADER_FACT } from '@groam/ui/lib/shell-layout';
import { cn } from '@groam/ui/lib/utils';
import { Link } from '@/features/workspace/navigation/router';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { useWorkspaceNotifications } from './hooks/use-workspace-notifications';
import { InboxNotificationList } from './inbox-notification-list';

export function InboxView() {
  const { activeOrganization } = useWorkspace();
  const { isLoading, markAllRead, markNotificationRead, notifications, unread } =
    useWorkspaceNotifications();

  useSetAgentContext({
    capabilities: [],
    data: {
      activeGroup: activeOrganization.name,
      notifications: notifications.map((item) => ({
        id: item.id,
        kind: item.kind,
        read: item.readAt !== null,
        title: item.title
      })),
      unreadCount: unread
    },
    description: 'Summarize unread workspace notifications and what needs attention next.',
    key: 'inbox:list',
    title: 'Inbox'
  });

  return (
    <Shell>
      <Shell.BannerLayout>
        <Shell.Header
          actions={
            unread > 0 && !isLoading ? (
              <Shell.Action
                data-testid={testIds.inboxMarkAll}
                desktopIcon={null}
                icon={CheckCheckIcon}
                label="Mark all read"
                onClick={() => void markAllRead()}
                tone="secondary"
              />
            ) : null
          }
          meta={
            <>
              <span className={cn(SHELL_HEADER_FACT, 'sm:hidden')}>
                What happened in your trips.
              </span>
              <span className={cn(SHELL_HEADER_FACT, 'max-sm:hidden')}>
                What happened in your trips: ideas shared, applied, passed, and review requests.
              </span>
            </>
          }
          title="Inbox"
          titleProps={{ 'data-testid': testIds.inboxTitle }}
        />
        <Shell.PageBody>
          <>
            {isLoading || notifications.length > 0 ? (
              <InboxNotificationList
                isLoading={isLoading}
                markNotificationRead={markNotificationRead}
                notifications={notifications}
              />
            ) : (
              <EmptyScreen
                buttonRaw={
                  <Button asChild variant="outline">
                    <Link data-testid={testIds.inboxGoHome} to="/">
                      Go to Home
                    </Link>
                  </Button>
                }
                description="Nothing new yet. When someone shares, applies, or passes an idea in your trips, it shows up here."
                headline="You’re caught up"
                icon={Bell}
              />
            )}
          </>
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
