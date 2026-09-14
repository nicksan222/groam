import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { Bell } from 'lucide-react';
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

  if (isLoading) return <PageLoading label="Loading notifications…" />;

  return (
    <Shell>
      <Shell.Header>
        <Shell.Title data-testid={testIds.inboxTitle}>Inbox</Shell.Title>
        <Shell.Description>
          <span className="sm:hidden">Updates that need your attention.</span>
          <span className="hidden sm:inline">
            Review requests, invites, and other updates from your group.
          </span>
        </Shell.Description>
      </Shell.Header>
      {unread > 0 && !isLoading ? (
        <Shell.Action
          data-testid={testIds.inboxMarkAll}
          onClick={() => void markAllRead()}
          text="Mark all read"
          variant="outline"
        />
      ) : null}
      <Shell.Content>
        <Shell.PageStack>
          {isLoading || notifications.length > 0 ? (
            <InboxNotificationList
              isLoading={isLoading}
              markNotificationRead={markNotificationRead}
              notifications={notifications}
            />
          ) : (
            <EmptyScreen
              border
              description="When someone requests a review or something needs your attention, it will show up here."
              headline="You’re caught up"
              icon={Bell}
            />
          )}
        </Shell.PageStack>
      </Shell.Content>
    </Shell>
  );
}
