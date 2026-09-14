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
import { VoiceRecordButton } from '@groam/ui/components/voice-record-button';
import { FileText, Square, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { AgentMentionChip } from '@/features/discussions/agent-mention-controls/agent-mention-chip';
import { AgentMentionSuggest } from '@/features/discussions/agent-mention-controls/agent-mention-suggest';
import { AskGroamButton } from '@/features/discussions/agent-mention-controls/ask-groam-button';
import type { DiscussionSendInput } from '@/features/discussions/hooks/use-discussion-thread';
import { mediaFileAccept } from '@/features/media/media-validation';
import { testIds } from '@/lib/test-ids';
import {
  appendPendingAttachments,
  type PendingAttachment,
  revokePendingAttachmentUrls
} from './discussion-pending-attachments';

export function DiscussionThreadComposer({
  canStop,
  isStopping,
  onSend,
  onStop
}: {
  canStop: boolean;
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
    <div className="safe-bottom shrink-0 border-t border-border/70 bg-background px-2 pt-2 pb-2 sm:px-3 sm:pt-3 sm:pb-3">
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
        beforeInput={(api) => (
          <>
            <AgentMentionSuggest api={api} />
            <AgentMentionChip api={api} />
          </>
        )}
        clearOnSubmit="immediate"
        compact
        fileAccept={mediaFileAccept}
        label="Message"
        onAttachFiles={attachFiles}
        onSubmit={send}
        placeholder="Message…"
        submitShortcut="enter"
        testId={testIds.chatComposer}
        toolbarStart={(api) => (
          <>
            <AskGroamButton api={api} />
            <VoiceRecordButton
              disabled={api.isSubmitting}
              onRecorded={(file) => attachFiles([file])}
            />
          </>
        )}
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
        const isAudio = attachment.file.type.startsWith('audio/');
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
                ) : isAudio && attachment.previewUrl ? (
                  <audio
                    aria-label={attachment.file.name}
                    className="mt-1 h-8 max-w-[11rem]"
                    controls
                    preload="metadata"
                    src={attachment.previewUrl}
                  >
                    <track kind="captions" />
                  </audio>
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
