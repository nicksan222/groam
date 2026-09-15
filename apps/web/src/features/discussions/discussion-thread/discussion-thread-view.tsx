import type { Id } from '@groam/backend/data-model';
import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { Button } from '@groam/ui/components/button';
import {
  ConversationTimeline,
  type ConversationTimelineItem
} from '@groam/ui/components/conversation-timeline';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import { Skeleton } from '@groam/ui/components/skeleton';
import { MessageSquare } from 'lucide-react';
import { useDiscussionMessageActions } from '@/features/discussions/hooks/use-discussion-message-actions';
import { useDiscussionThread } from '@/features/discussions/hooks/use-discussion-thread';
import { useDiscussions } from '@/features/discussions/hooks/use-discussions';
import { Link } from '@/features/workspace/navigation/router';
import { DiscussionThreadComposer } from './discussion-thread-composer';
import { DiscussionThreadHeader } from './discussion-thread-header';
import { ThreadMessage } from './thread-message';

export function DiscussionThreadView({ discussionId }: { discussionId: Id<'discussions'> }) {
  const { discussions, isLoading: isListLoading } = useDiscussions();
  const discussion = discussions.find((item) => item.id === discussionId);
  const thread = useDiscussionThread(discussionId, discussion?.threadId ?? null);
  const { editMessage, react, reactions, removeMessage } =
    useDiscussionMessageActions(discussionId);
  const showLoading = isListLoading || !discussion;

  useSetAgentContext(
    discussion
      ? {
          capabilities: [],
          data: {
            discussionId: discussion.id,
            memberNames: discussion.members.map((member) => member.name),
            title: discussion.title
          },
          description:
            'Help this shared group chat plan and decide without taking private-chat context.',
          key: `chat:${discussion.id}`,
          title: discussion.title
        }
      : null
  );

  if (!isListLoading && !discussion) {
    return (
      <EmptyScreen
        buttonRaw={
          <Button asChild variant="outline">
            <Link to="/chat">Back to chats</Link>
          </Button>
        }
        description="It may have been removed, or you are not a participant."
        headline="Chat not found"
        icon={MessageSquare}
      />
    );
  }

  const items: ConversationTimelineItem[] =
    discussion && !showLoading
      ? thread.messages.flatMap((message) =>
          message.role === 'user' || message.role === 'assistant'
            ? [
                {
                  content: (
                    <ThreadMessage
                      message={message}
                      onEdit={
                        message.mine ? (text) => void editMessage(message.id, text) : undefined
                      }
                      onReact={(emoji) => void react(message.id, emoji)}
                      onRemove={message.mine ? () => void removeMessage(message.id) : undefined}
                      reactions={reactions.filter((item) => item.messageId === message.id)}
                    />
                  ),
                  key: message.key
                }
              ]
            : []
        )
      : [];

  if (showLoading) return <PageLoading label="Opening chat…" />;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {showLoading ? (
        <DiscussionThreadHeader isLoading />
      ) : (
        <DiscussionThreadHeader discussion={discussion} />
      )}

      <ConversationTimeline
        empty={
          <EmptyScreen
            className="min-h-0 bg-transparent"
            description="Say hello, share a photo, or mention @groam for help everyone can see."
            headline="No messages yet"
            icon={MessageSquare}
          />
        }
        isLoading={showLoading || thread.status === 'LoadingFirstPage'}
        items={items}
        loadMore={thread.loadMore}
        status={showLoading ? 'LoadingFirstPage' : thread.status}
      />

      {showLoading ? (
        <footer aria-hidden className="shrink-0 border-t border-border/70 p-3">
          <Skeleton className="h-24 w-full rounded-xl" />
        </footer>
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
