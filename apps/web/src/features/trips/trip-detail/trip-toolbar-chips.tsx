import { Button } from '@groam/ui/components/button';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import type { TripToolbarFacts } from '@/types/trips';

const chipClass =
  'shrink-0 snap-start whitespace-nowrap inline-flex h-6 items-center rounded-full bg-background/80 px-2.5 text-xs font-medium text-foreground backdrop-blur-sm';

/** Fact chips; on a phone they scroll in one row, padded at the end so the last chip clears the screen edge. */
export function TripToolbarChips({
  destinationStatus,
  facts,
  onOpenRoster,
  travelerCount
}: {
  destinationStatus: TripDetail['destination']['status'];
  facts: TripToolbarFacts;
  onOpenRoster?: () => void;
  travelerCount?: number;
}) {
  return (
    <div className="-mx-6 flex min-w-0 snap-x scroll-px-6 items-center gap-2 overflow-x-auto px-6 max-sm:max-w-none sm:mx-0 sm:max-w-full [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
      <span
        className={chipClass}
        data-destination-status={destinationStatus}
        data-testid={testIds.tripDestination}
      >
        {facts.destination}
      </span>
      <span className={chipClass}>{facts.window}</span>
      {facts.length ? <span className={chipClass}>{facts.length}</span> : null}
      {onOpenRoster && travelerCount !== undefined ? (
        <Button
          className={`${chipClass} transition-colors hover:bg-background/95`}
          onClick={onOpenRoster}
          type="button"
          unstyled
        >
          {travelerCount} traveler{travelerCount === 1 ? '' : 's'}
        </Button>
      ) : null}
    </div>
  );
}
