import { cn } from '@groam/ui/lib/utils';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { ChatAvatar } from './chat-avatar';
import { chatTimestamp } from './chat-timestamp';

export function ChatListRow({
  active,
  discussion
}: {
  active: boolean;
  discussion: DiscussionListItem;
}) {
  const preview =
    discussion.lastMessage === null
      ? 'No messages yet'
      : `${discussion.lastMessage.authorName}: ${discussion.lastMessage.text}`;

  return (
    <article
      className={cn(
        'relative flex min-h-20 min-w-0 items-center gap-3 px-4 py-3 transition-colors motion-reduce:transition-none',
        active ? 'bg-accent' : 'hover:bg-accent/50 focus-within:bg-accent/50'
      )}
      data-chat-title={discussion.title}
      data-testid={testIds.chatRow}
      title={discussion.tripName ?? undefined}
    >
      <ChatAvatar discussion={discussion} face={discussion.members[0]} size="header" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2
            className={cn(
              'min-w-0 flex-1 text-sm leading-5',
              discussion.unread ? 'font-semibold' : 'font-medium'
            )}
          >
            <Link
              aria-current={active ? 'page' : undefined}
              className="block truncate outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
              params={{ discussionId: discussion.id }}
              title={discussion.title}
              to="/chat/$discussionId"
            >
              {discussion.title}
            </Link>
          </h2>
          <time
            className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
            dateTime={new Date(discussion.updatedAt).toISOString()}
          >
            {chatTimestamp(discussion.updatedAt)}
          </time>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-3">
          <p
            className="min-w-0 flex-1 truncate text-sm leading-5 text-muted-foreground"
            data-slot="record-list-description"
            title={preview}
          >
            {preview}
          </p>
          {discussion.unread && (
            <span className="size-2 shrink-0 rounded-full bg-primary">
              <span className="sr-only">Unread</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
