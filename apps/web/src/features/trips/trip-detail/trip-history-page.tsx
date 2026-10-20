import { History } from '@groam/icons';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripActivityHistory } from '@/features/trips/trip-activity/trip-activity-history';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { testIds } from '@/lib/test-ids';

/** The Activity tab: the complete activity table under the shared section header. */
export function TripHistoryPage({ trip }: { trip: TripDetail }) {
  return (
    <TripSectionPanel
      description="Every change the group made to this trip."
      icon={History}
      testId={testIds.tripHistoryPage}
      title="Activity"
    >
      <TripActivityHistory activity={trip.activity} />
    </TripSectionPanel>
  );
}
