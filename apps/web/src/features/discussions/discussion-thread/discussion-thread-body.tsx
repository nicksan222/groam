import type { Id } from '@groam/backend/data-model';
import { MessageSquare } from '@groam/icons';
import { ChatTimeline, type ChatTimelineItem } from '@groam/ui/components/chat-timeline';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import type { ReactNode } from 'react';
import type { ComposerCommand } from '@/features/discussions/composer-commands/composer-command';
import { useDiscussionMessageActions } from '@/features/discussions/hooks/use-discussion-message-actions';
import { useDiscussionThread } from '@/features/discussions/hooks/use-discussion-thread';
import { groupAssistantReplies } from './assistant-replies';
import { discussionActivityKey } from './discussion-activity-key';
import { DiscussionThreadComposer } from './discussion-thread-composer';
import { type DiscussionTimelineEvent, mergeTimelineEvents } from './discussion-timeline-events';
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
  commands,
  discussionId,
  empty,
  events = [],
  readOnlyNotice,
  threadId
}: {
  /** "/" actions the composer offers in this thread. */
  commands?: ComposerCommand[];
  discussionId: Id<'discussions'>;
  empty?: ReactNode;
  /** Non-message rows (such as linked items) placed among messages by time. */
  events?: DiscussionTimelineEvent[];
  /** When set, the composer is replaced by this notice (for example an archived trip). */
  readOnlyNotice?: string;
  threadId: null | string;
}) {
  const thread = useDiscussionThread(discussionId, threadId);
  const { editMessage, react, reactions, removeMessage } = useDiscussionMessageActions(
    discussionId,
    discussionActivityKey(thread.messages)
  );

  const { attached, repliesByPrompt } = groupAssistantReplies(thread.messages);
  const messageItems = thread.messages.flatMap((message) =>
    (message.role === 'user' || message.role === 'assistant') && !attached.has(message.key)
      ? [
          {
            content: (
              <ThreadMessage
                message={message}
                replies={repliesByPrompt.get(message.key)}
                onEdit={message.mine ? (text) => void editMessage(message.id, text) : undefined}
                onReact={(emoji) => void react(message.id, emoji)}
                onRemove={message.mine ? () => void removeMessage(message.id) : undefined}
                reactions={reactions.filter((item) => item.messageId === message.id)}
              />
            ),
            createdAt: message._creationTime,
            key: message.key
          }
        ]
      : []
  );
  const items: ChatTimelineItem[] = mergeTimelineEvents(
    messageItems,
    events,
    thread.status === 'Exhausted'
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatTimeline
        contentClassName="mx-auto w-full max-w-3xl"
        empty={empty ?? defaultEmpty}
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
          commands={commands}
          isStopping={thread.isStopping}
          onSend={thread.send}
          onStop={thread.stop}
        />
      )}
    </div>
  );
}
