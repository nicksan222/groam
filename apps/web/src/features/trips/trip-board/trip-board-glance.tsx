import { Luggage, Wallet } from '@groam/icons';
import { cardChip, cardChipInteractive, cardStretchedLink } from '@groam/ui/lib/board-card';
import { cn } from '@groam/ui/lib/utils';
import { useTripPacking } from '@/features/trips/hooks/use-trip-packing';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { formatTripCost } from '@/features/trips/trip-forms/trip-currencies';
import { coveredCount } from '@/features/trips/trip-packing/packing-coverage';
import { Link } from '@/features/workspace/navigation/router';
import { TripBoardCard } from './trip-board-card';

/** "1 stop · Kyoto", or the first few stops joined with arrows. */
function routeSummary(stops: readonly string[]) {
  if (stops.length === 0) return 'No stops yet';
  const names = stops.slice(0, 3).join(' → ');
  const more = stops.length > 3 ? ` +${stops.length - 3}` : '';
  return `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'} · ${names}${more}`;
}

/**
 * What the page header does not already say: route, budget and group gear. The header owns dates,
 * length and travelers. The whole card links to the plan page.
 */
export function TripBoardGlance({ trip }: { trip: TripDetail }) {
  const packing = useTripPacking(trip.id);
  const covered = coveredCount(packing.items);
  return (
    <TripBoardCard
      chips={
        <>
          {trip.initialBudget === null ? null : (
            <span className={cardChip}>
              <Wallet aria-hidden />
              {formatTripCost(trip.initialBudget, trip.currency)} budget
            </span>
          )}
          {packing.isLoading ? null : (
            <Link
              className={cn(cardChip, cardChipInteractive, 'relative z-10')}
              params={{ section: 'packing', tripId: trip.id }}
              to="/trips/$tripId/$section"
            >
              <Luggage aria-hidden />
              {packing.items.length === 0
                ? 'No group gear yet'
                : `${covered}/${packing.items.length} gear covered`}
            </Link>
          )}
        </>
      }
      title={
        <Link
          className={cardStretchedLink}
          params={{ section: 'overview', tripId: trip.id }}
          to="/trips/$tripId/$section"
        >
          {routeSummary(trip.destinations.map((destination) => destination.name))}
        </Link>
      }
    />
  );
}
