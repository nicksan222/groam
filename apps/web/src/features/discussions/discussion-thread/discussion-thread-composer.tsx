import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle
} from '@groam/ui/components/attachment';
import { Button } from '@groam/ui/components/button';
import { MessageComposer } from '@groam/ui/components/message-composer';
import { Spinner } from '@groam/ui/components/spinner';
import { toast } from '@groam/ui/components/toast';
import { FileText, Square, X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  type ComposerCommand,
  resolveCommandSubmit
} from '@/features/discussions/composer-commands/composer-command';
import type { DiscussionSendInput } from '@/features/discussions/hooks/use-discussion-thread';
import { mediaFileAccept } from '@/features/media/media-validation';
import { testIds } from '@/lib/test-ids';
import {
  appendPendingAttachments,
  type PendingAttachment,
  revokePendingAttachmentUrls
} from './discussion-pending-attachments';

const NO_COMMANDS: ComposerCommand[] = [];

export function DiscussionThreadComposer({
  canStop,
  commands = NO_COMMANDS,
  isStopping,
  onSend,
  onStop
}: {
  canStop: boolean;
  /** "/" actions offered in this thread; typed commands run instead of sending. */
  commands?: ComposerCommand[];
  isStopping: boolean;
  onSend: (input: DiscussionSendInput) => Promise<boolean>;
  onStop: () => Promise<boolean>;
}) {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);

  const attachFiles = (files: File[]) => {
    const { errors, next } = appendPendingAttachments(pendingAttachmentsRef.current, files);
    for (const error of errors) toast.error(error);
    pendingAttachmentsRef.current = next;
    setPendingAttachments(next);
  };

  const removeAttachment = (id: string) => {
    const current = pendingAttachmentsRef.current;
    const target = current.find((item) => item.id === id);
    if (target) revokePendingAttachmentUrls([target]);
    const next = current.filter((item) => item.id !== id);
    pendingAttachmentsRef.current = next;
    setPendingAttachments(next);
  };

  const send = async (text: string) => {
    const command = commands.length > 0 ? resolveCommandSubmit(text, commands) : null;
    if (command) {
      if ('error' in command) {
        toast.error(command.error);
        return false;
      }
      await command.run();
      return true;
    }
    const sent = await onSend({
      files: pendingAttachments.map((item) => item.file),
      text
    });
    if (sent) {
      revokePendingAttachmentUrls(pendingAttachments);
      pendingAttachmentsRef.current = [];
      setPendingAttachments([]);
    }
    return sent;
  };

  return (
    <div className="safe-bottom w-full shrink-0 bg-background px-3 pt-3 pb-3 sm:px-4 sm:pb-4">
      {canStop && (
        <div className="mb-2 flex justify-end px-1">
          <Button disabled={isStopping} onClick={() => void onStop()} size="sm" variant="outline">
            {isStopping ? <Spinner /> : <Square className="size-3.5" />}
            Stop Groam
          </Button>
        </div>
      )}
      <MessageComposer
        allowEmptySubmit={pendingAttachments.length > 0}
        attachments={
          pendingAttachments.length > 0 ? (
            <PendingAttachmentList attachments={pendingAttachments} onRemove={removeAttachment} />
          ) : null
        }
        autoFocus
        clearOnSubmit="immediate"
        compact
        layout="stacked"
        submitLabel="Send message"
        fileAccept={mediaFileAccept}
        label="Message"
        onAttachFiles={attachFiles}
        onSubmit={send}
        placeholder="Message…"
        submitShortcut="enter"
        testId={testIds.chatComposer}
      />
    </div>
  );
}

function PendingAttachmentList({
  attachments,
  onRemove
}: {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
}) {
  return (
    <AttachmentGroup className="px-1 pb-1">
      {attachments.map((attachment) => {
        const isImage = attachment.file.type.startsWith('image/');
        const isVideo = attachment.file.type.startsWith('video/');
        return (
          <Attachment key={attachment.id} size="sm" state="done">
            <AttachmentMedia variant={isImage && attachment.previewUrl ? 'image' : 'icon'}>
              {isImage && attachment.previewUrl ? (
                <img alt="" src={attachment.previewUrl} />
              ) : (
                <FileText />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{attachment.file.name}</AttachmentTitle>
              <AttachmentDescription>
                {isVideo && attachment.previewUrl ? (
                  <video
                    aria-label={attachment.file.name}
                    className="mt-1 max-h-28 max-w-[11rem] rounded-md"
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    src={attachment.previewUrl}
                  >
                    <track kind="captions" />
                  </video>
                ) : (
                  `${(attachment.file.size / 1024).toFixed(0)} KB`
                )}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                aria-label={`Remove ${attachment.file.name}`}
                onClick={() => onRemove(attachment.id)}
                type="button"
              >
                <X />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        );
      })}
    </AttachmentGroup>
  );
}
