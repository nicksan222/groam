import type { TripListItem } from '@/features/trips/hooks/use-trips';
import type { TripsTurn } from '@/types/dashboard';
import { YourTrips } from './your-trips';
import { YourTurn } from './your-turn';

/**
 * What waits on the viewer, then their trips. Both read one query of the viewer's turn; if it
 * failed (`null`), the trips stay without counts and the list leaves rather than claiming nothing
 * waits.
 */
export function DashboardReady({
  trips,
  turn
}: {
  trips: readonly TripListItem[];
  turn: TripsTurn | null | undefined;
}) {
  return (
    <>
      <YourTurn turn={turn} />
      <YourTrips trips={trips} turn={turn} />
    </>
  );
}
