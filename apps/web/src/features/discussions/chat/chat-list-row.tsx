import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { recordListTitleClassName } from '@groam/ui/lib/record-list';
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
    <RecordListItem
      data-chat-title={discussion.title}
      data-testid={testIds.chatRow}
      badges={
        <time
          className="text-xs tabular-nums text-muted-foreground"
          dateTime={new Date(discussion.updatedAt).toISOString()}
        >
          {chatTimestamp(discussion.updatedAt)}
        </time>
      }
      className={cn(
        'grid-cols-[2.25rem_minmax(0,1fr)] [&>div:first-child]:size-9',
        active && 'bg-foreground/[0.03]'
      )}
      icon={<ChatAvatar discussion={discussion} face={discussion.members[0]} size="header" />}
      description={<span title={preview}>{preview}</span>}
      metadata={
        <>
          {discussion.unread ? <RecordListBadge>Unread</RecordListBadge> : null}
          {discussion.tripName ? (
            <span className="truncate" title={discussion.tripName}>
              {discussion.tripName}
            </span>
          ) : null}
        </>
      }
      title={
        <Link
          aria-current={active ? 'page' : undefined}
          className={recordListTitleClassName}
          params={{ discussionId: discussion.id }}
          to="/chat/$discussionId"
        >
          {discussion.title}
        </Link>
      }
    />
  );
}
