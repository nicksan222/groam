import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { DestinationStopMarker } from '@/features/trips/trip-destinations/destination-stop-marker';

export function RouteStopCard({
  destination,
  onOpenItinerary,
  stop
}: {
  destination: TripDetail['destinations'][number];
  onOpenItinerary: () => void;
  stop: number;
}) {
  const dayLabel =
    destination.startDay !== null && destination.endDay !== null
      ? destination.startDay === destination.endDay
        ? `Day ${destination.startDay}`
        : `Days ${destination.startDay}–${destination.endDay}`
      : 'Days not assigned';
  return (
    <li className="min-w-0">
      <button
        className="flex w-full items-center gap-4 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onOpenItinerary}
        type="button"
      >
        <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg">
          <DestinationStopMarker
            coverStatus={destination.coverStatus}
            coverUrl={destination.coverUrl}
            name={destination.name}
            stop={stop}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-primary">{dayLabel}</span>
          <span className="mt-1 block break-words text-sm font-semibold">{destination.name}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {destination.activities.length}{' '}
            {destination.activities.length === 1 ? 'activity' : 'activities'}
          </span>
        </span>
      </button>
    </li>
  );
}
