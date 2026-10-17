import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { jumpToDay } from '@/features/trips/trip-destinations/trip-jump-targets';
import { TripReadingOverview } from '@/features/trips/trip-overview/trip-reading-overview';
import { testIds } from '@/lib/test-ids';

/**
 * The Overview tab of a shared trip: at a glance and the itinerary with map.
 * `day` (from `?day=N`) scrolls that day of the itinerary into view.
 */
export function TripPlanPage({
  day,
  itinerary,
  trip
}: {
  day?: number;
  itinerary: ReactNode;
  trip: TripDetail;
}) {
  useEffect(() => {
    if (!day) return;
    const frame = requestAnimationFrame(() => jumpToDay(day));
    return () => cancelAnimationFrame(frame);
  }, [day]);

  return (
    <div className="flex w-full flex-col" data-testid={testIds.tripPlanPage}>
      <TripReadingOverview itinerary={itinerary} trip={trip} />
    </div>
  );
}
