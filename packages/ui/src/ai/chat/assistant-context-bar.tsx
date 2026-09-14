import { Badge } from '@groam/ui/components/badge';
import { PanelsTopLeft, Paperclip } from 'lucide-react';

export function AssistantContextBar({
  attachments,
  pageTitle
}: {
  attachments: ReadonlyArray<{ id: string; label: string }>;
  pageTitle: string | null;
}) {
  return (
    <div className="flex min-h-10 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border px-4 py-2">
      <Badge
        className="max-w-64 shrink-0"
        title={pageTitle ?? 'No page context'}
        variant="secondary"
      >
        <PanelsTopLeft />
        <span className="truncate">{pageTitle ?? 'No page context'}</span>
      </Badge>
      {attachments.map((attachment) => (
        <Badge
          className="max-w-48 shrink-0"
          key={attachment.id}
          title={attachment.label}
          variant="outline"
        >
          <Paperclip />
          <span className="truncate">{attachment.label}</span>
        </Badge>
      ))}
    </div>
  );
}
