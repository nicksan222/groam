import type { TripListItem } from '@/features/trips/hooks/use-trips';
import type { DashboardPresentation } from '@/types/dashboard';

export type { DashboardPresentation };

/** How many trip cards Home shows before "All trips". */
export const HOME_TRIP_LIMIT = 6;

/** How many "Your turn" rows Home lists before the "N more" links. */
export const HOME_TURN_LIMIT = 5;

export function greetingForHour(hour: number) {
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * What Home shows once the trip lists have loaded. `activeTrips` are the unarchived trips and
 * `anyTrips` every trip, which only matters when there is no active one: no trips at all asks for a
 * first trip, and only archived trips point to them.
 */
export function dashboardPresentation({
  activeTrips,
  anyTrips,
  isLoading
}: {
  activeTrips: readonly TripListItem[];
  anyTrips: readonly TripListItem[];
  isLoading: boolean;
}): DashboardPresentation {
  if (isLoading) return { kind: 'loading' };
  if (activeTrips.length > 0) return { kind: 'ready', trips: [...activeTrips] };
  return anyTrips.length > 0 ? { kind: 'archived' } : { kind: 'empty' };
}
