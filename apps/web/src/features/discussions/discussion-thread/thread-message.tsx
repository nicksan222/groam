import { ChatTextMessage } from '@groam/ui/components/chat-text-message';
import type { DiscussionMessage } from '@/features/discussions/hooks/use-discussion-thread';
import { useThreadMessageEditing } from '@/features/discussions/hooks/use-thread-message-edit';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { AssistantReplyError } from './assistant-reply-error';
import { AssistantRunCard } from './assistant-run-card';
import { discussionMessageBody } from './discussion-message-body';
import { ThreadMessageEditor } from './thread-message-editor';
import { ThreadMessageReactions } from './thread-message-reactions';
import { groupThreadReactions } from './thread-message-stamps';
import { ThreadMessageToolbar } from './thread-message-toolbar';

const NO_REPLIES: DiscussionMessage[] = [];

export function ThreadMessage({
  message,
  replies = NO_REPLIES,
  onEdit,
  onReact,
  onRemove,
  reactions
}: {
  message: DiscussionMessage;
  /** Groam replies this message asked for, shown attached beneath it. */
  replies?: DiscussionMessage[];
  onEdit?: (text: string) => void;
  onReact: (emoji: string) => void;
  onRemove?: () => void;
  reactions: Array<{ emoji: string; userId: string }>;
}) {
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const { editing, startEditing, stopEditing } = useThreadMessageEditing();
  const stamps = groupThreadReactions(reactions, viewerUserId);

  if (message.role === 'assistant') {
    return <AssistantRunCard replies={[message]} />;
  }

  const body = discussionMessageBody(message);
  const mine = message.mine === true;

  if (editing && onEdit) {
    return (
      <ThreadMessageEditor
        authorName={message.author?.name}
        mine={mine}
        onCancel={stopEditing}
        onSave={(text) => {
          onEdit(text);
          stopEditing();
        }}
        text={body.text}
      />
    );
  }

  const toolbar = (
    <ThreadMessageToolbar
      mine={mine}
      onEdit={onEdit ? startEditing : undefined}
      onReact={onReact}
      onRemove={onRemove}
      stamps={stamps}
    />
  );
  const stampRow =
    stamps.length > 0 ? (
      <ThreadMessageReactions mine={mine} onReact={onReact} stamps={stamps} />
    ) : undefined;
  const chat =
    replies.length > 0 ? (
      <AssistantRunCard
        actions={toolbar}
        mine={mine}
        prompt={{
          attachmentCount: body.attachments.length,
          authorName: mine ? 'You' : (message.author?.name ?? 'Participant'),
          createdAt: message._creationTime,
          text: body.text
        }}
        reactions={stampRow}
        replies={replies}
      />
    ) : (
      <ChatTextMessage
        actions={toolbar}
        attachments={body.attachments}
        author={message.author?.name ?? 'Participant'}
        createdAt={message._creationTime}
        reactions={stampRow}
        side={mine ? 'outgoing' : 'incoming'}
        status={message.status === 'pending' ? 'pending' : undefined}
        testId={testIds.chatMessage}
        text={body.text}
      />
    );
  if (message.assistantStatus !== 'failed') return chat;
  return (
    <div className="space-y-2">
      {chat}
      <AssistantReplyError error={message.assistantError} mine={mine} />
    </div>
  );
}
