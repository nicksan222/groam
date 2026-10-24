import { MessageSquare, Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { testIds } from '@/lib/test-ids';
import { ChatListRow } from './chat-list-row';

/** The chats in a rail, newest first as the server sends them; the rail owns its edges. */
export function ChatList({
  activeDiscussionId,
  discussions,
  isLoading,
  onCreate
}: {
  activeDiscussionId?: string;
  discussions: DiscussionListItem[];
  isLoading: boolean;
  /** Offered when there are no chats; without it the empty list only says so. */
  onCreate?: () => void;
}) {
  if (isLoading) return <PageLoading label="Loading chats…" />;

  if (discussions.length === 0) {
    return (
      <EmptyScreen
        buttonRaw={
          onCreate ? (
            <Button data-testid={testIds.newChat} onClick={onCreate} size="sm">
              <Plus />
              New chat
            </Button>
          ) : undefined
        }
        className="min-h-48 bg-transparent"
        description="Start a shared thread for dates, packing, or anything the group needs to figure out."
        headline="No chats yet"
        icon={MessageSquare}
      />
    );
  }

  return (
    <ul aria-label="Chats" className="m-0 flex list-none flex-col gap-1 px-2 py-0">
      {discussions.map((discussion) => (
        <ChatListRow
          active={discussion.id === activeDiscussionId}
          discussion={discussion}
          key={discussion.id}
        />
      ))}
    </ul>
  );
}
