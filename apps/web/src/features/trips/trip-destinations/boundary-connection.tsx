import { PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { boundaryTransferChangeKey } from '@/features/trips/hooks/itinerary-proposal-changes';
import { useItineraryChange } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import type { TripBoundary, TripDetail } from '@/features/trips/hooks/use-trips';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import { RemovedItineraryItem } from '@/features/trips/itinerary-proposal-highlight/removed-itinerary-item';
import { TripTransferEditor } from '@/features/trips/trip-destinations/trip-transfer-editor';
import type { Destination, TripActivityActions } from './destination-types';

export function BoundaryConnection({
  actions,
  boundary,
  canManage,
  currency,
  destination,
  maximumDay,
  minimumDay,
  startDate,
  transfer
}: {
  actions: TripActivityActions;
  boundary: TripBoundary;
  canManage: boolean;
  currency: string;
  destination: Destination;
  maximumDay: number;
  minimumDay: number;
  startDate: null | string;
  transfer: TripDetail['arrivalTransfer'];
}) {
  const change = useItineraryChange(boundaryTransferChangeKey(boundary));
  if (!canManage && !transfer && change?.change !== 'removed') return null;
  const isArrival = boundary === 'arrival';
  const fromLabel = isArrival ? 'Trip origin' : destination.name;
  const toLabel = isArrival ? destination.name : 'Return destination';
  return (
    <div className="my-4 rounded-2xl border border-dashed border-border p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border text-primary">
          {isArrival ? <PlaneTakeoff className="size-4" /> : <PlaneLanding className="size-4" />}
        </span>
        <div>
          <h3 className="text-sm font-semibold">{isArrival ? 'Getting there' : 'Getting back'}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isArrival
              ? `Your journey to ${destination.name}`
              : `The journey home from ${destination.name}`}
          </p>
        </div>
      </div>
      {change?.change === 'removed' && !transfer ? (
        <RemovedItineraryItem change={change} />
      ) : (
        <ItineraryProposalHighlight change={change}>
          <TripTransferEditor
            canManage={canManage}
            currency={currency}
            fromLabel={fromLabel}
            kind="destination"
            maximumDay={maximumDay}
            minimumDay={minimumDay}
            onRemove={async () => (transfer ? actions.removeBoundaryTransfer(transfer.id) : false)}
            onSave={(input) => actions.setBoundaryTransfer(boundary, input)}
            toLabel={toLabel}
            transfer={transfer}
            tripStartDate={startDate}
          />
        </ItineraryProposalHighlight>
      )}
    </div>
  );
}
