import { cn } from '@groam/ui/lib/utils';
import { ArrowRight } from 'lucide-react';
import { destinationTransferChangeKey } from '@/features/trips/hooks/itinerary-proposal-changes';
import { useItineraryChange } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import { TripTransferEditor } from '@/features/trips/trip-destinations/trip-transfer-editor';
import { testIds } from '@/lib/test-ids';
import type { Destination, TripActivityActions } from './destination-types';

export function DestinationTravelLeg({
  actions,
  canManage,
  currency,
  destination,
  nextDestination,
  startDate,
  tripDayCount
}: {
  actions: TripActivityActions;
  canManage: boolean;
  currency: string;
  destination: Destination;
  nextDestination: Destination | undefined;
  startDate: null | string;
  tripDayCount: number | null;
}) {
  const transfer = destination.transferToNext;
  const change = useItineraryChange(transfer ? destinationTransferChangeKey(transfer) : null);
  if (!nextDestination) return null;

  return (
    <div
      className="mx-auto w-full px-2 py-6 sm:px-5"
      data-from={destination.name}
      data-testid={testIds.destinationTravelLeg}
      data-to={nextDestination.name}
    >
      <div className="w-full" data-slot="destination-travel-leg">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            How we go
          </span>
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="flex min-w-0 items-center gap-1.5 font-medium">
            <span className="truncate">{destination.name}</span>
            <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{nextDestination.name}</span>
          </span>
          <span aria-hidden className="h-px flex-1 bg-border" />
        </div>

        {!transfer && (
          <p
            className={cn(
              'text-center text-muted-foreground',
              canManage ? 'mt-1 text-xs' : 'mt-2 text-sm'
            )}
          >
            Travel not planned yet — flight, train, drive, ferry, or TBD.
          </p>
        )}

        {transfer || canManage ? (
          <ItineraryProposalHighlight change={change}>
            <TripTransferEditor
              canManage={canManage}
              currency={currency}
              fromLabel={destination.name}
              key={`${destination.id}:${transfer?.id ?? 'new'}`}
              kind="destination"
              maximumDay={nextDestination.startDay ?? tripDayCount ?? destination.endDay ?? 1}
              minimumDay={destination.endDay ?? 1}
              onRemove={async () =>
                transfer ? actions.removeDestinationTransfer(transfer.id) : false
              }
              onSave={(input) =>
                actions.setDestinationTransfer(destination.id, nextDestination.id, input)
              }
              toLabel={nextDestination.name}
              transfer={transfer}
              tripStartDate={startDate}
            />
          </ItineraryProposalHighlight>
        ) : null}
      </div>
    </div>
  );
}
