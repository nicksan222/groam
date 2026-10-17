import type { Id } from '@groam/backend/data-model';
import {
  ConversationTimeline,
  type ConversationTimelineItem
} from '@groam/ui/components/conversation-timeline';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { MessageSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDiscussionMessageActions } from '@/features/discussions/hooks/use-discussion-message-actions';
import { useDiscussionThread } from '@/features/discussions/hooks/use-discussion-thread';
import { discussionActivityKey } from './discussion-activity-key';
import { DiscussionThreadComposer } from './discussion-thread-composer';
import { ThreadMessage } from './thread-message';

const defaultEmpty = (
  <EmptyScreen
    className="min-h-0 bg-transparent"
    description="Say hello, share a photo, or mention @groam for help everyone can see."
    headline="No messages yet"
    icon={MessageSquare}
  />
);

/** Message list and composer for one discussion thread; callers supply any header. */
export function DiscussionThreadBody({
  discussionId,
  empty = defaultEmpty,
  readOnlyNotice,
  threadId
}: {
  discussionId: Id<'discussions'>;
  empty?: ReactNode;
  /** When set, the composer is replaced by this notice (for example an archived trip). */
  readOnlyNotice?: string;
  threadId: null | string;
}) {
  const thread = useDiscussionThread(discussionId, threadId);
  const { editMessage, react, reactions, removeMessage } = useDiscussionMessageActions(
    discussionId,
    discussionActivityKey(thread.messages)
  );

  const items: ConversationTimelineItem[] = thread.messages.flatMap((message) =>
    message.role === 'user' || message.role === 'assistant'
      ? [
          {
            content: (
              <ThreadMessage
                message={message}
                onEdit={message.mine ? (text) => void editMessage(message.id, text) : undefined}
                onReact={(emoji) => void react(message.id, emoji)}
                onRemove={message.mine ? () => void removeMessage(message.id) : undefined}
                reactions={reactions.filter((item) => item.messageId === message.id)}
              />
            ),
            key: message.key
          }
        ]
      : []
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ConversationTimeline
        empty={empty}
        isLoading={thread.status === 'LoadingFirstPage'}
        items={items}
        loadMore={thread.loadMore}
        status={thread.status}
      />
      {readOnlyNotice ? (
        <p
          className="shrink-0 border-t border-border/70 p-3 text-center text-sm text-muted-foreground"
          role="status"
        >
          {readOnlyNotice}
        </p>
      ) : (
        <DiscussionThreadComposer
          canStop={thread.canStop}
          isStopping={thread.isStopping}
          onSend={thread.send}
          onStop={thread.stop}
        />
      )}
    </div>
  );
}
