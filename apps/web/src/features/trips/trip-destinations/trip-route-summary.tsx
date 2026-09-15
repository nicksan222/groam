import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { ArrowUpRight, Map as MapIcon, Route } from 'lucide-react';
import { useState } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripDestinationsMap } from '@/features/trips/trip-destinations/trip-destinations-map';

function jumpToStop(id: string, day?: number | null) {
  const stop = document.getElementById(day ? `trip-day-${day}` : `itinerary-stop-${id}`);
  if (!stop) return;
  stop.focus({ preventScroll: true });
  stop.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    block: 'start'
  });
}

export function TripRouteSummary({
  destinations,
  dayPlanner = false
}: {
  destinations: TripDetail['destinations'];
  dayPlanner?: boolean;
}) {
  const [mapExpanded, setMapExpanded] = useState(false);

  return (
    <div className="min-w-0">
      <Shell.Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Route className="size-4 text-primary" /> Route overview
          </div>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {destinations.length} stops
          </span>
        </div>
        <nav aria-label="Jump to a destination" className="px-3 pb-3">
          <ol className="space-y-1">
            {destinations.map((destination, index) => (
              <li className="relative min-w-0" key={destination.id}>
                <button
                  aria-label={`Jump to ${destination.name}`}
                  className="group flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() =>
                    jumpToStop(destination.id, dayPlanner ? destination.startDay : null)
                  }
                  type="button"
                >
                  <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background text-[11px] font-semibold tabular-nums transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium">
                      {destination.name}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {destination.startDay !== null && destination.endDay !== null
                        ? destination.startDay === destination.endDay
                          ? `Day ${destination.startDay}`
                          : `Days ${destination.startDay}–${destination.endDay}`
                        : 'Days to be decided'}
                    </span>
                  </span>
                  {destination.coverUrl ? (
                    <img
                      alt=""
                      className="hidden size-12 shrink-0 rounded-xl object-cover sm:block"
                      loading="lazy"
                      src={destination.coverUrl}
                    />
                  ) : (
                    <ArrowUpRight
                      aria-hidden
                      className="size-4 text-muted-foreground/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transform-none"
                    />
                  )}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="border-t border-border px-5 py-4">
          <Button
            aria-controls="itinerary-route-map"
            aria-expanded={mapExpanded}
            className="w-full rounded-full"
            onClick={() => setMapExpanded((expanded) => !expanded)}
            size="sm"
            variant="outline"
          >
            <MapIcon className="size-3.5" />
            {mapExpanded ? 'Hide route map' : 'Show route map'}
          </Button>
          <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">
            Select a stop to jump into the details.
          </p>
        </div>
        <div id="itinerary-route-map">
          {mapExpanded && (
            <>
              <TripDestinationsMap compact destinations={destinations} />
              <p className="px-5 py-3 text-[11px] leading-5 text-muted-foreground">
                Map lines show stop order, not travel directions.
              </p>
            </>
          )}
        </div>
      </Shell.Card>
    </div>
  );
}
