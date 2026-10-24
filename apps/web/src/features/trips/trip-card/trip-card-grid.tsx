import type { TripListItem } from '@/features/trips/hooks/use-trips';
import type { TripsTurn } from '@/types/dashboard';
import { TripCard } from './trip-card';

/**
 * Trip cards in the one grid Home and the All trips page share. Each card shows the counts of what
 * waits on the viewer in its trip; `turn` is `undefined` while it loads and `null` when unavailable.
 */
export function TripCardGrid({
  trips,
  turn
}: {
  trips: readonly TripListItem[];
  turn: TripsTurn | null | undefined;
}) {
  const counts = new Map(turn?.trips.map((entry) => [entry.tripId, entry]));
  return (
    <ul className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {trips.map((trip) => (
        <TripCard counts={counts.get(trip.id)} key={trip.id} trip={trip} turn={turn} />
      ))}
    </ul>
  );
}
