import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { jumpToDay } from '@/features/trips/trip-destinations/trip-jump-targets';
import { TripReadingOverview } from '@/features/trips/trip-overview/trip-reading-overview';
import { testIds } from '@/lib/test-ids';

/**
 * The plan read day by day: at a glance and the itinerary with its route. It is Plan and an idea
 * working copy's Overview. `day` (from `?day=N`) scrolls that day into view.
 */
export function TripPlanPage({
  day,
  itinerary,
  lead,
  trip
}: {
  day?: number;
  itinerary: ReactNode;
  /** Sits above the days, for example Plan's "your turn" strip. */
  lead?: ReactNode;
  trip: TripDetail;
}) {
  useEffect(() => {
    if (!day) return;
    const frame = requestAnimationFrame(() => jumpToDay(day));
    return () => cancelAnimationFrame(frame);
  }, [day]);

  return (
    <div className="flex w-full flex-col" data-testid={testIds.tripPlanPage}>
      <TripReadingOverview itinerary={itinerary} lead={lead} trip={trip} />
    </div>
  );
}
