import { PanelsTopLeft, Paperclip } from '@groam/icons';

export function AssistantContextBar({
  attachments,
  pageTitle
}: {
  attachments: ReadonlyArray<{ id: string; label: string }>;
  pageTitle: string | null;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto px-4 pt-2 pb-1 text-[11px] text-muted-foreground scrollbar-none">
      <span
        className="inline-flex min-w-0 shrink items-center gap-1.5"
        title={pageTitle ?? 'No page context'}
      >
        <PanelsTopLeft className="size-3 shrink-0" />
        <span className="truncate">{pageTitle ?? 'No page context'}</span>
      </span>
      {attachments.length > 0 ? <span aria-hidden="true">·</span> : null}
      {attachments.map((attachment) => (
        <span
          className="inline-flex max-w-40 shrink-0 items-center gap-1"
          key={attachment.id}
          title={attachment.label}
        >
          <Paperclip className="size-3 shrink-0" />
          <span className="truncate">{attachment.label}</span>
        </span>
      ))}
    </div>
  );
}
