import { Button } from '@groam/ui/components/button';
import { ArrowRight, Eye, Pencil } from 'lucide-react';
import {
  continueDraftLabel,
  ideaCreateCta,
  sharedTripBannerDescription,
  sharedTripBannerTitle
} from '@/features/ideas/idea-glossary';
import { testIds } from '@/lib/test-ids';

export function SharedTripBanner({
  archived = false,
  continueDraftTitle,
  onContinueDraft,
  onStartIdea
}: {
  archived?: boolean;
  continueDraftTitle?: string;
  onContinueDraft?: () => void;
  onStartIdea?: () => void;
}) {
  return (
    <section
      aria-label={archived ? 'Archived trip' : sharedTripBannerTitle}
      className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:mx-6"
      data-testid={testIds.sharedTripBanner}
    >
      <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Eye className="size-4 shrink-0 text-muted-foreground" />
          {archived ? 'Archived trip — read-only' : sharedTripBannerTitle}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {archived ? 'Restore this trip to start planning again.' : sharedTripBannerDescription}
        </p>
      </div>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
        {continueDraftTitle && onContinueDraft ? (
          <Button
            aria-label={continueDraftLabel(continueDraftTitle)}
            title={continueDraftTitle}
            data-testid={testIds.sharedTripContinueDraft}
            onClick={onContinueDraft}
            size="sm"
            variant="outline"
          >
            <Pencil /> Continue draft
          </Button>
        ) : null}
        {onStartIdea ? (
          <Button data-testid={testIds.sharedTripNewIdea} onClick={onStartIdea} size="sm">
            {ideaCreateCta} <ArrowRight />
          </Button>
        ) : null}
      </div>
    </section>
  );
}
