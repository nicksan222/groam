import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { MapPin, Pencil } from 'lucide-react';
import {
  destinationChangeKey,
  type ItineraryChange
} from '@/features/trips/hooks/itinerary-proposal-changes';
import { plannerDate } from '@/features/trips/hooks/trip-day-planner';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import type { Destination } from '@/types/trips';
import { EditorDestinationPhoto } from './editor-destination-photo';

export function EditorDayHeader({
  day,
  startDate,
  destinations,
  changes,
  onManageDestination
}: {
  day: number;
  startDate: string | null;
  destinations: Destination[];
  changes: ItineraryChange[];
  onManageDestination: (id: Destination['id']) => void;
}) {
  const date = plannerDate(startDate, day);
  const primary = destinations[0];
  return (
    <header className="flex flex-col border-b border-border sm:flex-row">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="secondary">Day {day}</Badge>
          {date ? <span className="text-xs text-muted-foreground">{date}</span> : null}
        </div>
        <h3 className="text-xl font-semibold tracking-tight">
          {primary?.name ?? 'A day to explore'}
        </h3>
        {destinations.length ? (
          <div className="flex flex-wrap gap-2">
            {destinations.map((stop) => (
              <ItineraryProposalHighlight
                key={stop.id}
                change={changes.find((change) => change.key === destinationChangeKey(stop)) ?? null}
              >
                <Button
                  aria-label={`Manage ${stop.name} for Day ${day}`}
                  onClick={() => onManageDestination(stop.id)}
                  size="xs"
                  variant="ghost"
                  className="max-w-full px-1 text-muted-foreground"
                >
                  <MapPin className="size-3 text-primary" />
                  <span className="truncate">{stop.name}</span>
                  <Pencil className="size-3" />
                </Button>
              </ItineraryProposalHighlight>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add a destination to start planning this day.
          </p>
        )}
      </div>
      {primary ? (
        <EditorDestinationPhoto
          src={primary.coverUrl}
          name={primary.name}
          className="h-36 w-full sm:h-36 sm:w-48 sm:shrink-0 sm:self-stretch lg:w-56"
        />
      ) : null}
    </header>
  );
}
