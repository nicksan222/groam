import { Button } from '@groam/ui/components/button';
import { Link2, X } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { ResearchLink, ResearchLinkTarget } from '@/types/research';

const kindLabels: Record<ResearchLinkTarget['kind'], string> = {
  activity: 'activity',
  destination: 'destination',
  idea: 'idea',
  issue: 'issue',
  stay: 'stay'
};

/** A linked trip item, shown in the thread at the moment it was linked. */
export function ResearchLinkEvent({
  link,
  onOpen,
  onRemove
}: {
  link: ResearchLink;
  onOpen?: (link: ResearchLink) => void;
  onRemove?: (link: ResearchLink) => void;
}) {
  return (
    <div className="flex justify-center px-2" data-testid={testIds.researchLinkEvent}>
      <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 py-1 pr-1 pl-3 text-xs text-muted-foreground">
        <Link2 aria-hidden className="size-3.5 shrink-0" />
        <span className="shrink-0">
          {link.createdByName} linked {kindLabels[link.target.kind]}
        </span>
        {onOpen ? (
          <Button
            className="h-auto min-w-0 truncate p-0 text-xs font-medium text-foreground hover:underline"
            data-testid={testIds.researchLinkOpen}
            onClick={() => onOpen(link)}
            type="button"
            variant="ghost"
          >
            {link.label}
          </Button>
        ) : (
          <span className="min-w-0 truncate font-medium text-foreground">{link.label}</span>
        )}
        {onRemove ? (
          <Button
            aria-label={`Remove link ${link.label}`}
            className="size-auto rounded-full p-1"
            data-testid={testIds.researchLinkRemove}
            onClick={() => onRemove(link)}
            type="button"
            variant="ghost"
          >
            <X aria-hidden className="size-3" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
