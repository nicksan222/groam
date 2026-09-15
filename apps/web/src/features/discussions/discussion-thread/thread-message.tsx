import { AssistantChatMessage } from '@groam/ui/ai/chat/assistant-chat-message';
import { Button } from '@groam/ui/components/button';
import { ChatMessage } from '@groam/ui/components/chat-message';
import { Textarea } from '@groam/ui/components/textarea';
import { cn } from '@groam/ui/lib/utils';
import type { DiscussionMessage } from '@/features/discussions/hooks/use-discussion-thread';
import {
  useThreadMessageEdit,
  useThreadMessageEditing
} from '@/features/discussions/hooks/use-thread-message-edit';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { discussionMessageBody } from './discussion-message-body';
import { ThreadMessageReactions } from './thread-message-reactions';
import { groupThreadReactions } from './thread-message-stamps';
import { ThreadMessageToolbar } from './thread-message-toolbar';

export function ThreadMessage({
  message,
  onEdit,
  onReact,
  onRemove,
  reactions
}: {
  message: DiscussionMessage;
  onEdit?: (text: string) => void;
  onReact: (emoji: string) => void;
  onRemove?: () => void;
  reactions: Array<{ emoji: string; userId: string }>;
}) {
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const { editing, startEditing, stopEditing } = useThreadMessageEditing();
  const stamps = groupThreadReactions(reactions, viewerUserId);

  if (message.role === 'assistant') {
    return <AssistantChatMessage disabled message={message} />;
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

  return (
    <ChatMessage
      actions={
        <ThreadMessageToolbar
          mine={mine}
          onEdit={onEdit ? startEditing : undefined}
          onReact={onReact}
          onRemove={onRemove}
          stamps={stamps}
        />
      }
      attachments={body.attachments}
      authorName={message.author?.name}
      createdAt={message._creationTime}
      mine={mine}
      reactions={
        stamps.length > 0 ? (
          <ThreadMessageReactions mine={mine} onReact={onReact} stamps={stamps} />
        ) : undefined
      }
      status={message.status}
      testId={testIds.chatMessage}
      text={body.text}
    />
  );
}

function ThreadMessageEditor({
  authorName,
  mine,
  onCancel,
  onSave,
  text
}: {
  authorName?: string;
  mine: boolean;
  onCancel: () => void;
  onSave: (text: string) => void;
  text: string;
}) {
  const { canSave, draft, onKeyDown, setDraft, submit } = useThreadMessageEdit({
    initialText: text,
    onCancel,
    onSave
  });

  return (
    <div className={mine ? 'flex justify-end' : 'flex justify-start'}>
      <form className="w-full max-w-[min(100%,24rem)] space-y-2" onSubmit={submit}>
        {!mine && (
          <p className="px-1 text-[10px] font-semibold text-muted-foreground">
            {authorName ?? 'Participant'}
          </p>
        )}
        <Textarea
          aria-label="Edit message"
          autoFocus
          className="min-h-20 bg-background"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          value={draft}
        />
        <div className={cn('flex gap-2', mine && 'justify-end')}>
          <Button onClick={onCancel} size="sm" type="button" variant="ghost">
            Cancel
          </Button>
          <Button disabled={!canSave} size="sm" type="submit">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}
