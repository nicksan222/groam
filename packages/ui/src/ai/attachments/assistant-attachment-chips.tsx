import { X } from 'lucide-react';
import { AttachmentIcon } from '#tsx/ai/attachments/attachment-icon';
import type { AssistantAttachments } from './assistant-attachment-types';

export function AssistantAttachmentChips({ attachments }: { attachments: AssistantAttachments }) {
  if (attachments.tags.length === 0) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto px-1 pt-1 pb-1.5 scrollbar-none">
      {attachments.tags.map((tag) => (
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-muted/60 px-2 py-1 text-[11px]"
          key={`${tag.kind}:${tag.id}`}
          title={`${tag.kind}: ${tag.label}`}
        >
          <AttachmentIcon kind={tag.kind} />
          <span className="max-w-36 truncate">{tag.label}</span>
          <button
            aria-label={`Remove ${tag.label} attachment`}
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            disabled={attachments.disabled}
            onClick={() => attachments.onChange(tag, false)}
            type="button"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
