import { Bell } from '@groam/icons';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useVisit } from '@/lib/navigation/router';
import { relativeDate } from '@/lib/relative-date';
import { testIds } from '@/lib/test-ids';
import type { InboxNotification } from '@/types/inbox';

export type { InboxNotification };

export function InboxNotificationList({
  isLoading,
  markNotificationRead,
  notifications
}: {
  isLoading: boolean;
  markNotificationRead: (id: InboxNotification['id']) => void;
  notifications: InboxNotification[];
}) {
  const visit = useVisit();

  if (isLoading) {
    return (
      <List>
        <List.Body>
          <PageLoading label="Loading inbox…" />
        </List.Body>
      </List>
    );
  }

  return (
    <List>
      <List.Body>
        <List.Group aria-label="Notifications">
          {notifications.map((item) => (
            <List.Row
              attention={item.readAt === null}
              data-testid={testIds.inboxItem}
              key={item.id}
            >
              <List.Icon>
                <Bell aria-hidden className="text-muted-foreground" />
              </List.Icon>
              <List.Main>
                {item.readAt === null ? <span className="sr-only">Unread. </span> : null}
                <List.Title asChild>
                  <Button
                    onClick={() => {
                      if (item.readAt === null) void markNotificationRead(item.id);
                      void visit(item.href);
                    }}
                    type="button"
                    unstyled
                  >
                    {item.title}
                  </Button>
                </List.Title>
                <List.Aside>
                  <time
                    dateTime={new Date(item.createdAt).toISOString()}
                    title={new Date(item.createdAt).toLocaleString()}
                  >
                    {relativeDate(item.createdAt)}
                  </time>
                </List.Aside>
                <List.Description title={item.body}>{item.body}</List.Description>
              </List.Main>
              <List.Meta>
                {item.readAt === null ? <Badge variant="outline">Unread</Badge> : null}
              </List.Meta>
            </List.Row>
          ))}
        </List.Group>
      </List.Body>
    </List>
  );
}
