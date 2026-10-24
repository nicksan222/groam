import { cn } from '@groam/ui/lib/utils';
import { useState } from 'react';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle
} from './attachment';

export type ChatMessageAttachment = {
  contentType: string;
  name: string;
  url: string | null;
};

/** Images, videos, and file chips shown with a chat message. */
export function ChatMessageAttachments({
  attachments,
  mediaOnly,
  outgoing
}: {
  attachments: ChatMessageAttachment[];
  mediaOnly: boolean;
  outgoing: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-2', outgoing ? 'items-end' : 'items-start')}>
      {attachments.map((attachment) => (
        <MessageAttachment
          attachment={attachment}
          key={`${attachment.name}-${attachment.url}`}
          mediaOnly={mediaOnly}
          outgoing={outgoing}
        />
      ))}
    </div>
  );
}

function MessageAttachment({
  attachment,
  mediaOnly,
  outgoing
}: {
  attachment: ChatMessageAttachment;
  mediaOnly: boolean;
  outgoing: boolean;
}) {
  const contentType = attachment.contentType.toLowerCase();
  const href = attachment.url ?? undefined;
  const isImage = contentType.startsWith('image/') && Boolean(attachment.url);
  const isVideo =
    Boolean(attachment.url) &&
    (contentType.startsWith('video/') ||
      (!contentType.startsWith('audio/') && looksLikeVideo(attachment.name)));
  const frameClass = mediaOnly
    ? cn('overflow-hidden rounded-2xl', outgoing ? 'rounded-se-md' : 'rounded-ss-md')
    : 'overflow-hidden rounded-lg';

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
  return <FileAttachment attachment={attachment} href={href} />;
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
    <div className={cn('block w-[min(100%,16rem)] min-w-[8rem]', frameClass)}>
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
  href
}: {
  attachment: ChatMessageAttachment;
  href?: string;
}) {
  const chip = (
    <Attachment size="sm">
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
        className={cn(
          'inline-flex min-h-24 w-[min(100%,20rem)] min-w-[12rem] items-center justify-center bg-foreground px-3 text-sm text-background',
          frameClass
        )}
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        Open {name || 'video'}
      </a>
    );
  }

  return (
    <div className={cn('block w-[min(100%,20rem)] min-w-[12rem]', frameClass)}>
      <video
        aria-label={name}
        className="block aspect-video h-auto w-full bg-foreground object-contain"
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
