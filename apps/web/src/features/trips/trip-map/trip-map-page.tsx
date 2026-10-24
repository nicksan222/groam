import Shell from '@groam/ui/components/shell/client';
import { useState } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripEmptyItinerary } from '@/features/trips/trip-destinations/trip-empty-itinerary';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { testIds } from '@/lib/test-ids';
import { MapDaySelector } from './map-day-selector';
import { MapLegend } from './map-legend';
import { TripMapCanvas } from './trip-map-canvas';
import { mapDayCount, mapStops, stopsOnDay } from './trip-map-stops';

/**
 * The Map tab: the route on a street map, every stop a pill in its day's hue, joined by its
 * travel legs. The day chips narrow the map to where the trip is on that day.
 */
export function TripMapPage({ trip }: { trip: TripDetail }) {
  const [day, setDay] = useState<number | null>(null);
  const stops = mapStops(trip.destinations);
  const dayCount = mapDayCount(trip.totalDurationDays, trip.destinations);
  const visible = stopsOnDay(stops, day);

  return (
    <TripSectionPanel fill testId={testIds.tripMapPage} title="Map">
      {stops.length === 0 ? (
        <TripEmptyItinerary />
      ) : (
        <Shell.Card className="relative min-h-0 flex-1 overflow-hidden bg-muted" variant="well">
          <TripMapCanvas stops={visible} />
          {dayCount > 0 ? (
            <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-start pr-12">
              <div className="pointer-events-auto max-w-full">
                <MapDaySelector dayCount={dayCount} onSelect={setDay} selected={day} />
              </div>
            </div>
          ) : null}
          {day !== null && visible.length === 0 ? (
            <p className="pointer-events-none absolute inset-x-3 top-16 w-fit rounded-lg border border-border/60 bg-background/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
              Nothing is planned for Day {day} yet.
            </p>
          ) : null}
          <div className="pointer-events-none absolute bottom-3 left-3">
            <MapLegend
              dayCount={dayCount}
              hasUnscheduled={day === null && stops.some(({ colorDay }) => colorDay === null)}
            />
          </div>
        </Shell.Card>
      )}
    </TripSectionPanel>
  );
}
