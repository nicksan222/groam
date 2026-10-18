import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { Skeleton } from '@groam/ui/components/skeleton';
import { cn } from '@groam/ui/lib/utils';
import { MessageSquare } from 'lucide-react';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { ChatAvatar } from './chat-avatar';
import { chatTimestamp } from './chat-timestamp';

const CHAT_LIST_SKELETON_KEYS = [
  'chat-list-a',
  'chat-list-b',
  'chat-list-c',
  'chat-list-d',
  'chat-list-e'
] as const;

export function ChatList({
  activeDiscussionId,
  discussions,
  isLoading,
  onCreate
}: {
  activeDiscussionId?: string;
  discussions: DiscussionListItem[];
  isLoading: boolean;
  onCreate: () => void;
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading chats…" className="px-1" role="status">
        {CHAT_LIST_SKELETON_KEYS.map((key) => (
          <div className="flex min-h-14 items-center gap-3 px-3.5 py-2.5" key={key}>
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-[min(100%,10rem)]" />
                <Skeleton className="h-3 w-10 shrink-0" />
              </div>
              <Skeleton className="h-3.5 w-[min(100%,14rem)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (discussions.length === 0) {
    return (
      <EmptyScreen
        buttonOnClick={onCreate}
        buttonTestId={testIds.newChat}
        buttonText="New chat"
        className="min-h-48 rounded-none bg-transparent"
        description="Start a shared thread for dates, packing, or anything the group needs to figure out."
        headline="No chats yet"
        icon={MessageSquare}
      />
    );
  }

  return (
    <ul className="divide-y">
      {discussions.map((discussion) => (
        <li key={discussion.id}>
          <ChatListRow active={discussion.id === activeDiscussionId} discussion={discussion} />
        </li>
      ))}
    </ul>
  );
}

function ChatListRow({ active, discussion }: { active: boolean; discussion: DiscussionListItem }) {
  const preview =
    discussion.lastMessage === null
      ? 'No messages yet'
      : `${discussion.lastMessage.authorName}: ${discussion.lastMessage.text}`;
  const face = discussion.members[0];

  return (
    <Link
      className={cn(
        'group/chat-row flex min-h-14 touch-manipulation items-center gap-3 px-3.5 py-2.5 transition-colors',
        'outline-none focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        active ? 'bg-accent' : 'hover:bg-accent'
      )}
      data-chat-title={discussion.title}
      data-testid={testIds.chatRow}
      params={{ discussionId: discussion.id }}
      to="/chat/$discussionId"
    >
      <ChatAvatar discussion={discussion} face={face} size="list" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {discussion.unread ? (
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            ) : null}
            <span className="truncate text-[15px] font-medium tracking-tight text-foreground">
              {discussion.title}
            </span>
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {chatTimestamp(discussion.updatedAt)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[13px] leading-snug text-muted-foreground">
          {discussion.tripName ? `${discussion.tripName} · ` : ''}
          {preview}
        </span>
      </span>
    </Link>
  );
}
