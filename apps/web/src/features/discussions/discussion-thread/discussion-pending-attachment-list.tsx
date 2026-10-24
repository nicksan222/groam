import { FileText, X } from '@groam/icons';
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
import type { PendingAttachment } from './discussion-pending-attachments';

/** Files picked for the next message, shown above the composer input with a remove control. */
export function DiscussionPendingAttachmentList({
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
