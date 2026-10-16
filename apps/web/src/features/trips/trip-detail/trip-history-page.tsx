import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripActivityHistory } from '@/features/trips/trip-activity/trip-activity-history';
import { testIds } from '@/lib/test-ids';

/** The Activity tab: the complete activity table. */
export function TripHistoryPage({ trip }: { trip: TripDetail }) {
  return (
    <div data-testid={testIds.tripHistoryPage}>
      <TripActivityHistory activity={trip.activity} />
    </div>
  );
}
