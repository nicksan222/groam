import { ChatDeliveryIndicator, ChatMessage } from '@groam/ui/components/chat';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { type ChatMessageAttachment, ChatMessageAttachments } from './chat-message-attachments';
import { Markdown } from './markdown';

export type { ChatMessageAttachment } from './chat-message-attachments';

export type ChatTextMessageProps = {
  actions?: ReactNode;
  attachments?: ChatMessageAttachment[];
  author?: ReactNode;
  avatar?: ReactNode;
  createdAt?: number;
  grouped?: boolean;
  /** Plays the coss entrance spring; use for messages that arrive while the thread is open. */
  animateEntrance?: boolean;
  reactions?: ReactNode;
  side: 'incoming' | 'outgoing';
  status?: 'failed' | 'pending' | 'sent';
  testId?: string;
  text: string;
};

const NO_ATTACHMENTS: ChatMessageAttachment[] = [];

/** A person's Markdown message, with attachments and delivery state, on the coss chat message. */
export function ChatTextMessage({
  actions,
  animateEntrance,
  attachments = NO_ATTACHMENTS,
  author,
  avatar,
  createdAt,
  grouped,
  reactions,
  side,
  status,
  testId,
  text
}: ChatTextMessageProps) {
  const hasText = text.trim().length > 0;
  const mediaOnly = attachments.length > 0 && !hasText;
  const outgoing = side === 'outgoing';
  const media =
    attachments.length > 0 ? (
      <ChatMessageAttachments attachments={attachments} mediaOnly={mediaOnly} outgoing={outgoing} />
    ) : null;
  const body = hasText ? (
    <Markdown className="text-sm leading-[1.55] wrap-break-word whitespace-normal text-inherit">
      {text}
    </Markdown>
  ) : null;

  return (
    <ChatMessage
      actions={actions}
      animateEntrance={animateEntrance}
      author={author}
      avatar={avatar}
      bubble={!mediaOnly}
      data-content={text}
      data-testid={testId}
      footer={<MessageFooter createdAt={createdAt} status={status} />}
      grouped={grouped}
      reactions={reactions}
      side={side}
    >
      {mediaOnly ? (
        <div className={cn('flex items-center gap-2', outgoing && 'flex-row-reverse')}>
          {media}
          {actions}
        </div>
      ) : (
        <>
          {media}
          {body}
        </>
      )}
    </ChatMessage>
  );
}

function MessageFooter({
  createdAt,
  status
}: {
  createdAt?: number;
  status?: ChatTextMessageProps['status'];
}) {
  if (status === 'pending') {
    return (
      <span role="status">
        <ChatDeliveryIndicator label="Sending…" status="sending" /> Sending…
      </span>
    );
  }
  if (status === 'failed') return <ChatDeliveryIndicator label="Not sent" status="failed" />;
  if (!createdAt) return null;
  return (
    <time dateTime={new Date(createdAt).toISOString()}>
      {new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
    </time>
  );
}
