import { Button } from '@groam/ui/components/button';
import { Skeleton } from '@groam/ui/components/skeleton';
import { cn } from '@groam/ui/lib/utils';
import { useNavigate } from '@tanstack/react-router';
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
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading inbox…" className="space-y-2" role="status">
        {INBOX_SKELETON_KEYS.map((key) => (
          <div
            className="flex w-full flex-col items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-xs/5"
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
    <div className="divide-y overflow-hidden rounded-xl border border-border bg-card shadow-xs/5">
      {notifications.map((item) => (
        <Button
          className={cn(
            'flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none',
            item.readAt === null && 'bg-primary/[0.03]'
          )}
          data-testid={testIds.inboxItem}
          key={item.id}
          onClick={() => {
            if (item.readAt === null) void markNotificationRead(item.id);
            void navigate({ to: item.href as never });
          }}
          type="button"
          unstyled
        >
          <span className={cn('text-sm', item.readAt === null ? 'font-medium' : undefined)}>
            {item.title}
          </span>
          <span className="line-clamp-2 text-sm text-muted-foreground">{item.body}</span>
        </Button>
      ))}
    </div>
  );
}
