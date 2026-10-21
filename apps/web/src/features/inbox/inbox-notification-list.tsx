import { Bell } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { Skeleton } from '@groam/ui/components/skeleton';
import { recordListTitleClassName } from '@groam/ui/lib/record-list';
import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';
import { useVisit } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { InboxNotification } from '@/types/inbox';

export type { InboxNotification };

const INBOX_SKELETON_KEYS = [
  'inbox-skeleton-a',
  'inbox-skeleton-b',
  'inbox-skeleton-c',
  'inbox-skeleton-d'
] as const;

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
      <div
        aria-busy="true"
        aria-label="Loading inbox…"
        className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/60 max-md:rounded-none max-md:border-x-0"
        role="status"
      >
        {INBOX_SKELETON_KEYS.map((key) => (
          <div
            className="flex h-[88px] w-full flex-col items-start justify-center gap-2 px-4 py-4"
            key={key}
          >
            <Skeleton className="h-4 w-[min(100%,14rem)]" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul
      aria-label="Notifications"
      className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/60 max-md:rounded-none max-md:border-x-0 bg-transparent"
    >
      {notifications.map((item) => (
        <li key={item.id}>
          <RecordListItem
            data-testid={testIds.inboxItem}
            badges={
              <>
                {item.readAt === null ? <RecordListBadge>Unread</RecordListBadge> : null}
                <time
                  className="text-xs tabular-nums text-muted-foreground"
                  dateTime={new Date(item.createdAt).toISOString()}
                >
                  {relativeIssueDate(item.createdAt)}
                </time>
              </>
            }
            icon={<Bell aria-hidden="true" className="text-muted-foreground" />}
            description={<span title={item.body}>{item.body}</span>}
            title={
              <Button
                className={recordListTitleClassName}
                onClick={() => {
                  if (item.readAt === null) void markNotificationRead(item.id);
                  void visit(item.href);
                }}
                type="button"
                unstyled
              >
                {item.title}
              </Button>
            }
          />
        </li>
      ))}
    </ul>
  );
}
