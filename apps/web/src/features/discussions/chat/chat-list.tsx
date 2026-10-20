import { MessageSquare } from '@groam/icons';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { Skeleton } from '@groam/ui/components/skeleton';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { testIds } from '@/lib/test-ids';
import { ChatListRow } from './chat-list-row';

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
      <div
        aria-busy="true"
        aria-label="Loading chats…"
        className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/60 max-md:rounded-none max-md:border-x-0"
        role="status"
      >
        {CHAT_LIST_SKELETON_KEYS.map((key) => (
          <div className="flex h-[88px] items-center gap-3 px-4 py-4" key={key}>
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
    <ul aria-label="Chats" className="divide-y divide-border/40">
      {discussions.map((discussion) => (
        <li key={discussion.id}>
          <ChatListRow active={discussion.id === activeDiscussionId} discussion={discussion} />
        </li>
      ))}
    </ul>
  );
}
