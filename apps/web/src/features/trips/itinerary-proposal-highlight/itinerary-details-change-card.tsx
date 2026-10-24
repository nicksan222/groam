import { ArrowRight, Paperclip, SlidersHorizontal } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Heading } from '@groam/ui/components/heading';
import { IconTile } from '@groam/ui/components/icon-tile';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import Shell from '@groam/ui/components/shell/client';
import {
  itineraryDetailsChangeDescription,
  itineraryDetailsChangeTitle,
  itineraryDetailsResolveLabel
} from '@/features/ideas/idea-page-copy';
import {
  type ItineraryChange,
  itineraryChangeFieldRows
} from '@/features/trips/hooks/itinerary-proposal-changes';
import { testIds } from '@/lib/test-ids';

export function ItineraryDetailsChangeCard({
  change,
  canResolve = false,
  onResolve,
  pending = false
}: {
  change: ItineraryChange;
  canResolve?: boolean;
  onResolve?: () => void;
  pending?: boolean;
}) {
  const rows = itineraryChangeFieldRows(change).filter(
    (row) => row.key === 'media' || row.before !== row.after
  );

  return (
    <Shell.Card
      aria-labelledby="itinerary-details-change-title"
      as="section"
      className="relative mb-4 w-full overflow-hidden px-4 py-4 sm:px-6"
      data-proposal-change={change.change}
      reveal
      variant="well"
    >
      <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-warning" />
      <div className="flex items-start gap-3 ps-1">
        <IconTile aria-hidden size="md" variant="outline-warning">
          <SlidersHorizontal className="size-4" />
        </IconTile>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center rounded-full border border-warning/25 px-2 py-1 text-[11px] font-medium tracking-wide text-warning-foreground">
                Conflict
              </span>
              <Heading
                level={3}
                size="sm"
                className="min-w-0 flex-1 basis-40 font-medium tracking-tight text-foreground"
                id="itinerary-details-change-title"
              >
                {itineraryDetailsChangeTitle}
              </Heading>
              {canResolve && onResolve ? (
                <Button
                  className="ms-auto shrink-0"
                  data-testid={testIds.itineraryDetailsResolve}
                  onClick={onResolve}
                  pending={pending}
                  size="sm"
                  variant="outline"
                >
                  {itineraryDetailsResolveLabel}
                </Button>
              ) : null}
            </div>
            <MutedCopy size="xs">{itineraryDetailsChangeDescription}</MutedCopy>
          </div>
          {rows.length > 0 ? (
            <ul aria-label="What changed" className="flex flex-wrap gap-2 pt-1">
              {rows.map((row) => (
                <li key={row.key}>
                  <span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                    {row.key === 'media' ? (
                      <>
                        <Paperclip aria-hidden className="size-3 shrink-0 text-muted-foreground" />
                        <span className="text-foreground">{row.after}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-muted-foreground">{row.label}</span>
                        <span className="text-muted-foreground/40" aria-hidden>
                          ·
                        </span>
                        <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                          {row.before}
                        </span>
                        <ArrowRight
                          aria-hidden
                          className="size-3 shrink-0 text-muted-foreground/40"
                        />
                        <span className="font-medium text-foreground">{row.after}</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Shell.Card>
  );
}
