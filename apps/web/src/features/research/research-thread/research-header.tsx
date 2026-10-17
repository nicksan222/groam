import { Button } from '@groam/ui/components/button';
import { Textarea } from '@groam/ui/components/textarea';
import { Pencil, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { researchBriefMax } from '@/features/research/research-create/create-research-dialog';
import { LinkTargetPicker } from '@/features/research/research-links/link-target-picker';
import { testIds } from '@/lib/test-ids';
import type { LinkTargetOption, ResearchDetail, ResearchLink } from '@/types/research';

export function ResearchHeader({
  isSummarizing = false,
  linkOptions,
  onAddLink,
  onOpenLink,
  onRemoveLink,
  onSaveBrief,
  onSummarize,
  research
}: {
  isSummarizing?: boolean;
  linkOptions: LinkTargetOption[];
  onAddLink: (option: LinkTargetOption) => void;
  onOpenLink?: (link: ResearchLink) => void;
  onRemoveLink: (link: ResearchLink) => void;
  onSaveBrief: (brief: string) => void;
  onSummarize: () => void;
  research: ResearchDetail;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(research.brief ?? '');

  const save = () => {
    onSaveBrief(draft.trim());
    setEditing(false);
  };

  return (
    <header
      className="grid shrink-0 gap-2 border-b border-border/70 p-3"
      data-testid={testIds.researchHeader}
    >
      <div className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 truncate text-lg font-semibold">{research.title}</h1>
        <Button
          data-testid={testIds.researchSummarize}
          disabled={isSummarizing}
          onClick={onSummarize}
          size="sm"
          type="button"
          variant="outline"
        >
          <Sparkles aria-hidden /> Summarize
        </Button>
      </div>

      {editing ? (
        <div className="grid gap-2">
          <Textarea
            aria-label="Brief"
            data-testid={testIds.researchBriefInput}
            maxLength={researchBriefMax}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            value={draft}
          />
          <div className="flex gap-2">
            <Button data-testid={testIds.researchBriefSave} onClick={save} size="sm" type="button">
              Save brief
            </Button>
            <Button onClick={() => setEditing(false)} size="sm" type="button" variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            {research.brief ?? (research.canManage ? 'Add a brief' : 'No brief')}
          </p>
          {research.canManage ? (
            <Button
              aria-label="Edit brief"
              data-testid={testIds.researchBriefEdit}
              onClick={() => {
                setDraft(research.brief ?? '');
                setEditing(true);
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Pencil aria-hidden />
            </Button>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {research.links.map((link) => (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted py-0.5 pr-1 pl-2.5 text-xs"
            data-testid={testIds.researchLinkChip}
            key={link.id}
          >
            {onOpenLink ? (
              <Button
                variant="ghost"
                className="h-auto p-0 text-xs font-normal"
                data-testid={testIds.researchLinkOpen}
                onClick={() => onOpenLink(link)}
                type="button"
              >
                {link.label}
              </Button>
            ) : (
              link.label
            )}
            <Button
              variant="ghost"
              aria-label={`Remove link ${link.label}`}
              className="size-auto rounded-full p-0.5"
              data-testid={testIds.researchLinkRemove}
              onClick={() => onRemoveLink(link)}
              type="button"
            >
              <X aria-hidden className="size-3" />
            </Button>
          </span>
        ))}
        <LinkTargetPicker onSelect={onAddLink} options={linkOptions} />
      </div>
    </header>
  );
}
