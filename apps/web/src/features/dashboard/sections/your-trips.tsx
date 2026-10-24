import { ArrowRight } from '@groam/icons';
import Shell from '@groam/ui/components/shell/client';
import { HOME_TRIP_LIMIT } from '@/features/dashboard/hooks/dashboard-model';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { TripCardGrid } from '@/features/trips/trip-card/trip-card-grid';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { TripsTurn } from '@/types/dashboard';
import { DashboardSectionHeading } from './dashboard-section-heading';

/**
 * The viewer's active trips, favorites first, as cards. `turn` is `undefined` while it loads and
 * `null` when it could not be read; either way the cards stand without counts.
 */
export function YourTrips({
  trips,
  turn
}: {
  trips: readonly TripListItem[];
  turn: TripsTurn | null | undefined;
}) {
  return (
    <Shell.Section aria-labelledby="dashboard-trips-heading" stack="sm">
      <DashboardSectionHeading id="dashboard-trips-heading" title="Your trips" />
      <TripCardGrid trips={trips.slice(0, HOME_TRIP_LIMIT)} turn={turn} />
      <Link
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        data-testid={testIds.homeTripsAll}
        to="/trips"
      >
        All trips
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </Shell.Section>
  );
}
