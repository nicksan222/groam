import { cn } from '@groam/ui/lib/utils';
import { type ReactNode, useState } from 'react';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle
} from './attachment';
import { Bubble, BubbleContent } from './bubble';
import { Message, MessageContent } from './message';

export type ChatMessageAttachment = {
  contentType: string;
  name: string;
  url: string | null;
};

export type ChatMessageProps = {
  actions?: ReactNode;
  attachments?: ChatMessageAttachment[];
  authorName?: string;
  createdAt?: number;
  mine: boolean;
  reactions?: ReactNode;
  status?: string;
  testId?: string;
  text: string;
  variant?: 'discussion' | 'private';
};

function PrivateChatMessage({ attachments, status, testId, text }: ChatMessageProps) {
  return (
    <Message align="end" data-content={text} data-testid={testId}>
      <MessageContent className="max-w-[84%]">
        <Bubble className="max-w-full" variant="secondary">
          <BubbleContent className="space-y-2 whitespace-pre-wrap leading-6 text-pretty">
            {attachments && attachments.length > 0 ? (
              <div className="flex flex-col items-end gap-2">
                {attachments.map((attachment) => (
                  <MessageAttachmentChip
                    attachment={attachment}
                    key={`${attachment.name}-${attachment.url}`}
                    mediaOnly={text.trim().length === 0}
                    mine
                  />
                ))}
              </div>
            ) : null}
            {text.trim().length > 0 ? <p>{text}</p> : null}
          </BubbleContent>
        </Bubble>
        {status === 'pending' ? <DeliveryStatus>Sending…</DeliveryStatus> : null}
      </MessageContent>
    </Message>
  );
}

function DiscussionChatMessage({
  actions,
  attachments = [],
  authorName,
  createdAt,
  mine,
  reactions,
  status,
  testId,
  text
}: ChatMessageProps) {
  const hasText = text.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const mediaOnly = hasAttachments && !hasText;

  return (
    <div
      className={mine ? 'flex justify-end' : 'flex justify-start'}
      data-content={text}
      data-testid={testId}
    >
      <div
        className={cn(
          'max-w-[min(100%,24rem)]',
          mine ? 'text-right' : 'text-left',
          (actions || reactions) && 'group/chat-message'
        )}
      >
        {!mine && (
          <p className="mb-1 px-1 text-[10px] font-semibold text-muted-foreground">
            {authorName ?? 'Participant'}
          </p>
        )}
        <DiscussionMessageBody
          actions={actions}
          attachments={attachments}
          hasText={hasText}
          mediaOnly={mediaOnly}
          mine={mine}
          reactions={reactions}
          text={text}
        />
        <DiscussionMessageStatus createdAt={createdAt} status={status} />
      </div>
    </div>
  );
}

function DiscussionMessageBody({
  actions,
  attachments,
  hasText,
  mediaOnly,
  mine,
  reactions,
  text
}: {
  actions?: ReactNode;
  attachments: ChatMessageAttachment[];
  hasText: boolean;
  mediaOnly: boolean;
  mine: boolean;
  reactions?: ReactNode;
  text: string;
}) {
  return (
    <div className={cn('relative', reactions && 'pb-4')}>
      <div className="space-y-1.5">
        {attachments.length > 0 && (
          <DiscussionAttachments attachments={attachments} mediaOnly={mediaOnly} mine={mine} />
        )}
        {hasText && <DiscussionText mine={mine} text={text} />}
      </div>
      {actions}
      {reactions}
    </div>
  );
}

function DiscussionAttachments({
  attachments,
  mediaOnly,
  mine
}: {
  attachments: ChatMessageAttachment[];
  mediaOnly: boolean;
  mine: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${mine ? 'items-end' : 'items-start'}`}>
      {attachments.map((attachment) => (
        <MessageAttachmentChip
          attachment={attachment}
          key={`${attachment.name}-${attachment.url}`}
          mediaOnly={mediaOnly}
          mine={mine}
        />
      ))}
    </div>
  );
}

function DiscussionText({ mine, text }: { mine: boolean; text: string }) {
  return (
    <div
      className={
        mine
          ? 'rounded-2xl rounded-br-md bg-secondary px-3 py-2 text-left text-sm leading-5 text-secondary-foreground shadow-xs/5'
          : 'rounded-2xl rounded-bl-md bg-transparent px-3 py-2 text-sm leading-5'
      }
    >
      <p className="whitespace-pre-wrap wrap-break-word">{text}</p>
    </div>
  );
}

function DiscussionMessageStatus({ createdAt, status }: { createdAt?: number; status?: string }) {
  if (status !== 'pending' && !createdAt) return null;
  return (
    <DeliveryStatus>
      {status === 'pending' ? 'Sending…' : formatMessageTime(createdAt ?? 0)}
    </DeliveryStatus>
  );
}

/** Human-authored message presentation shared by private and group chats. */
export function ChatMessage(props: ChatMessageProps) {
  return props.variant === 'private' ? (
    <PrivateChatMessage {...props} />
  ) : (
    <DiscussionChatMessage {...props} />
  );
}

function AudioAttachment({
  attachment,
  mediaOnly,
  mine
}: {
  attachment: ChatMessageAttachment;
  mediaOnly: boolean;
  mine: boolean;
}) {
  const className = mediaOnly
    ? mine
      ? 'rounded-2xl rounded-br-md bg-secondary px-3 py-2 text-secondary-foreground shadow-xs/5'
      : 'rounded-2xl rounded-bl-md px-3 py-2'
    : undefined;
  return (
    <div className={className}>
      <audio
        aria-label={attachment.name}
        className="max-w-full"
        controls
        preload="metadata"
        src={attachment.url ?? undefined}
      >
        <track kind="captions" />
      </audio>
    </div>
  );
}

function ImageAttachment({
  attachment,
  frameClass,
  href
}: {
  attachment: ChatMessageAttachment;
  frameClass: string;
  href?: string;
}) {
  const image = (
    <div className={`block w-[min(100%,16rem)] min-w-[8rem] ${frameClass}`}>
      <img
        alt={attachment.name}
        className="block max-h-72 w-full bg-muted object-cover"
        src={attachment.url ?? undefined}
      />
    </div>
  );
  return href ? (
    <a className="block" href={href} rel="noreferrer" target="_blank">
      {image}
    </a>
  ) : (
    image
  );
}

function FileAttachment({
  attachment,
  href,
  mediaOnly,
  mine
}: {
  attachment: ChatMessageAttachment;
  href?: string;
  mediaOnly: boolean;
  mine: boolean;
}) {
  const chip = (
    <Attachment
      className={mine && !mediaOnly ? 'border-border/40 bg-secondary/80' : undefined}
      size="sm"
    >
      <AttachmentMedia />
      <AttachmentContent>
        <AttachmentTitle>{attachment.name || 'Attachment'}</AttachmentTitle>
        <AttachmentDescription>
          {attachment.contentType.split('/')[0] || 'file'}
        </AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  );
  return href ? (
    <a href={href} rel="noreferrer" target="_blank">
      {chip}
    </a>
  ) : (
    chip
  );
}

function MessageAttachmentChip({
  attachment,
  mediaOnly,
  mine
}: {
  attachment: ChatMessageAttachment;
  mediaOnly: boolean;
  mine: boolean;
}) {
  const contentType = attachment.contentType.toLowerCase();
  const href = attachment.url ?? undefined;
  const isImage = contentType.startsWith('image/') && Boolean(attachment.url);
  const isAudio = contentType.startsWith('audio/') && Boolean(attachment.url);
  const isVideo =
    Boolean(attachment.url) &&
    (contentType.startsWith('video/') ||
      (!contentType.startsWith('audio/') && looksLikeVideo(attachment.name)));

  const frameClass = mediaOnly
    ? mine
      ? 'overflow-hidden rounded-2xl rounded-br-md shadow-xs/5'
      : 'overflow-hidden rounded-2xl rounded-bl-md'
    : 'overflow-hidden rounded-lg';

  if (isAudio) {
    return <AudioAttachment attachment={attachment} mediaOnly={mediaOnly} mine={mine} />;
  }

  if (isVideo) {
    return (
      <VideoAttachment
        contentType={contentType}
        frameClass={frameClass}
        href={href}
        name={attachment.name}
        url={attachment.url}
      />
    );
  }

  if (isImage) {
    return <ImageAttachment attachment={attachment} frameClass={frameClass} href={href} />;
  }

  return <FileAttachment attachment={attachment} href={href} mediaOnly={mediaOnly} mine={mine} />;
}

function VideoAttachment({
  contentType,
  frameClass,
  href,
  name,
  url
}: {
  contentType: string;
  frameClass: string;
  href: string | undefined;
  name: string;
  url: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !url) {
    return (
      <a
        className={`inline-flex min-h-24 min-w-[12rem] w-[min(100%,20rem)] items-center justify-center bg-black/90 px-3 text-sm text-white ${frameClass}`}
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        Open {name || 'video'}
      </a>
    );
  }

  return (
    <div className={`block w-[min(100%,20rem)] min-w-[12rem] ${frameClass}`}>
      <video
        aria-label={name}
        className="block aspect-video h-auto w-full bg-black object-contain"
        controls
        onError={() => setFailed(true)}
        playsInline
        preload="metadata"
      >
        <source src={url} type={contentType.startsWith('video/') ? contentType : undefined} />
        <track kind="captions" />
      </video>
    </div>
  );
}

function looksLikeVideo(name: string): boolean {
  return /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(name);
}

function DeliveryStatus({ children }: { children: string }) {
  return (
    <span className="mt-1 block px-1 text-right text-[10px] text-muted-foreground" role="status">
      {children}
    </span>
  );
}

function formatMessageTime(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
