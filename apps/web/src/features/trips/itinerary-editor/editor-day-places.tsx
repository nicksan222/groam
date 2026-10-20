import { MapPin, Pencil } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import {
  destinationChangeKey,
  type ItineraryChange
} from '@/features/trips/hooks/itinerary-proposal-changes';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import type { Destination } from '@/types/trips';

/** The places of a day as manageable chips, sitting where the read-only card shows its route line. */
export function EditorDayPlaces({
  changes,
  day,
  destinations,
  onManageDestination
}: {
  changes: ItineraryChange[];
  day: number;
  destinations: Destination[];
  onManageDestination: (id: Destination['id']) => void;
}) {
  if (!destinations.length) return <span>Add a destination to start planning this day.</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-1">
      {destinations.map((stop) => (
        <ItineraryProposalHighlight
          change={changes.find((change) => change.key === destinationChangeKey(stop)) ?? null}
          key={stop.id}
        >
          <Button
            aria-label={`Manage ${stop.name} for Day ${day}`}
            className="h-5 max-w-full gap-1 px-1 text-xs text-muted-foreground"
            onClick={() => onManageDestination(stop.id)}
            size="xs"
            variant="ghost"
          >
            <MapPin className="size-3 text-primary" />
            <span className="truncate">{stop.name}</span>
            <Pencil className="size-3" />
          </Button>
        </ItineraryProposalHighlight>
      ))}
    </span>
  );
}
