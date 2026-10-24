import { cn } from '@groam/ui/lib/utils';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { ChatAvatar } from './chat-avatar';
import { chatHref } from './chat-href';
import { chatTimestamp } from './chat-timestamp';

/**
 * One chat in a rail: its faces, then the title and when it last moved over who said what last.
 * The title is the link and stretches over the row; unread chats read bolder with a primary dot.
 */
export function ChatListRow({
  active,
  discussion
}: {
  active: boolean;
  discussion: DiscussionListItem;
}) {
  const { lastMessage, unread } = discussion;

  return (
    <li
      className={cn(
        'group/chat relative isolate flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150',
        active ? 'bg-accent' : 'hover:bg-accent/55'
      )}
      data-active={active || undefined}
      data-chat-title={discussion.title}
      data-testid={testIds.chatRow}
      title={discussion.tripName ?? undefined}
    >
      <ChatAvatar
        discussion={discussion}
        face={discussion.members[0]}
        ringClassName={cn(
          'transition-shadow duration-150',
          active
            ? 'ring-accent'
            : 'ring-canvas group-hover/chat:ring-[color-mix(in_oklab,var(--accent)_55%,var(--canvas))]'
        )}
        size="header"
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <Link
            aria-current={active ? 'page' : undefined}
            className={cn(
              'min-w-0 flex-1 truncate text-[13.5px] leading-5 text-foreground outline-none',
              'after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset',
              unread ? 'font-semibold' : 'font-medium'
            )}
            title={discussion.title}
            {...chatHref({ discussionId: discussion.id, tripId: discussion.tripId })}
          >
            {discussion.title}
          </Link>
          <time
            className={cn(
              'shrink-0 text-[11px] leading-5 tabular-nums',
              unread ? 'font-medium text-primary' : 'text-muted-foreground'
            )}
            dateTime={new Date(discussion.updatedAt).toISOString()}
          >
            {chatTimestamp(discussion.updatedAt)}
          </time>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={cn(
              'min-w-0 flex-1 truncate text-[13px] leading-[18px]',
              unread ? 'text-foreground/85' : 'text-muted-foreground'
            )}
          >
            {lastMessage === null ? (
              <span className="text-muted-foreground/80">No messages yet</span>
            ) : (
              <>
                <span className={cn(unread ? 'font-medium' : 'text-foreground/70')}>
                  {lastMessage.authorName}:
                </span>{' '}
                {lastMessage.text}
              </>
            )}
          </p>
          {unread ? (
            <span className="size-2 shrink-0 rounded-full bg-primary">
              <span className="sr-only">Unread</span>
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
