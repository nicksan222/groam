import { RemovableChip } from '@groam/ui/components/removable-chip';
import { AttachmentIcon } from '#ai/ui/attachments/attachment-icon';
import type { AssistantAttachments } from './assistant-attachment-types';

export function AssistantAttachmentChips({ attachments }: { attachments: AssistantAttachments }) {
  if (attachments.tags.length === 0) return null;
  return (
    // fallow-ignore-next-line css-broken-reference -- overflow-x-auto is a Tailwind utility; fallow only sees kloq-groam.css's .overflow-y-auto
    <div className="flex gap-2 overflow-x-auto px-1 pt-1 pb-2 scrollbar-none">
      {attachments.tags.map((tag) => (
        <RemovableChip
          disabled={attachments.disabled}
          icon={<AttachmentIcon kind={tag.kind} />}
          key={`${tag.kind}:${tag.id}`}
          label={<span className="max-w-36 truncate">{tag.label}</span>}
          onRemove={() => attachments.onChange(tag, false)}
          removeLabel={`Remove ${tag.label} attachment`}
          title={`${tag.kind}: ${tag.label}`}
        />
      ))}
    </div>
  );
}
